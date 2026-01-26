import log from "electron-log";
import type { BlockRuleRepository } from "./database/repositories/blockRuleRepository.js";
import type { SettingsRepository } from "./database/repositories/settingsRepository.js";
import { v4 as uuidv4 } from "uuid";

const logger = log.scope("blocking");

export type BlockingServiceCallbacks = {
    onWarning: (rule: BlockRule, gracePeriodRemaining: number) => void;
    onViolation: (event: ViolationEvent) => void;
};

type GraceTimer = {
    ruleId: string;
    timeoutId: NodeJS.Timeout;
    startedAt: number;
};

export class BlockingService {
    private blockRuleRepo: BlockRuleRepository;
    private settingsRepo: SettingsRepository;
    private callbacks: BlockingServiceCallbacks;
    private isMonitoring: boolean = false;
    private monitorInterval: NodeJS.Timeout | null = null;
    private graceTimers: Map<string, GraceTimer> = new Map();
    private currentSessionId: string | null = null;

    constructor(
        blockRuleRepo: BlockRuleRepository,
        settingsRepo: SettingsRepository,
        callbacks: BlockingServiceCallbacks
    ) {
        this.blockRuleRepo = blockRuleRepo;
        this.settingsRepo = settingsRepo;
        this.callbacks = callbacks;
    }

    startMonitoring(sessionId: string): void {
        if (this.isMonitoring) {
            logger.warn("Already monitoring");
            return;
        }

        logger.info("Starting distraction monitoring");
        this.isMonitoring = true;
        this.currentSessionId = sessionId;

        // Poll every 2 seconds to balance CPU usage and responsiveness
        this.monitorInterval = setInterval(() => {
            this.checkActiveWindow();
        }, 2000);
    }

    stopMonitoring(): void {
        logger.info("Stopping distraction monitoring");
        this.isMonitoring = false;
        this.currentSessionId = null;

        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }

        // Clear all grace timers
        for (const timer of this.graceTimers.values()) {
            clearTimeout(timer.timeoutId);
        }
        this.graceTimers.clear();
    }

    private async checkActiveWindow(): Promise<void> {
        if (!this.isMonitoring || !this.currentSessionId) return;

        try {
            const activeWindow = await this.getActiveWindow();
            if (!activeWindow) return;

            const rules = this.blockRuleRepo.findEnabled();
            const matchedRule = this.findMatchingRule(activeWindow, rules);

            if (matchedRule) {
                this.handleBlockedActivity(matchedRule, activeWindow);
            } else {
                // User left blocked activity, clear grace timers
                this.clearGraceTimers();
            }
        } catch (err) {
            logger.error("Error checking active window:", err);
        }
    }

    private async getActiveWindow(): Promise<ActiveWindowInfo | null> {
        // Platform-specific active window detection
        // For now, return a stub - will be implemented with native module
        try {
            // On Windows, we can use active-win package or native bindings
            // This is a placeholder that returns null - blocking won't work until implemented

            // To enable blocking, install and use active-win:
            // const activeWin = require('active-win');
            // const win = await activeWin();
            // return { processName: win.owner.name, windowTitle: win.title, url: undefined };

            return null;
        } catch {
            return null;
        }
    }

    private findMatchingRule(
        window: ActiveWindowInfo,
        rules: BlockRule[]
    ): BlockRule | null {
        for (const rule of rules) {
            if (this.ruleMatches(rule, window)) {
                return rule;
            }
        }
        return null;
    }

    private ruleMatches(rule: BlockRule, window: ActiveWindowInfo): boolean {
        const pattern = rule.pattern.toLowerCase();

        switch (rule.type) {
            case "application":
                return window.processName.toLowerCase().includes(pattern);

            case "domain":
                if (window.url) {
                    try {
                        const url = new URL(window.url);
                        return url.hostname.toLowerCase().includes(pattern);
                    } catch {
                        return window.windowTitle.toLowerCase().includes(pattern);
                    }
                }
                // Fallback: check window title for domain name
                return window.windowTitle.toLowerCase().includes(pattern);

            case "url":
                if (window.url) {
                    return window.url.toLowerCase().includes(pattern);
                }
                return window.windowTitle.toLowerCase().includes(pattern);

            default:
                return false;
        }
    }

    private handleBlockedActivity(
        rule: BlockRule,
        window: ActiveWindowInfo
    ): void {
        if (!this.currentSessionId) return;

        // Check if we already have a grace timer for this rule
        const existingTimer = this.graceTimers.get(rule.id);

        if (!existingTimer) {
            // Start grace period
            const settings = this.settingsRepo.get();
            logger.warn(`Blocked activity detected: ${rule.pattern}, starting grace period`);

            this.callbacks.onWarning(rule, settings.gracePeriodSeconds);

            const timeoutId = setTimeout(() => {
                this.handleGracePeriodExpired(rule, window);
            }, settings.gracePeriodSeconds * 1000);

            this.graceTimers.set(rule.id, {
                ruleId: rule.id,
                timeoutId,
                startedAt: Date.now(),
            });
        } else {
            // Grace period still running, emit remaining time
            const settings = this.settingsRepo.get();
            const elapsed = (Date.now() - existingTimer.startedAt) / 1000;
            const remaining = Math.max(0, settings.gracePeriodSeconds - elapsed);
            this.callbacks.onWarning(rule, remaining);
        }
    }

    private handleGracePeriodExpired(
        rule: BlockRule,
        window: ActiveWindowInfo
    ): void {
        if (!this.currentSessionId) return;

        logger.error(`Grace period expired for rule: ${rule.pattern}`);

        const violation: ViolationEvent = {
            id: uuidv4(),
            sessionId: this.currentSessionId,
            targetType: rule.type,
            targetName: window.processName || window.windowTitle,
            matchedRule: rule.id,
            timestamp: Date.now(),
            gracePeriodExpired: true,
        };

        this.graceTimers.delete(rule.id);
        this.callbacks.onViolation(violation);
    }

    private clearGraceTimers(): void {
        for (const timer of this.graceTimers.values()) {
            clearTimeout(timer.timeoutId);
        }
        this.graceTimers.clear();
    }

    // CRUD operations exposed for IPC
    getRules(): BlockRule[] {
        return this.blockRuleRepo.findAll();
    }

    addRule(rule: Omit<BlockRule, "id" | "createdAt">): BlockRule {
        return this.blockRuleRepo.create(rule);
    }

    updateRule(rule: BlockRule): BlockRule {
        return this.blockRuleRepo.update(rule);
    }

    removeRule(id: string): void {
        this.blockRuleRepo.delete(id);
    }
}
