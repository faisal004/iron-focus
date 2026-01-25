import { app, BrowserWindow } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import log from "electron-log";
import { ipcMainHandle, isDev } from "./utils.js";
import { getStaticData, pollResources } from "./resourceManager.js";
import { getPreloadPath, getUIPath } from "./pathResolver.js";

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

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123");
  } else {
    mainWindow.loadFile(getUIPath());
  }
  pollResources(mainWindow);

  ipcMainHandle("getStaticData", () => {
    return getStaticData();
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

