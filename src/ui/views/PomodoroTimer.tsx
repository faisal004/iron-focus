import { useState, useCallback, useEffect } from 'react';
import { usePomodoroState, usePomodoroEvents } from '../hooks/usePomodoroState';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { Button } from '../components/button';
import { soundManager } from '../utils/SoundManager';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../components/dialog";
import { ScrollArea } from "../components/scroll-area";

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function PomodoroTimer() {
    const state = usePomodoroState();
    const [isStarting, setIsStarting] = useState(false);
    const [showCompletedMessage, setShowCompletedMessage] = useState(false);
    const [showFailedMessage, setShowFailedMessage] = useState<string | null>(null);

    // Release Notes State
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);

    useEffect(() => {
        const removeListener = window.electron.onUpdateAvailable((info) => {
            setUpdateInfo(info);
            setShowUpdateDialog(true);
        });
        return () => removeListener();
    }, []);

    usePomodoroEvents({
        onCompleted: () => {
            soundManager.playBeep('success');
            setShowCompletedMessage(true);
            setTimeout(() => setShowCompletedMessage(false), 5000);
        },
        onFailed: (_session, reason) => {
            soundManager.playBeep('fail');
            setShowFailedMessage(reason);
            setTimeout(() => setShowFailedMessage(null), 5000);
        },
    });

    const handleStart = useCallback(async () => {
        setIsStarting(true);
        soundManager.playBeep('start');
        try {
            await window.electron.startPomodoro();
        } finally {
            setIsStarting(false);
        }
    }, []);

    const handleStop = useCallback(() => {
        window.electron.stopPomodoro();
    }, []);

    const handlePause = useCallback(() => {
        window.electron.pausePomodoro();
    }, []);

    const handleResume = useCallback(() => {
        window.electron.resumePomodoro();
    }, []);

    const isRunning = state.session?.status === 'running';
    const totalSeconds = (state.session?.durationMinutes ?? 25) * 60;
    const progressPercent = isRunning
        ? ((totalSeconds - state.remainingSeconds) / totalSeconds) * 100
        : 0;

    const renderReleaseNotes = () => {
        if (!updateInfo?.releaseNotes) return "No release notes available.";
        if (typeof updateInfo.releaseNotes === 'string') {
            return <div dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }} />;
        }
        return updateInfo.releaseNotes.map((note, i) => (
            <div key={i} className="mb-2">
                <p className="font-bold">{note.version}</p>
                <div dangerouslySetInnerHTML={{ __html: note.note || "" }} />
            </div>
        ));
    };

    return (
        <>
            <Card className="w-full h-full border-4 border-primary shadow-none flex flex-col rounded-none">
                <CardHeader className="text-center border-b-2 border-primary bg-muted/20 pb-4">
                    <CardTitle className="text-2xl uppercase font-extrabold tracking-widest leading-none">
                        // TIMER_MODULE
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-8 px-6">
                    {/* Timer Display */}
                    <div className="text-center">
                        <div className="text-7xl font-mono font-bold text-foreground tracking-tighter tabular-nums decoration-2 underline-offset-4"
                            style={{ fontFamily: '"Orbitron", monospace' }}
                        >
                            {formatTime(state.remainingSeconds)}
                        </div>
                        {state.session && (
                            <div className="mt-2 text-sm text-primary uppercase tracking-widest opacity-80 font-bold animate-pulse">
                                {state.isPaused ? '[PAUSED]' : '>>> FOCUSING...'}
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {isRunning && (
                        <div className="border-2 border-primary p-1 bg-background">
                            <div
                                className="h-4 bg-primary transition-all duration-1000 ease-linear"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    )}

                    {/* Controls */}
                    <div className="flex justify-center gap-4">
                        {!isRunning ? (
                            <Button
                                onClick={handleStart}
                                disabled={isStarting}
                                className="px-8 py-6 text-xl uppercase font-bold border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 rounded-none w-full tracking-widest"
                            >
                                {isStarting ? '_INIT...' : '[ ENGAGE ]'}
                            </Button>
                        ) : (
                            <>
                                {state.isPaused ? (
                                    <Button onClick={handleResume} className="flex-1 border-2 border-primary bg-primary text-primary-foreground rounded-none uppercase font-bold hover:opacity-90">
                                        [ RESUME ]
                                    </Button>
                                ) : (
                                    <Button onClick={handlePause} className="flex-1 border-2 border-primary bg-background text-foreground hover:bg-muted rounded-none uppercase font-bold">
                                        [ PAUSE ]
                                    </Button>
                                )}
                                <Button onClick={handleStop} variant="destructive" className="border-2 border-destructive bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-none uppercase font-bold px-6">
                                    [ ABORT ]
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Session Stats */}
                    {state.session && (
                        <div className="text-center text-xs text-muted-foreground border-t-2 border-primary/20 pt-4 font-mono">
                            <div className="flex justify-between px-4">
                                <span>VIOLATIONS::{state.session.ruleViolations}</span>
                                {state.session.blockedAppAttempts > 0 && (
                                    <span className="text-destructive font-bold">
                                        BLOCKED::{state.session.blockedAppAttempts}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Completed Message */}
                    {showCompletedMessage && (
                        <div className="p-4 border-2 border-green-500 bg-green-500/10 text-center text-green-600 font-bold uppercase tracking-wide">
                            {">"} SESSION_COMPLETE_SUCCESSFULLY
                        </div>
                    )}

                    {/* Failed Message */}
                    {showFailedMessage && (
                        <div className="p-4 border-2 border-destructive bg-destructive/10 text-center text-destructive font-bold uppercase tracking-wide">
                            {">"} FATAL_SESSION_ERROR: {showFailedMessage}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Update Available: v{updateInfo?.version}</DialogTitle>
                        <DialogDescription>
                            A new version has been downloaded and is ready to install.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-4 border rounded-md p-2 bg-muted/50">
                        <h4 className="font-semibold mb-2">Release Notes</h4>
                        <ScrollArea className="h-[200px] w-full rounded-md border p-2 bg-background">
                            <div className="prose prose-sm dark:prose-invert p-2">
                                {renderReleaseNotes()}


                            </div>
                        </ScrollArea>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                            Later
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
