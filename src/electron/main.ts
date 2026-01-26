import { app, BrowserWindow, Tray, Menu, nativeImage, powerMonitor, Notification } from "electron";
import path from "path";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import log from "electron-log";
import { ipcMainHandle, ipcMainHandleWithArgs, isDev, ipcWebContentsSend } from "./utils.js";
import { getStaticData, pollResources } from "./resourceManager.js";
import { getPreloadPath, getUIPath, getAssetPath } from "./pathResolver.js";
import { initDatabase, closeDatabase, getDatabase } from "./database/index.js";
import { createSessionRepository } from "./database/repositories/sessionRepository.js";
import { createBlockRuleRepository } from "./database/repositories/blockRuleRepository.js";
import { createCommitRepository } from "./database/repositories/commitRepository.js";
import { createSettingsRepository } from "./database/repositories/settingsRepository.js";
import { PomodoroEngine } from "./pomodoroEngine.js";
import { BlockingService } from "./blockingService.js";

let tray: Tray | null = null;
let isQuitting = false;

function createTray(mainWindow: BrowserWindow) {
  const icon = nativeImage.createFromPath(path.join(getAssetPath(), "tray-icon.png"));
  tray = new Tray(icon);
  tray.setToolTip("IronFocus");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show", click: () => mainWindow.show() },
    {
      label: "Quit", click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => mainWindow.show());
}

// Configure logging - logs will be saved to:
// Windows: %APPDATA%\electron\logs\main.log
// macOS: ~/Library/Logs/electron/main.log
// Linux: ~/.config/electron/logs/main.log
log.transports.file.level = "debug";
log.transports.console.level = "debug";

// Replace console.log with log functions
const logger = log.scope("main");

// Helper to safely send to renderer
function sendToRenderer(win: BrowserWindow, channel: string, ...args: unknown[]) {
  try {
    if (win && !win.isDestroyed() && win.webContents) {
      win.webContents.send(channel, ...args);
    }
  } catch (e) {
    logger.error("Failed to send to renderer:", e);
  }
}

