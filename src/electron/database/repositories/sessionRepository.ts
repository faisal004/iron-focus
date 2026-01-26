import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

// Row types matching DB schema
type SessionRow = {
    id: string;
    start_time: number;
    end_time: number | null;
    duration_minutes: number;
    status: string;
    rule_violations: number;
    blocked_app_attempts: number;
};

function rowToSession(row: SessionRow): PomodoroSession {
    return {
        id: row.id,
        startTime: row.start_time,
        endTime: row.end_time,
        durationMinutes: row.duration_minutes,
        status: row.status as PomodoroSessionStatus,
        ruleViolations: row.rule_violations,
        blockedAppAttempts: row.blocked_app_attempts,
    };
}

export function createSessionRepository(db: Database.Database) {
    const insertSession = db.prepare(`
    INSERT INTO pomodoro_sessions 
    (id, start_time, end_time, duration_minutes, status, rule_violations, blocked_app_attempts)
    VALUES (@id, @start_time, @end_time, @duration_minutes, @status, @rule_violations, @blocked_app_attempts)
  `);

    const updateSessionStatus = db.prepare(`
    UPDATE pomodoro_sessions 
    SET status = @status, end_time = @end_time, rule_violations = @rule_violations, blocked_app_attempts = @blocked_app_attempts
    WHERE id = @id
  `);

    const findByIdStmt = db.prepare(`SELECT * FROM pomodoro_sessions WHERE id = ?`);
    const findByStatusStmt = db.prepare(`SELECT * FROM pomodoro_sessions WHERE status = ?`);
    const findRecentStmt = db.prepare(`
    SELECT * FROM pomodoro_sessions 
    ORDER BY start_time DESC 
    LIMIT ? OFFSET ?
  `);

    return {
        create(durationMinutes: number): PomodoroSession {
            const session: PomodoroSession = {
                id: uuidv4(),
                startTime: Date.now(),
                endTime: null,
                durationMinutes,
                status: "running",
                ruleViolations: 0,
                blockedAppAttempts: 0,
            };

            insertSession.run({
                id: session.id,
                start_time: session.startTime,
                end_time: session.endTime,
                duration_minutes: session.durationMinutes,
                status: session.status,
                rule_violations: session.ruleViolations,
                blocked_app_attempts: session.blockedAppAttempts,
            });

            return session;
        },

        findById(id: string): PomodoroSession | null {
            const row = findByIdStmt.get(id) as SessionRow | undefined;
            return row ? rowToSession(row) : null;
        },

        findByStatus(status: PomodoroSessionStatus): PomodoroSession[] {
            const rows = findByStatusStmt.all(status) as SessionRow[];
            return rows.map(rowToSession);
        },

        findRecent(limit: number, offset: number): PomodoroSession[] {
            const rows = findRecentStmt.all(limit, offset) as SessionRow[];
            return rows.map(rowToSession);
        },

        update(
            id: string,
            updates: Partial<Pick<PomodoroSession, "status" | "endTime" | "ruleViolations" | "blockedAppAttempts">>
        ): PomodoroSession | null {
            const existing = this.findById(id);
            if (!existing) return null;

            const updated: PomodoroSession = {
                ...existing,
                status: updates.status ?? existing.status,
                endTime: updates.endTime ?? existing.endTime,
                ruleViolations: updates.ruleViolations ?? existing.ruleViolations,
                blockedAppAttempts: updates.blockedAppAttempts ?? existing.blockedAppAttempts,
            };

            updateSessionStatus.run({
                id,
                status: updated.status,
                end_time: updated.endTime,
                rule_violations: updated.ruleViolations,
                blocked_app_attempts: updated.blockedAppAttempts,
            });

            return updated;
        },

        complete(id: string): PomodoroSession | null {
            return this.update(id, { status: "completed", endTime: Date.now() });
        },

        fail(id: string): PomodoroSession | null {
            return this.update(id, { status: "failed", endTime: Date.now() });
        },

        abort(id: string): PomodoroSession | null {
            return this.update(id, { status: "aborted", endTime: Date.now() });
        },
    };
}

export type SessionRepository = ReturnType<typeof createSessionRepository>;
