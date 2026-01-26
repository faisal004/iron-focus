import type Database from "better-sqlite3";
import log from "electron-log";

const logger = log.scope("migrations");

const MIGRATIONS: { version: number; sql: string }[] = [
    {
        version: 1,
        sql: `
      CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id TEXT PRIMARY KEY,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_minutes INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'aborted')),
        rule_violations INTEGER NOT NULL DEFAULT 0,
        blocked_app_attempts INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS daily_commits (
        date TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS blocked_targets (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('domain', 'application', 'url')),
        pattern TEXT NOT NULL,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS violation_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_name TEXT NOT NULL,
        matched_rule TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        grace_period_expired INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES pomodoro_sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_status ON pomodoro_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_start ON pomodoro_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_commits_date ON daily_commits(date);
      CREATE INDEX IF NOT EXISTS idx_violations_session ON violation_events(session_id);
    `,
    },
];

export function runMigrations(db: Database.Database): void {
    // Create migrations table if it doesn't exist
    db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

    const getCurrentVersion = db.prepare(
        "SELECT MAX(version) as version FROM schema_migrations"
    );
    const insertMigration = db.prepare(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)"
    );

    const currentVersionRow = getCurrentVersion.get() as { version: number | null };
    const currentVersion = currentVersionRow?.version ?? 0;

    logger.info(`Current schema version: ${currentVersion}`);

    for (const migration of MIGRATIONS) {
        if (migration.version > currentVersion) {
            logger.info(`Applying migration v${migration.version}`);

            const transaction = db.transaction(() => {
                db.exec(migration.sql);
                insertMigration.run(migration.version, Date.now());
            });

            transaction();
            logger.info(`Migration v${migration.version} applied successfully`);
        }
    }
}