app.on("ready", () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: getPreloadPath()
    }
  });

  createTray(mainWindow);

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123");
  } else {
    mainWindow.loadFile(getUIPath());
  }
  // pollResources(mainWindow); // Disabled as we are focusing on Pomodoro features only

  // Initialize database and repositories
  const db = initDatabase();
  const sessionRepo = createSessionRepository(db);
  const blockRuleRepo = createBlockRuleRepository(db);
  const commitRepo = createCommitRepository(db);
  const settingsRepo = createSettingsRepository(db);

  // Initialize Pomodoro engine
  const pomodoroEngine = new PomodoroEngine(
    sessionRepo,
    commitRepo,
    settingsRepo,
    {
      onStateChange: (state) => {
        ipcWebContentsSend("pomodoro:state", mainWindow.webContents, state);
      },
      onCompleted: (session) => {
        blockingService.stopMonitoring();
        ipcWebContentsSend("pomodoro:completed", mainWindow.webContents, session);
      },
      onFailed: (session, reason) => {
        blockingService.stopMonitoring();
        ipcWebContentsSend("pomodoro:failed", mainWindow.webContents, { session, reason });
      },
    }
  );

  // Initialize blocking service
  const blockingService = new BlockingService(
    blockRuleRepo,
    settingsRepo,
    {
      onWarning: (rule, gracePeriodRemaining) => {
        pomodoroEngine.incrementViolation();

        // Show notification for warning
        if (Notification.isSupported()) {
          new Notification({
            title: "⚠️ Distraction Detected",
            body: `You are accessing a blocked site. You have ${gracePeriodRemaining}s to close it!`,
            silent: false,
            icon: path.join(getAssetPath(), "tray-icon.png") // Fallback icon
          }).show();
        }

        ipcWebContentsSend("blocking:warning", mainWindow.webContents, { rule, gracePeriodRemaining });
      },
      onViolation: (event) => {
        pomodoroEngine.incrementBlockedAppAttempt();
        pomodoroEngine.failSession(`Blocked activity: ${event.targetName}`);

        // Show notification for violation
        if (Notification.isSupported()) {
          new Notification({
            title: "🚫 Session Failed",
            body: `IronFocus: Session failed due to ${event.targetName}.`,
            silent: false,
            // icon: path.join(getAssetPath(), "tray-icon.png") 
          }).show();
        }

        ipcWebContentsSend("blocking:violation", mainWindow.webContents, event);
      },
    }
  );

  // Recover any crashed sessions from previous run
  pomodoroEngine.recoverCrashedSessions();

  // Handle system resume (wake from sleep)
  powerMonitor.on("resume", () => {
    logger.info("System resumed from sleep");
    pomodoroEngine.handleSystemWake();
  });

  ipcMainHandle("getStaticData", () => {
    return getStaticData();
  });

  // === POMODORO IPC HANDLERS ===
  ipcMainHandleWithArgs<{ durationMinutes?: number }, PomodoroSession>("pomodoro:start", (args) => {
    const session = pomodoroEngine.start(args?.durationMinutes);
    blockingService.startMonitoring(session.id);
    return session;
  });

  ipcMainHandle("pomodoro:stop", () => {
    blockingService.stopMonitoring();
    return pomodoroEngine.stop();
  });

  ipcMainHandle("pomodoro:pause", () => {
    pomodoroEngine.pause();
    return undefined;
  });

  ipcMainHandle("pomodoro:resume", () => {
    pomodoroEngine.resume();
    return undefined;
  });

  // === BLOCKING IPC HANDLERS ===
  ipcMainHandle("blocking:getRules", () => {
    return blockingService.getRules();
  });

  ipcMainHandleWithArgs<Omit<BlockRule, "id" | "createdAt">, BlockRule>("blocking:addRule", (rule) => {
    return blockingService.addRule(rule);
  });

  ipcMainHandleWithArgs<{ id: string }, void>("blocking:removeRule", (args) => {
    blockingService.removeRule(args.id);
    return undefined;
  });

  ipcMainHandleWithArgs<BlockRule, BlockRule>("blocking:updateRule", (rule) => {
    return blockingService.updateRule(rule);
  });

  // === DATA IPC HANDLERS ===
  ipcMainHandleWithArgs<{ startDate: string; endDate: string }, DailyCommit[]>("data:getDailyCommits", (args) => {
    return commitRepo.getByDateRange(args.startDate, args.endDate);
  });

  ipcMainHandle("data:getStreakStats", () => {
    return commitRepo.calculateStreak();
  });

  ipcMainHandleWithArgs<{ limit: number; offset: number }, PomodoroSession[]>("data:getSessionHistory", (args) => {
    return sessionRepo.findRecent(args.limit, args.offset);
  });

  // === SETTINGS IPC HANDLERS ===
  ipcMainHandle("settings:get", () => {
    return settingsRepo.get();
  });

  ipcMainHandleWithArgs<Partial<UserSettings>, UserSettings>("settings:update", (updates) => {
    return settingsRepo.update(updates);
  });

  // Only run auto-updater in production builds
  if (!isDev()) {
    logger.info("=== AUTO-UPDATER INIT START ===");
    logger.info("Current app version:", app.getVersion());
    logger.info("App is packaged:", app.isPackaged);
    logger.info("Log file location:", log.transports.file.getFile().path);

    try {
      // Configure auto-updater
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.allowDowngrade = false;

      // CRITICAL: Force update checks even when app.isPackaged is false
      // dev-app-update.yml is included in ASAR via electron-builder files array
      autoUpdater.forceDevUpdateConfig = true;

      // Set the GitHub provider explicitly as backup
      autoUpdater.setFeedURL({
        provider: "github",
        owner: "faisal004",
        repo: "electron"
      });
      logger.info("Feed URL configured for GitHub: faisal004/electron");
      logger.info("forceDevUpdateConfig:", autoUpdater.forceDevUpdateConfig);

      // Set up event handlers BEFORE any check
      autoUpdater.on("checking-for-update", () => {
        logger.info("EVENT: checking-for-update");
        sendToRenderer(mainWindow, "checking-for-update");
      });

      autoUpdater.on("update-available", (info) => {
        logger.info("EVENT: update-available", JSON.stringify(info));
        sendToRenderer(mainWindow, "update-available", info);
      });

      autoUpdater.on("update-not-available", (info) => {
        logger.info("EVENT: update-not-available", JSON.stringify(info));
        sendToRenderer(mainWindow, "update-not-available");
      });

      autoUpdater.on("error", (err) => {
        logger.error("EVENT: error", err);
        const errorMsg = err?.message || err?.toString() || "Unknown error";
        sendToRenderer(mainWindow, "update-error", errorMsg);
      });

      autoUpdater.on("update-downloaded", (info) => {
        logger.info("EVENT: update-downloaded", JSON.stringify(info));
        sendToRenderer(mainWindow, "update-downloaded");
      });

      autoUpdater.on("download-progress", (progress) => {
        logger.info(`EVENT: download-progress ${progress.percent.toFixed(1)}%`);
        sendToRenderer(mainWindow, "download-progress", progress);
      });

      logger.info("Auto-updater event handlers registered");

      // Function to check for updates with timeout
      const checkForUpdatesWithTimeout = async () => {
        logger.info("=== CHECKING FOR UPDATES ===");
        sendToRenderer(mainWindow, "checking-for-update");

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Update check timed out after 30 seconds")), 30000);
        });

        try {
          // Race between the update check and timeout
          const result = await Promise.race([
            autoUpdater.checkForUpdates(),
            timeoutPromise
          ]);
          logger.info("checkForUpdates result:", JSON.stringify(result));
        } catch (err: unknown) {
          const error = err as Error;
          logger.error("checkForUpdates failed:", error);
          sendToRenderer(mainWindow, "update-error", error.message || "Update check failed");
        }
      };

      // Check for updates after window is fully loaded
      mainWindow.webContents.on('did-finish-load', () => {
        logger.info("Window did-finish-load - scheduling update check");
        setTimeout(() => {
          checkForUpdatesWithTimeout();
        }, 3000);
      });

      logger.info("=== AUTO-UPDATER INIT COMPLETE ===");

    } catch (err) {
      logger.error("CRITICAL: Failed to initialize auto-updater:", err);
      mainWindow.webContents.on('did-finish-load', () => {
        sendToRenderer(mainWindow, "update-error", `Failed to initialize: ${err}`);
      });
    }
  } else {
    logger.info("Auto-updater disabled in development mode");
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        sendToRenderer(mainWindow, "update-not-available");
      }, 1000);
    });
  }

  ipcMainHandle("startDownload", async () => {
    logger.info("=== STARTING DOWNLOAD ===");
    if (!isDev()) {
      try {
        await autoUpdater.downloadUpdate();
        logger.info("Download started successfully");
      } catch (err: unknown) {
        const error = err as Error;
        logger.error("Failed to download update:", error);
        sendToRenderer(mainWindow, "update-error", `Failed to download: ${error.message}`);
      }
    }
    return undefined;
  });

  ipcMainHandle("installUpdate", () => {
    logger.info("Installing update...");
    if (!isDev()) {
      autoUpdater.quitAndInstall();
    }
    return undefined;
  });

  ipcMainHandle("checkForUpdates", async () => {
    logger.info("=== MANUAL CHECK FOR UPDATES ===");
    if (!isDev()) {
      sendToRenderer(mainWindow, "checking-for-update");

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Update check timed out after 30 seconds")), 30000);
      });

      try {
        const result = await Promise.race([
          autoUpdater.checkForUpdates(),
          timeoutPromise
        ]);
        logger.info("Manual check result:", JSON.stringify(result));
      } catch (err: unknown) {
        const error = err as Error;
        logger.error("Manual check failed:", error);
        sendToRenderer(mainWindow, "update-error", error.message || "Update check failed");
      }
    } else {
      sendToRenderer(mainWindow, "update-not-available");
    }
    return undefined;
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  closeDatabase();
});
