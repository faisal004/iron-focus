const electron = require('electron');

electron.contextBridge.exposeInMainWorld('electron', {
  // === SYSTEM MONITOR API ===
  subscribeStatistics: (callback: (stats: Statistics) => void) =>
    ipcOn('statistics', (stats) => {
      callback(stats);
    }),
  getStaticData: () => ipcInvoke('getStaticData'),

  // === UPDATE API ===
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => ipcOn('update-available', (info) => callback(info)),
  onUpdateDownloaded: (callback: () => void) => ipcOn('update-downloaded', () => callback()),
  onCheckingForUpdate: (callback: () => void) => ipcOn('checking-for-update', () => callback()),
  onUpdateNotAvailable: (callback: () => void) => ipcOn('update-not-available', () => callback()),
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => ipcOn('download-progress', (payload) => callback(payload)),
  onUpdateError: (callback: (error: string) => void) => ipcOn('update-error', (payload) => callback(payload)),
  startDownload: () => ipcSend('startDownload'),
  installUpdate: () => ipcSend('installUpdate'),
  checkForUpdates: () => ipcSend('checkForUpdates'),

  // === POMODORO API ===
  startPomodoro: (durationMinutes?: number) => ipcInvokeWithArgs('pomodoro:start', { durationMinutes }),
  stopPomodoro: () => ipcInvoke('pomodoro:stop'),
  pausePomodoro: () => ipcSend('pomodoro:pause'),
  resumePomodoro: () => ipcSend('pomodoro:resume'),
  onPomodoroState: (callback: (state: PomodoroState) => void) => ipcOn('pomodoro:state', callback),
  onPomodoroCompleted: (callback: (session: PomodoroSession) => void) => ipcOn('pomodoro:completed', callback),
  onPomodoroFailed: (callback: (data: { session: PomodoroSession; reason: string }) => void) => ipcOn('pomodoro:failed', callback),

  // === BLOCKING API ===
  getBlockRules: () => ipcInvoke('blocking:getRules'),
  addBlockRule: (rule: Omit<BlockRule, 'id' | 'createdAt'>) => ipcInvokeWithArgs('blocking:addRule', rule),
  removeBlockRule: (id: string) => ipcInvokeWithArgs('blocking:removeRule', { id }),
  updateBlockRule: (rule: BlockRule) => ipcInvokeWithArgs('blocking:updateRule', rule),
  onBlockingWarning: (callback: (data: { rule: BlockRule; gracePeriodRemaining: number }) => void) => ipcOn('blocking:warning', callback),
  onBlockingViolation: (callback: (event: ViolationEvent) => void) => ipcOn('blocking:violation', callback),

  // === DATA API ===
  getDailyCommits: (startDate: string, endDate: string) => ipcInvokeWithArgs('data:getDailyCommits', { startDate, endDate }),
  getStreakStats: () => ipcInvoke('data:getStreakStats'),
  getSessionHistory: (limit: number, offset: number) => ipcInvokeWithArgs('data:getSessionHistory', { limit, offset }),
  getSessionsByDateRange: (startTime: number, endTime: number) => ipcInvokeWithArgs('data:getSessionsByDateRange', { startTime, endTime }),

  // === SETTINGS API ===
  getSettings: () => ipcInvoke('settings:get'),
  updateSettings: (settings: Partial<UserSettings>) => ipcInvokeWithArgs('settings:update', settings),

  // === KANBAN API ===
  createKanbanTask: (task: Omit<KanbanTask, "id" | "createdAt" | "subtasks">) => ipcInvokeWithArgs('kanban:createTask', task),
  getKanbanTasks: () => ipcInvoke('kanban:getTasks'),
  updateKanbanTask: (task: KanbanTask) => ipcInvokeWithArgs('kanban:updateTask', task),
  updateKanbanTaskStatus: (id: string, status: KanbanStatus) => ipcInvokeWithArgs('kanban:updateStatus', { id, status }),
  deleteKanbanTask: (id: string) => ipcInvokeWithArgs('kanban:deleteTask', id),

  // === SUBTIASK API ===
  createKanbanSubtask: (subtask: Omit<KanbanSubtask, "id" | "createdAt" | "completed">) => ipcInvokeWithArgs('kanban:createSubtask', subtask),
  toggleKanbanSubtask: (id: string, completed: boolean) => ipcInvokeWithArgs('kanban:toggleSubtask', { id, completed }),
  updateKanbanSubtaskTitle: (id: string, title: string) => ipcInvokeWithArgs('kanban:updateSubtaskTitle', { id, title }),
  deleteKanbanSubtask: (id: string) => ipcInvokeWithArgs('kanban:deleteSubtask', id),
  getKanbanActivityLog: () => ipcInvoke('kanban:getActivityLog'),

  // === USAGE TRACKING API ===
  getUsageStats: (startDate: number, endDate: number) => ipcInvokeWithArgs('usage:getStats', { startDate, endDate }),
  getUsageTimeline: (startDate: number, endDate: number) => ipcInvokeWithArgs('usage:getTimeline', { startDate, endDate }),

  // === WINDOW/APP API ===
  onMiniModeChange: (callback: (isMini: boolean) => void) => ipcOn('app:mini-mode', callback),
  expandWindow: () => ipcInvoke('window:expand'),
} satisfies Window['electron']);

function ipcInvoke<Key extends keyof EventPayloadMapping>(
  key: Key
): Promise<EventPayloadMapping[Key]> {
  return electron.ipcRenderer.invoke(key);
}

function ipcInvokeWithArgs<Args, Return>(
  key: string,
  args: Args
): Promise<Return> {
  return electron.ipcRenderer.invoke(key, args);
}

function ipcOn<Key extends keyof EventPayloadMapping>(
  key: Key,
  callback: (payload: EventPayloadMapping[Key]) => void
) {
  const cb = (_: Electron.IpcRendererEvent, payload: EventPayloadMapping[Key]) => callback(payload);
  electron.ipcRenderer.on(key, cb);
  return () => electron.ipcRenderer.off(key, cb);
}

function ipcSend<Key extends keyof EventPayloadMapping>(
  key: Key,
  payload?: EventPayloadMapping[Key]
) {
  electron.ipcRenderer.invoke(key, payload);
}
