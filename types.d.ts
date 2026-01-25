type Statistics = {
  cpuUsage: number;
  ramUsage: number;
  storageUsage: number;
};

type StaticData = {
  totalStorage: number;
  cpuModel: string;
  totalMemoryGB: number;
};


type UnsubscribeFunction = () => void

type View = 'CPU' | 'RAM' | 'STORAGE';

type DownloadProgress = {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
};

type EventPayloadMapping = {
  statistics: Statistics
  getStaticData: StaticData
  "update-available": void
  "update-downloaded": void
  "checking-for-update": void
  "update-not-available": void
  "download-progress": DownloadProgress
  "update-error": string
  "startDownload": void
  "installUpdate": void
  "checkForUpdates": void
}

interface Window {
  electron: {
    subscribeStatistics: (
      callback: (statistics: Statistics) => void
    ) => UnsubscribeFunction;
    getStaticData: () => Promise<StaticData>;
    onUpdateAvailable: (callback: () => void) => UnsubscribeFunction;
    onUpdateDownloaded: (callback: () => void) => UnsubscribeFunction;
    onCheckingForUpdate: (callback: () => void) => UnsubscribeFunction;
    onUpdateNotAvailable: (callback: () => void) => UnsubscribeFunction;
    onDownloadProgress: (callback: (progress: DownloadProgress) => void) => UnsubscribeFunction;
    onUpdateError: (callback: (error: string) => void) => UnsubscribeFunction;
    startDownload: () => void;
    installUpdate: () => void;
    checkForUpdates: () => void;
  };
}
