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

type EventPayloadMapping = {
  statistics: Statistics
  getStaticData: StaticData
  "update-available": void
  "update-downloaded": void
  "startDownload": void
  "installUpdate": void
}

interface Window {
  electron: {
    subscribeStatistics: (
      callback: (statistics: Statistics) => void
    ) => UnsubscribeFunction;
    getStaticData: () => Promise<StaticData>;
    onUpdateAvailable: (callback: () => void) => UnsubscribeFunction;
    onUpdateDownloaded: (callback: () => void) => UnsubscribeFunction;
    startDownload: () => void;
    installUpdate: () => void;
  };
}
