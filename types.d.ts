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

type UpdateInfo = {
  version: string;
  files: { url: string; sha512: string; size: number }[];
  path: string;
  sha512: string;
  releaseName?: string;
  releaseNotes?: string | { version: string; note: string | null }[];
  releaseDate: string;
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

interface UsageLog {
  id: string;
  appName: string;
  windowTitle: string;
  url?: string;
  startTime: number;
  endTime?: number;
  durationSeconds?: number;
  createdAt: number;
}

interface UsageStats {
  appName: string;
  totalDuration: number;
}

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
  theme: 'github-dark' | 'gruvbox' | 'terminal' | 'system' | 'light';
  isBoxed: boolean;
  hasCompletedOnboarding: boolean;
};

// === KANBAN DOMAIN ===

type KanbanStatus = "todo" | "in-progress" | "done";

type KanbanSubtask = {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

type KanbanActivityLog = {
  id: string;
  taskId: string;
  taskTitle: string;
  action: "created" | "moved" | "deleted" | "subtask_added" | "subtask_completed" | "subtask_deleted" | "updated" | "subtask_updated";
  details: string;
  createdAt: number;
};

type KanbanTask = {
  id: string;
  title: string;
  description: string;
  status: KanbanStatus;
  dueDate?: number;
  youtubeLink?: string;
  createdAt: number;
  subtasks: KanbanSubtask[];
};


// === IPC EVENT PAYLOAD MAPPING ===

type EventPayloadMapping = {
  // Existing system monitor channels
  statistics: Statistics;
  getStaticData: StaticData;
  "update-available": UpdateInfo;
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
  "data:getSessionsByDateRange": PomodoroSession[];

  // Settings channels
  "settings:get": UserSettings;
  "settings:update": UserSettings;

  // Kanban channels
  "kanban:createTask": KanbanTask;
  "kanban:getTasks": KanbanTask[];
  "kanban:updateTask": KanbanTask;
  "kanban:updateStatus": void;
  "kanban:deleteTask": void;

  // Subtask channels
  "kanban:createSubtask": KanbanSubtask;
  "kanban:toggleSubtask": void;
  "kanban:updateSubtaskTitle": void;
  "kanban:deleteSubtask": void;
  "kanban:getActivityLog": KanbanActivityLog[];

  // Usage Tracking
  "usage:getStats": { appName: string; totalDuration: number }[];
  "usage:getTimeline": UsageLog[];

  // Window/App State
  "app:mini-mode": boolean;
  "window:expand": void;
};

interface Window {
  electron: {
    // Existing system monitor API
    subscribeStatistics: (
      callback: (statistics: Statistics) => void
    ) => UnsubscribeFunction;
    getStaticData: () => Promise<StaticData>;

    // Existing update API
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => UnsubscribeFunction;
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
    getSessionsByDateRange: (startTime: number, endTime: number) => Promise<PomodoroSession[]>;

    // Settings API
    getSettings: () => Promise<UserSettings>;
    updateSettings: (settings: Partial<UserSettings>) => Promise<UserSettings>;

    // Kanban API
    createKanbanTask: (task: Omit<KanbanTask, "id" | "createdAt" | "subtasks">) => Promise<KanbanTask>;
    getKanbanTasks: () => Promise<KanbanTask[]>;
    updateKanbanTask: (task: KanbanTask) => Promise<KanbanTask>;
    updateKanbanTaskStatus: (id: string, status: KanbanStatus) => Promise<void>;
    deleteKanbanTask: (id: string) => Promise<void>;

    // Subtask API
    createKanbanSubtask: (subtask: Omit<KanbanSubtask, "id" | "createdAt" | "completed">) => Promise<KanbanSubtask>;
    toggleKanbanSubtask: (id: string, completed: boolean) => Promise<void>;
    updateKanbanSubtaskTitle: (id: string, title: string) => Promise<void>;
    deleteKanbanSubtask: (id: string) => Promise<void>;
    getKanbanActivityLog: () => Promise<KanbanActivityLog[]>;
    // Usage Tracking API
    getUsageStats: (startDate: number, endDate: number) => Promise<UsageStats[]>;
    getUsageTimeline: (startDate: number, endDate: number) => Promise<UsageLog[]>;

    // Window/App API
    onMiniModeChange: (callback: (isMini: boolean) => void) => UnsubscribeFunction;
    expandWindow: () => Promise<void>;
  };
}

