import log from "electron-log";
import activeWindow from "active-win";
import type { UsageLogRepository } from "./database/repositories/usageLogRepository.js";
import { powerMonitor } from "electron";

const logger = log.scope("usage-tracking");

type ActiveWindowInfo = {
    processName: string;
    windowTitle: string;
    url?: string;
};

export class UsageTrackingService {
    private usageLogRepo: UsageLogRepository;
    private isTracking: boolean = false;
    private monitorInterval: NodeJS.Timeout | null = null;
    private currentLogId: string | null = null;
    private lastWindowInfo: ActiveWindowInfo | null = null;
    private lastActivityTime: number = Date.now();

    // Configuration
    private readonly POLL_INTERVAL_MS = 1000;
    private readonly IDLE_THRESHOLD_MS = 60 * 1000; // 1 minute of partial inactivity to consider purely idle? 
    // Actually, for now let's just track active window. System idle is handled by powerMonitor.

    constructor(usageLogRepo: UsageLogRepository) {
        this.usageLogRepo = usageLogRepo;
        this.setupPowerMonitor();
    }

    startTracking(): void {
        if (this.isTracking) return;

        logger.info("Starting usage tracking");
        this.isTracking = true;
        this.monitorInterval = setInterval(() => {
            this.checkActiveWindow();
        }, this.POLL_INTERVAL_MS);
    }

    stopTracking(): void {
        if (!this.isTracking) return;

        logger.info("Stopping usage tracking");
        this.isTracking = false;

        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }

        this.closeCurrentLog();
    }

    private setupPowerMonitor() {
        powerMonitor.on("suspend", () => {
            logger.info("System suspending - stopping tracking");
            this.stopTracking();
        });

        powerMonitor.on("resume", () => {
            logger.info("System resuming - starting tracking");
            this.startTracking();
        });

        powerMonitor.on("lock-screen", () => {
            logger.info("Screen locked - stopping tracking");
            this.stopTracking();
        });

        powerMonitor.on("unlock-screen", () => {
            logger.info("Screen unlocked - starting tracking");
            this.startTracking();
        });
    }

    private async checkActiveWindow() {
        if (!this.isTracking) return;

        try {
            const result = await activeWindow();
            if (!result) return;

            const currentInfo: ActiveWindowInfo = {
                processName: result.owner.name,
                windowTitle: result.title,
                url: (result as any).url,
            };

            if (this.shouldStartNewLog(currentInfo)) {
                this.closeCurrentLog();
                this.createNewLog(currentInfo);
            } else if (this.currentLogId) {
                // Same window, just update the duration/end time
                this.updateCurrentLog();
            }

            this.lastWindowInfo = currentInfo;

        } catch (error) {
            // Silence common errors active-win might throw occasionally
            // logger.debug("Failed to get active window", error);
        }
    }

    private shouldStartNewLog(current: ActiveWindowInfo): boolean {
        if (!this.lastWindowInfo) return true;

        // Check if app changed
        if (current.processName !== this.lastWindowInfo.processName) return true;

        // Check if title changed significantly (optional, maybe we want to aggregate by app?)
        // For detailed tracking, we track by title too.
        if (current.windowTitle !== this.lastWindowInfo.windowTitle) return true;

        // Check if URL changed (for browsers)
        if (current.url !== this.lastWindowInfo.url) return true;

        return false;
    }

    private createNewLog(info: ActiveWindowInfo) {
        const log = this.usageLogRepo.create({
            appName: info.processName,
            windowTitle: info.windowTitle,
            url: info.url,
            startTime: Date.now(),
        });
        this.currentLogId = log.id;
        // logger.debug(`Started logging: ${info.processName} - ${info.windowTitle}`);
    }

    private updateCurrentLog() {
        if (!this.currentLogId) return;
        this.usageLogRepo.updateEndTime(this.currentLogId, Date.now());
    }

    private closeCurrentLog() {
        if (this.currentLogId) {
            this.updateCurrentLog(); // Final update
            this.currentLogId = null;
            this.lastWindowInfo = null;
        }
    }

    public getAnalytics(startDate: Date, endDate: Date) {
        return this.usageLogRepo.getStats(startDate.getTime(), endDate.getTime());
    }

    public getTimeline(startDate: Date, endDate: Date) {
        return this.usageLogRepo.findByDateRange(startDate.getTime(), endDate.getTime());
    }
}
