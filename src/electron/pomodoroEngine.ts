import { BrowserWindow } from "electron";
import log from "electron-log";
import type { SessionRepository } from "./database/repositories/sessionRepository.js";
import type { CommitRepository } from "./database/repositories/commitRepository.js";
import type { SettingsRepository } from "./database/repositories/settingsRepository.js";

const logger = log.scope("pomodoro");

export type PomodoroEngineCallbacks = {
    onStateChange: (state: PomodoroState) => void;
    onCompleted: (session: PomodoroSession) => void;
    onFailed: (session: PomodoroSession, reason: string) => void;
};

export class PomodoroEngine {
    private currentSession: PomodoroSession | null = null;
    private remainingSeconds: number = 0;
    private isPaused: boolean = false;
    private timerInterval: NodeJS.Timeout | null = null;
    private lastTickTime: number = 0;

    private sessionRepo: SessionRepository;
    private commitRepo: CommitRepository;
    private settingsRepo: SettingsRepository;
    private callbacks: PomodoroEngineCallbacks;

    constructor(
        sessionRepo: SessionRepository,
        commitRepo: CommitRepository,
        settingsRepo: SettingsRepository,
        callbacks: PomodoroEngineCallbacks
    ) {
        this.sessionRepo = sessionRepo;
        this.commitRepo = commitRepo;
        this.settingsRepo = settingsRepo;
        this.callbacks = callbacks;
    }

    getState(): PomodoroState {
        return {
            session: this.currentSession,
            remainingSeconds: this.remainingSeconds,
            isPaused: this.isPaused,
        };
    }

    start(durationMinutes?: number): PomodoroSession {
        if (this.currentSession?.status === "running") {
            logger.warn("Session already running, returning current session");
            return this.currentSession;
        }

        const settings = this.settingsRepo.get();
        const duration = durationMinutes ?? settings.defaultDurationMinutes;

        logger.info(`Starting pomodoro session: ${duration} minutes`);

        this.currentSession = this.sessionRepo.create(duration);
        this.remainingSeconds = duration * 60;
        this.isPaused = false;
        this.lastTickTime = Date.now();

        this.startTimer();
        this.emitState();

        return this.currentSession;
    }

    stop(): PomodoroSession | null {
        if (!this.currentSession) {
            logger.warn("No session to stop");
            return null;
        }

        logger.info(`Stopping session: ${this.currentSession.id}`);

        this.stopTimer();
        const aborted = this.sessionRepo.abort(this.currentSession.id);
        const result = aborted ?? this.currentSession;

        this.currentSession = null;
        this.remainingSeconds = 0;
        this.isPaused = false;
        this.emitState();

        return result;
    }

    pause(): void {
        if (!this.currentSession || this.isPaused) {
            return;
        }

        logger.info("Pausing session");
        this.isPaused = true;
        this.stopTimer();
        this.emitState();
    }

    resume(): void {
        if (!this.currentSession || !this.isPaused) {
            return;
        }

        logger.info("Resuming session");
        this.isPaused = false;
        this.lastTickTime = Date.now();
        this.startTimer();
        this.emitState();
    }

    incrementViolation(): void {
        if (!this.currentSession) return;

        this.currentSession = {
            ...this.currentSession,
            ruleViolations: this.currentSession.ruleViolations + 1,
        };
        this.sessionRepo.update(this.currentSession.id, {
            ruleViolations: this.currentSession.ruleViolations,
        });
    }

    incrementBlockedAppAttempt(): void {
        if (!this.currentSession) return;

        this.currentSession = {
            ...this.currentSession,
            blockedAppAttempts: this.currentSession.blockedAppAttempts + 1,
        };
        this.sessionRepo.update(this.currentSession.id, {
            blockedAppAttempts: this.currentSession.blockedAppAttempts,
        });
    }

    failSession(reason: string): void {
        if (!this.currentSession) return;

        logger.warn(`Failing session: ${reason}`);
        this.stopTimer();

        const failed = this.sessionRepo.fail(this.currentSession.id);
        if (failed) {
            this.callbacks.onFailed(failed, reason);
        }

        this.currentSession = null;
        this.remainingSeconds = 0;
        this.isPaused = false;
        this.emitState();
    }

    // Recover crashed sessions on startup
    recoverCrashedSessions(): void {
        const crashed = this.sessionRepo.findByStatus("running");
        for (const session of crashed) {
            logger.warn(`Recovering crashed session: ${session.id}`);
            this.sessionRepo.abort(session.id);
        }
    }

    // Handle system wake - check for time drift
    handleSystemWake(): void {
        if (!this.currentSession || this.isPaused) return;

        const now = Date.now();
        const elapsedMs = now - this.lastTickTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        if (elapsedSeconds > 5) {
            logger.warn(`Time drift detected: ${elapsedSeconds}s elapsed`);

            // Deduct the elapsed time
            this.remainingSeconds = Math.max(0, this.remainingSeconds - elapsedSeconds);
            this.lastTickTime = now;

            if (this.remainingSeconds <= 0) {
                this.completeSession();
            } else {
                this.emitState();
            }
        }
    }

    private startTimer(): void {
        this.stopTimer();

        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private tick(): void {
        if (!this.currentSession || this.isPaused) return;

        const now = Date.now();
        const elapsedMs = now - this.lastTickTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        if (elapsedSeconds >= 1) {
            this.remainingSeconds = Math.max(0, this.remainingSeconds - elapsedSeconds);
            this.lastTickTime = now;
            this.emitState();

            if (this.remainingSeconds <= 0) {
                this.completeSession();
            }
        }
    }

    private completeSession(): void {
        if (!this.currentSession) return;

        logger.info(`Session completed: ${this.currentSession.id}`);
        this.stopTimer();

        const completed = this.sessionRepo.complete(this.currentSession.id);

        if (completed) {
            // Record commit for today
            const today = new Date().toISOString().split("T")[0];
            this.commitRepo.incrementCommit(today);

            this.callbacks.onCompleted(completed);
        }

        this.currentSession = null;
        this.remainingSeconds = 0;
        this.isPaused = false;
        this.emitState();
    }

    private emitState(): void {
        this.callbacks.onStateChange(this.getState());
    }
}
