import { useMemo } from 'react';
import { useCommitData } from '../hooks/useCommitData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/card';

type HeatmapDay = {
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
};

function getHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
}

const LEVEL_COLORS = [
    'bg-muted',
    'bg-primary/20',
    'bg-primary/40',
    'bg-primary/70',
    'bg-primary',
] as const;

export function CommitHeatmap() {
    const { commits, streak, loading } = useCommitData();

    const heatmapData = useMemo(() => {
        // Generate last 365 days
        const days: HeatmapDay[] = [];
        const commitMap = new Map(commits.map((c) => [c.date, c.count]));

        for (let i = 364; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const count = commitMap.get(dateStr) ?? 0;
            days.push({
                date: dateStr,
                count,
                level: getHeatmapLevel(count),
            });
        }

        return days;
    }, [commits]);

    // Group by weeks (7 days per column)
    const weeks = useMemo(() => {
        const result: HeatmapDay[][] = [];
        for (let i = 0; i < heatmapData.length; i += 7) {
            result.push(heatmapData.slice(i, i + 7));
        }
        return result;
    }, [heatmapData]);

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Loading...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2 border-primary shadow-none">
            <CardHeader className="border-b-2 border-primary pb-4 bg-muted/20">
                <CardTitle className="flex items-center gap-2 uppercase tracking-wide">
                    {">"} ACTIVITY_LOG
                </CardTitle>
                <CardDescription className="flex items-center font-mono text-xs opacity-70">
                    <span className="font-bold text-foreground mr-1">
                        CURRENT_STREAK::{streak.currentStreak}
                    </span>
                    {streak.longestStreak > 0 && (
                        <span className="text-muted-foreground">
                            [MAX::{streak.longestStreak}]
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="overflow-x-auto pb-2">
                    <div className="flex gap-[2px]">
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-[2px]">
                                {week.map((day) => (
                                    <div
                                        key={day.date}
                                        className={`w-3 h-3 ${LEVEL_COLORS[day.level]} hover:border hover:border-foreground/50 transition-colors`}
                                        title={`${day.date}: ${day.count} SESSIONS`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-1 mt-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    <span>IDLE</span>
                    {LEVEL_COLORS.map((color, i) => (
                        <div key={i} className={`w-3 h-3 ${color}`} />
                    ))}
                    <span>MAX_LOAD</span>
                </div>
            </CardContent>
        </Card>
    );
}
