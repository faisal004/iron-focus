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

type UnsubscribeFunction = () => void;

type View = 'CPU' | 'RAM' | 'STORAGE' | 'POMODORO';

type DownloadProgress = {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
};

// === POMODORO DOMAIN ===

type PomodoroSessionStatus =
  | "running"
  | "completed"
  | "failed"
  | "aborted";

type PomodoroSession = {
  id: string;
  startTime: number;
  endTime: number | null;
  durationMinutes: number;
  status: PomodoroSessionStatus;
  ruleViolations: number;
  blockedAppAttempts: number;
};

type PomodoroState = {
  session: PomodoroSession | null;
  remainingSeconds: number;
  isPaused: boolean;
};

// === COMMIT/STREAK DOMAIN ===

type DailyCommit = {
  date: string;
  count: number;
};

type StreakStats = {
  currentStreak: number;
  longestStreak: number;
  lastCommitDate: string | null;
};

// === BLOCKING DOMAIN ===

type BlockTargetType = "domain" | "application" | "url";

type BlockRule = {
  id: string;
  type: BlockTargetType;
  pattern: string;
  isEnabled: boolean;
  createdAt: number;
};

type ViolationEvent = {
  id: string;
  sessionId: string;
  targetType: BlockTargetType;
  targetName: string;
  matchedRule: string;
  timestamp: number;
  gracePeriodExpired: boolean;
};

type ActiveWindowInfo = {
  processName: string;
  windowTitle: string;
  url?: string;
};

// === SETTINGS DOMAIN ===

type UserSettings = {
  defaultDurationMinutes: number;
  gracePeriodSeconds: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
};

// === IPC EVENT PAYLOAD MAPPING ===

type EventPayloadMapping = {
  // Existing system monitor channels
  statistics: Statistics;
  getStaticData: StaticData;
  "update-available": void;
  "update-downloaded": void;
  "checking-for-update": void;
  "update-not-available": void;
  "download-progress": DownloadProgress;
  "update-error": string;
  "startDownload": void;
  "installUpdate": void;
  "checkForUpdates": void;

  // Pomodoro engine channels
  "pomodoro:start": PomodoroSession;
  "pomodoro:stop": PomodoroSession | null;
  "pomodoro:pause": void;
  "pomodoro:resume": void;
  "pomodoro:state": PomodoroState;
  "pomodoro:completed": PomodoroSession;
  "pomodoro:failed": { session: PomodoroSession; reason: string };

  // Blocking system channels
  "blocking:violation": ViolationEvent;
  "blocking:warning": { rule: BlockRule; gracePeriodRemaining: number };
  "blocking:getRules": BlockRule[];
  "blocking:addRule": BlockRule;
  "blocking:removeRule": void;
  "blocking:updateRule": BlockRule;

  // Data query channels
  "data:getDailyCommits": DailyCommit[];
  "data:getStreakStats": StreakStats;
  "data:getSessionHistory": PomodoroSession[];

  // Settings channels
  "settings:get": UserSettings;
  "settings:update": UserSettings;
};

interface Window {
  electron: {
    // Existing system monitor API
    subscribeStatistics: (
      callback: (statistics: Statistics) => void
    ) => UnsubscribeFunction;
    getStaticData: () => Promise<StaticData>;

    // Existing update API
    onUpdateAvailable: (callback: () => void) => UnsubscribeFunction;
    onUpdateDownloaded: (callback: () => void) => UnsubscribeFunction;
    onCheckingForUpdate: (callback: () => void) => UnsubscribeFunction;
    onUpdateNotAvailable: (callback: () => void) => UnsubscribeFunction;
    onDownloadProgress: (callback: (progress: DownloadProgress) => void) => UnsubscribeFunction;
    onUpdateError: (callback: (error: string) => void) => UnsubscribeFunction;
    startDownload: () => void;
    installUpdate: () => void;
    checkForUpdates: () => void;

    // Pomodoro API
    startPomodoro: (durationMinutes?: number) => Promise<PomodoroSession>;
    stopPomodoro: () => Promise<PomodoroSession | null>;
    pausePomodoro: () => void;
    resumePomodoro: () => void;
    onPomodoroState: (callback: (state: PomodoroState) => void) => UnsubscribeFunction;
    onPomodoroCompleted: (callback: (session: PomodoroSession) => void) => UnsubscribeFunction;
    onPomodoroFailed: (callback: (data: { session: PomodoroSession; reason: string }) => void) => UnsubscribeFunction;

    // Blocking API
    getBlockRules: () => Promise<BlockRule[]>;
    addBlockRule: (rule: Omit<BlockRule, "id" | "createdAt">) => Promise<BlockRule>;
    removeBlockRule: (id: string) => Promise<void>;
    updateBlockRule: (rule: BlockRule) => Promise<BlockRule>;
    onBlockingWarning: (callback: (data: { rule: BlockRule; gracePeriodRemaining: number }) => void) => UnsubscribeFunction;
    onBlockingViolation: (callback: (event: ViolationEvent) => void) => UnsubscribeFunction;

    // Data API
    getDailyCommits: (startDate: string, endDate: string) => Promise<DailyCommit[]>;
    getStreakStats: () => Promise<StreakStats>;
    getSessionHistory: (limit: number, offset: number) => Promise<PomodoroSession[]>;

    // Settings API
    getSettings: () => Promise<UserSettings>;
    updateSettings: (settings: Partial<UserSettings>) => Promise<UserSettings>;
  };
}

