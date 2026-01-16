import osUtils from "os-utils";
import os from "os";
import fs from "fs";
import { BrowserWindow } from "electron";
import { ipcWebContentsSend } from "./utils.js";
const POLLING_INTERVAL = 500;

export function pollResources(mainWindow: BrowserWindow) {
  setInterval(async () => {
    const cpuUsage = await getCPUUsage();
    const ramUsage = getRAMUsage();
    const storageUsage = getStorageData().usage;
    // const staticData = getStaticData();
    ipcWebContentsSend("statistics",mainWindow.webContents, { cpuUsage, ramUsage, storageUsage})
    // console.log({ cpuUsage, ramUsage, storageUsage, staticData });
  }, POLLING_INTERVAL);
}

function getCPUUsage():Promise<number> {
  return new Promise((resolve) => {
    osUtils.cpuUsage(resolve); 
  });
}

function getRAMUsage() {
  return 1 - osUtils.freememPercentage();
}
function getStorageData() {
  // requires node 18
  const stats = fs.statfsSync(process.platform === "win32" ? "C://" : "/");
  const total = stats.bsize * stats.blocks;
  const free = stats.bsize * stats.bfree;

  return {
    total: Math.floor(total / 1_000_000_000),
    usage: 1 - free / total,
  };
}
export function getStaticData() {
  const totalStorage = getStorageData().total;
  const cpuModel = os.cpus()[0].model;
  const totalMemoryGB = Math.floor(osUtils.totalmem() / 1024);

  return {
    totalStorage,
    cpuModel,
    totalMemoryGB,
  };
}
