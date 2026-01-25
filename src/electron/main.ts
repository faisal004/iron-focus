import { app, BrowserWindow, } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { ipcMainHandle, isDev } from "./utils.js";
import { getStaticData, pollResources } from "./resourceManager.js";
import { getPreloadPath, getUIPath } from "./pathResolver.js";

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
    return getStaticData()
  });
  // Only run auto-updater in production builds
  if (!isDev()) {
    try {
      autoUpdater.logger = console;
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;

      // Log current app version for debugging
      console.log("Current app version:", app.getVersion());
      console.log("Auto-updater initialized for production build");

      autoUpdater.on("checking-for-update", () => {
        console.log("checking-for-update");
        mainWindow.webContents.send("checking-for-update");
      });

      autoUpdater.on("update-available", (info) => {
        console.log("update-available", info);
        mainWindow.webContents.send("update-available", info);
      });

      autoUpdater.on("update-not-available", (info) => {
        console.log("update-not-available", info);
        mainWindow.webContents.send("update-not-available");
      });

      autoUpdater.on("error", (err) => {
        console.error("Auto-updater error:", err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        mainWindow.webContents.send("update-error", err.message || err.toString());
      });

      autoUpdater.on("update-downloaded", (info) => {
        console.log("update-downloaded", info);
        mainWindow.webContents.send("update-downloaded");
      });

      autoUpdater.on("download-progress", (progress) => {
        console.log(`Download speed: ${progress.bytesPerSecond} - Downloaded ${progress.percent}% (${progress.transferred}/${progress.total})`);
        mainWindow.webContents.send("download-progress", progress);
      });

      // Function to check for updates
      const checkForUpdates = () => {
        console.log("Checking for updates...");
        autoUpdater.checkForUpdates().catch((err) => {
          console.error("Failed to check for updates:", err);
          mainWindow.webContents.send("update-error", `Failed to check for updates: ${err.message}`);
        });
      };

      // Check for updates after window is fully loaded
      mainWindow.webContents.on('did-finish-load', () => {
        console.log("Window did-finish-load event fired");
        setTimeout(checkForUpdates, 2000);
      });

      // Fallback: also check using dom-ready event
      mainWindow.webContents.on('dom-ready', () => {
        console.log("Window dom-ready event fired");
      });

    } catch (err) {
      console.error("Failed to initialize auto-updater:", err);
      mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send("update-error", `Failed to initialize auto-updater: ${err}`);
      });
    }
  } else {
    console.log("Auto-updater disabled in development mode");
    // Send a message to UI indicating dev mode after window loads
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        mainWindow.webContents.send("update-not-available");
      }, 1000);
    });
  }

  ipcMainHandle("startDownload", () => {
    console.log("Starting download...");
    if (!isDev()) {
      autoUpdater.downloadUpdate().catch((err) => {
        console.error("Failed to download update:", err);
        mainWindow.webContents.send("update-error", `Failed to download: ${err.message}`);
      });
    }
    return undefined;
  });

  ipcMainHandle("installUpdate", () => {
    console.log("Installing update...");
    if (!isDev()) {
      autoUpdater.quitAndInstall();
    }
    return undefined;
  });

  ipcMainHandle("checkForUpdates", () => {
    console.log("Manual check for updates triggered");
    if (!isDev()) {
      mainWindow.webContents.send("checking-for-update");
      autoUpdater.checkForUpdates().catch((err) => {
        console.error("Failed to check for updates:", err);
        mainWindow.webContents.send("update-error", `Failed to check for updates: ${err.message}`);
      });
    } else {
      mainWindow.webContents.send("update-not-available");
    }
    return undefined;
  });
});
