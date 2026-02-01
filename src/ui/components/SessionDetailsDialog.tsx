import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Badge } from "./badge";
import { ScrollArea } from "./scroll-area";

type SessionDetailsDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    date: Date | null;
};

export function SessionDetailsDialog({ isOpen, onOpenChange, date }: SessionDetailsDialogProps) {
    const [sessions, setSessions] = useState<PomodoroSession[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && date) {
            setLoading(true);
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            window.electron.getSessionsByDateRange(startOfDay.getTime(), endOfDay.getTime())
                .then((data) => {
                    setSessions(data);
                })
                .catch((err) => {
                    console.error("Failed to fetch sessions:", err);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [isOpen, date]);

    if (!date) return null;

    const completedSessions = sessions.filter(s => s.status === "completed");
    const failedSessions = sessions.filter(s => s.status === "failed" || s.status === "aborted");

    const totalCompletedTimeMinutes = completedSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    // Calculate actual time spent in failed sessions (endTime - startTime), converted to minutes
    const totalDiscardedTimeMinutes = failedSessions.reduce((acc, s) => {
        if (s.endTime && s.startTime) {
            return acc + Math.floor((s.endTime - s.startTime) / 60000);
        }
        return acc;
    }, 0);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const getSessionDuration = (session: PomodoroSession) => {
        if (session.status === 'completed') {
            return `${session.durationMinutes}m`;
        }
        // For failed/aborted, calculate actual time
        if (session.endTime && session.startTime) {
            const actualMinutes = Math.floor((session.endTime - session.startTime) / 60000);
            return `${actualMinutes}m / ${session.durationMinutes}m`;
        }
        return `${session.durationMinutes}m`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-none">
                <DialogHeader>
                    <DialogTitle className="font-mono uppercase tracking-wider">
                        SESSION_LOG::{formatDate(date)}
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs mt-2 border-t border-primary/20 pt-2">
                        <div className="grid grid-cols-[1fr_auto] gap-y-1">
                            <span className="text-muted-foreground">SESSIONS_COMPLETED::</span>
                            <span className="text-foreground text-right">{completedSessions.length}/{sessions.length}</span>

                            <span className="text-muted-foreground">TIME_COMPLETED::</span>
                            <span className="text-green-500 font-bold text-right">{totalCompletedTimeMinutes} MIN</span>

                            <span className="text-muted-foreground">TIME_DISCARDED::</span>
                            <span className="text-destructive font-bold text-right">{totalDiscardedTimeMinutes} MIN</span>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[300px] w-full  ">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm">
                            LOADING...
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex items-center justify-center h-[200px] text-muted-foreground font-mono text-sm">
                            NO SESSIONS RECORDED
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {sessions.map((session) => (
                                <div key={session.id} className="border p-3 rounded-none bg-muted/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge
                                            variant={session.status === "completed" ? "default" : "destructive"}
                                            className="uppercase font-mono rounded-none text-[10px]"
                                        >
                                            {session.status}
                                        </Badge>
                                        <div className="flex flex-col items-end">
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : '???'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                                        <div>
                                            {session.status === 'completed' ? 'DURATION' : 'TIME_SPENT'}: {getSessionDuration(session)}
                                        </div>
                                        {session.status === 'failed' && (
                                            <div>VIOLATIONS: {session.ruleViolations}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
