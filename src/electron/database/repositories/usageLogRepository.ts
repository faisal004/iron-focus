import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

export type UsageLog = {
    id: string;
    appName: string;
    windowTitle: string;
    url?: string;
    startTime: number;
    endTime?: number;
    durationSeconds?: number;
    createdAt: number;
};

type UsageLogRow = {
    id: string;
    app_name: string;
    window_title: string;
    url: string | null;
    start_time: number;
    end_time: number | null;
    duration_seconds: number | null;
    created_at: number;
};

function rowToUsageLog(row: UsageLogRow): UsageLog {
    return {
        id: row.id,
        appName: row.app_name,
        windowTitle: row.window_title,
        url: row.url || undefined,
        startTime: row.start_time,
        endTime: row.end_time || undefined,
        durationSeconds: row.duration_seconds || undefined,
        createdAt: row.created_at,
    };
}

export function createUsageLogRepository(db: Database.Database) {
    const insertLog = db.prepare(`
    INSERT INTO usage_logs 
    (id, app_name, window_title, url, start_time, end_time, duration_seconds, created_at)
    VALUES (@id, @app_name, @window_title, @url, @start_time, @end_time, @duration_seconds, @created_at)
  `);

    const updateEndTimeStmt = db.prepare(`
    UPDATE usage_logs 
    SET end_time = @end_time, duration_seconds = @duration_seconds
    WHERE id = @id
  `);

    const findByDateRangeStmt = db.prepare(`
    SELECT * FROM usage_logs 
    WHERE start_time >= ? AND start_time <= ?
    ORDER BY start_time ASC
  `);

    const getStatsStmt = db.prepare(`
    SELECT app_name, SUM(duration_seconds) as total_duration
    FROM usage_logs
    WHERE start_time >= ? AND start_time <= ?
    GROUP BY app_name
    ORDER BY total_duration DESC
  `);

    return {
        create(log: Omit<UsageLog, "id" | "createdAt">): UsageLog {
            const newLog: UsageLog = {
                id: uuidv4(),
                createdAt: Date.now(),
                ...log,
            };

            insertLog.run({
                id: newLog.id,
                app_name: newLog.appName,
                window_title: newLog.windowTitle,
                url: newLog.url || null,
                start_time: newLog.startTime,
                end_time: newLog.endTime || null,
                duration_seconds: newLog.durationSeconds || null,
                created_at: newLog.createdAt,
            });

            return newLog;
        },

        updateEndTime(id: string, endTime: number): void {
            // We need to fetch start time to calculate duration, but for efficiency we can pass it or expect caller to calculate?
            // Let's just update end_time and calculate duration in code before calling or use SQL to calculate.
            // SQL calculation: duration_seconds = @end_time - start_time

            const stmt = db.prepare(`
                UPDATE usage_logs 
                SET end_time = @end_time, 
                    duration_seconds = (@end_time - start_time) / 1000
                WHERE id = @id
            `);

            stmt.run({
                id,
                end_time: endTime
            });
        },

        findByDateRange(startTime: number, endTime: number): UsageLog[] {
            const rows = findByDateRangeStmt.all(startTime, endTime) as UsageLogRow[];
            return rows.map(rowToUsageLog);
        },

        getStats(startTime: number, endTime: number): { appName: string; totalDuration: number }[] {
            const rows = getStatsStmt.all(startTime, endTime) as { app_name: string; total_duration: number }[];
            return rows.map(r => ({
                appName: r.app_name,
                totalDuration: r.total_duration
            }));
        }
    };
}

export type UsageLogRepository = ReturnType<typeof createUsageLogRepository>;
