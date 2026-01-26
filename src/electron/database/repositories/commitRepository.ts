import type Database from "better-sqlite3";

type CommitRow = {
    date: string;
    count: number;
};

export function createCommitRepository(db: Database.Database) {
    const upsertCommit = db.prepare(`
    INSERT INTO daily_commits (date, count)
    VALUES (@date, @count)
    ON CONFLICT(date) DO UPDATE SET count = count + @count
  `);

    const findByDateRange = db.prepare(`
    SELECT * FROM daily_commits 
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC
  `);

    const findAllStmt = db.prepare(`SELECT * FROM daily_commits ORDER BY date DESC`);

    return {
        incrementCommit(date: string, count: number = 1): void {
            upsertCommit.run({ date, count });
        },

        getByDateRange(startDate: string, endDate: string): DailyCommit[] {
            const rows = findByDateRange.all(startDate, endDate) as CommitRow[];
            return rows;
        },

        getAll(): DailyCommit[] {
            const rows = findAllStmt.all() as CommitRow[];
            return rows;
        },

        calculateStreak(): StreakStats {
            const commits = this.getAll();
            if (commits.length === 0) {
                return { currentStreak: 0, longestStreak: 0, lastCommitDate: null };
            }

            const today = new Date().toISOString().split("T")[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

            // Create a set of dates with commits for O(1) lookup
            const commitDates = new Set(commits.map((c) => c.date));

            // Calculate current streak
            let currentStreak = 0;
            let checkDate = commitDates.has(today) ? today : yesterday;

            // If no commit today or yesterday, current streak is 0
            if (!commitDates.has(today) && !commitDates.has(yesterday)) {
                currentStreak = 0;
            } else {
                // Count backwards
                let date = new Date(checkDate);
                while (commitDates.has(date.toISOString().split("T")[0])) {
                    currentStreak++;
                    date = new Date(date.getTime() - 86400000);
                }
            }

            // Calculate longest streak
            let longestStreak = 0;
            let tempStreak = 0;

            // Sort dates ascending
            const sortedDates = [...commitDates].sort();

            for (let i = 0; i < sortedDates.length; i++) {
                if (i === 0) {
                    tempStreak = 1;
                } else {
                    const prevDate = new Date(sortedDates[i - 1]);
                    const currDate = new Date(sortedDates[i]);
                    const diffDays = (currDate.getTime() - prevDate.getTime()) / 86400000;

                    if (diffDays === 1) {
                        tempStreak++;
                    } else {
                        longestStreak = Math.max(longestStreak, tempStreak);
                        tempStreak = 1;
                    }
                }
            }
            longestStreak = Math.max(longestStreak, tempStreak);

            const lastCommitDate = sortedDates[sortedDates.length - 1] ?? null;

            return { currentStreak, longestStreak, lastCommitDate };
        },
    };
}

export type CommitRepository = ReturnType<typeof createCommitRepository>;
