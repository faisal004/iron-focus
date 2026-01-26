import { useEffect, useState, useCallback } from 'react';

export function useCommitData() {
    const [commits, setCommits] = useState<DailyCommit[]>([]);
    const [streak, setStreak] = useState<StreakStats>({
        currentStreak: 0,
        longestStreak: 0,
        lastCommitDate: null,
    });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch last 365 days of commits for the heatmap
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0];

            const [commitsData, streakData] = await Promise.all([
                window.electron.getDailyCommits(startDate, endDate),
                window.electron.getStreakStats(),
            ]);

            setCommits(commitsData);
            setStreak(streakData);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { commits, streak, loading, refresh: fetchData };
}
