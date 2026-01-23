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
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on("checking-for-update", () => {
    console.log("checking-for-update")
  })
  autoUpdater.on("update-available", () => {
    console.log("update-available")
  })
  autoUpdater.on("update-downloaded", () => {
    console.log("update-downloaded")
  })
});
