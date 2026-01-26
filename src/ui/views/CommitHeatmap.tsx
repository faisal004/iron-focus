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
    'bg-green-200 dark:bg-green-900',
    'bg-green-400 dark:bg-green-700',
    'bg-green-500 dark:bg-green-600',
    'bg-green-700 dark:bg-green-500',
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    📊 Focus Activity
                </CardTitle>
                <CardDescription>
                    <span className="font-medium text-foreground">
                        🔥 {streak.currentStreak} day streak
                    </span>
                    {streak.longestStreak > 0 && (
                        <span className="ml-2 text-muted-foreground">
                            (Best: {streak.longestStreak} days)
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="flex gap-[3px]">
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-[3px]">
                                {week.map((day) => (
                                    <div
                                        key={day.date}
                                        className={`w-3 h-3 rounded-sm ${LEVEL_COLORS[day.level]}`}
                                        title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-1 mt-4 text-xs text-muted-foreground">
                    <span>Less</span>
                    {LEVEL_COLORS.map((color, i) => (
                        <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
                    ))}
                    <span>More</span>
                </div>
            </CardContent>
        </Card>
    );
}
