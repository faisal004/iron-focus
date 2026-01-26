import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import log from "electron-log";
import { runMigrations } from "./migrations.js";

const logger = log.scope("database");

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
    if (!db) {
        throw new Error("Database not initialized. Call initDatabase() first.");
    }
    return db;
}

export function initDatabase(): Database.Database {
    if (db) {
        return db;
    }

    const dbPath = path.join(app.getPath("userData"), "pomodoro.db");
    logger.info("Initializing database at:", dbPath);

    db = new Database(dbPath);

    // Enable WAL mode for better performance and crash resistance
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Run migrations
    runMigrations(db);

    logger.info("Database initialized successfully");
    return db;
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
        logger.info("Database closed");
    }
}
