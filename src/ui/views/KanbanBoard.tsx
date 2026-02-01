import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, CheckSquare, Square, X, History, Link as LinkIcon, ExternalLink } from "lucide-react";
import { ScrollArea } from "../components/scroll-area";

// Types are globally available via types.d.ts

export function KanbanBoard() {
    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskLink, setNewTaskLink] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    const [logs, setLogs] = useState<KanbanActivityLog[]>([]);
    const [showLogs, setShowLogs] = useState(false);
    const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const loadedTasks = await window.electron.getKanbanTasks();
            setTasks(loadedTasks);
        } catch (error) {
            console.error("Failed to load tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async () => {
        try {
            const activityLogs = await window.electron.getKanbanActivityLog();
            setLogs(activityLogs);
        } catch (error) {
            console.error("Failed to load logs:", error);
        }
    };

    // Toggle logs and refresh when opening
    const toggleLogs = () => {
        if (!showLogs) {
            loadLogs();
        }
        setShowLogs(!showLogs);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const newTask = await window.electron.createKanbanTask({
                title: newTaskTitle,
                description: "",
                status: "todo",
                youtubeLink: newTaskLink.trim() || undefined,
            });
            // Ensure subtasks is initialized
            const taskWithSubtasks = { ...newTask, subtasks: [] };
            setTasks([taskWithSubtasks, ...tasks]);
            setNewTaskTitle("");
            setNewTaskLink("");
            setIsAdding(false);
        } catch (error) {
            console.error("Failed to create task:", error);
        }
    };

    const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            setTasks(tasks.filter((t) => t.id !== id));
            await window.electron.deleteKanbanTask(id);
        } catch (error) {
            console.error("Failed to delete task:", error);
            loadTasks();
        }
    };

    // === Drag and Drop ===

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, status: KanbanStatus) => {
        e.preventDefault();
        if (!draggedTaskId) return;

        const task = tasks.find((t) => t.id === draggedTaskId);
        if (!task || task.status === status) {
            setDraggedTaskId(null);
            return;
        }

        try {
            // Optimistic update
            const updatedTasks = tasks.map((t) =>
                t.id === draggedTaskId ? { ...t, status } : t
            );
            setTasks(updatedTasks);
            setDraggedTaskId(null);

            await window.electron.updateKanbanTaskStatus(draggedTaskId, status);
        } catch (error) {
            console.error("Failed to update status:", error);
            loadTasks();
        }
    };

    // === Subtasks ===

    const handleAddSubtask = async (e: React.FormEvent, taskId: string) => {
        e.preventDefault();
        const title = newSubtaskTitles[taskId];
        if (!title?.trim()) return;

        try {
            const newSubtask = await window.electron.createKanbanSubtask({
                taskId,
                title,
            });

            const updatedTasks = tasks.map(t => {
                if (t.id === taskId) {
                    return { ...t, subtasks: [...t.subtasks, newSubtask] };
                }
                return t;
            });
            setTasks(updatedTasks);
            setNewSubtaskTitles(prev => ({ ...prev, [taskId]: "" }));
        } catch (error) {
            console.error("Failed to create subtask:", error);
        }
    };

    const handleToggleSubtask = async (subtaskId: string, completed: boolean, taskId: string) => {
        try {
            // Optimistic
            const updatedTasks = tasks.map(t => {
                if (t.id === taskId) {
                    return {
                        ...t,
                        subtasks: t.subtasks.map(st =>
                            st.id === subtaskId ? { ...st, completed } : st
                        )
                    };
                }
                return t;
            });
            setTasks(updatedTasks);

            await window.electron.toggleKanbanSubtask(subtaskId, completed);
        } catch (error) {
            console.error("Failed to toggle subtask:", error);
            loadTasks();
        }
    };

    const handleDeleteSubtask = async (subtaskId: string, taskId: string) => {
        try {
            // Optimistic
            const updatedTasks = tasks.map(t => {
                if (t.id === taskId) {
                    return {
                        ...t,
                        subtasks: t.subtasks.filter(st => st.id !== subtaskId)
                    };
                }
                return t;
            });
            setTasks(updatedTasks);

            await window.electron.deleteKanbanSubtask(subtaskId);
        } catch (error) {
            console.error("Failed to delete subtask:", error);
            loadTasks();
        }
    };

    // === Helpers ===
    const getYoutubeId = (url: string | undefined) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const columns: { id: KanbanStatus; title: string }[] = [
        { id: "todo", title: "To Do" },
        { id: "in-progress", title: "In Progress" },
        { id: "done", title: "Done" },
    ];

    if (loading) {
        return <div className="p-8 text-center">Loading board...</div>;
    }

    return (
        <div className="h-full flex flex-col gap-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Weekly Planner</h2>
                    <p className="text-muted-foreground">Plan your week. Drag and drop to track progress.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleLogs}
                        className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                        title="View Activity Log"
                    >
                        <History size={16} />
                        History
                    </button>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={16} />
                        New Task
                    </button>
                </div>
            </div>

            {/* Activity Log Overlay */}
            {showLogs && (
                <div className="absolute right-0 top-16 z-50 w-80 max-h-[calc(100vh-12rem)] bg-card border shadow-lg rounded-lg flex flex-col animate-in slide-in-from-right-5 fade-in duration-200">
                    <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                        <h3 className="font-semibold text-sm">Activity Log</h3>
                        <button onClick={() => setShowLogs(false)} className="text-muted-foreground hover:text-foreground">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="overflow-y-auto p-3 space-y-3 flex-1">
                        {logs.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No recent activity.</p>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium truncate max-w-[150px]">{log.taskTitle}</span>
                                        <span className="text-muted-foreground text-[10px]">
                                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground">{log.details}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 border-t bg-muted/20 text-center">
                        <button onClick={loadLogs} className="text-xs text-primary hover:underline">Refresh</button>
                    </div>
                </div>
            )}

            {isAdding && (
                <form onSubmit={handleCreateTask} className="bg-card border rounded-lg p-4 animate-in slide-in-from-top-2">
                    <div className="flex flex-col gap-3">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="What do you want to achieve this week?"
                            className="bg-background border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={newTaskLink}
                                    onChange={(e) => setNewTaskLink(e.target.value)}
                                    placeholder="Optional: Paste YouTube link here..."
                                    className="w-full bg-background border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!newTaskTitle.trim()}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                            >
                                Add
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
                {columns.map((col) => (
                    <ScrollArea
                        key={col.id}
                        className={`flex flex-col h-full bg-muted/30 rounded-lg p-4 border overflow-y-auto transition-colors ${draggedTaskId ? "border-primary/30 bg-muted/50" : "border-border/50"
                            }`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <h3 className="font-semibold mb-4 flex items-center justify-between">
                            {col.title}
                            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                                {tasks.filter(t => t.status === col.id).length}
                            </span>
                        </h3>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {tasks
                                .filter((task) => task.status === col.id)
                                .map((task) => (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        className={`group bg-card p-3 rounded-md border shadow-sm hover:shadow-md transition-all animate-in fade-in zoom-in-95 duration-200 cursor-move ${draggedTaskId === task.id ? "opacity-50" : "opacity-100"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="font-medium text-sm leading-tight text-balance">{task.title}</p>
                                            <button
                                                onClick={(e) => handleDeleteTask(task.id, e)}
                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete task"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* YouTube Embed */}
                                        {task.youtubeLink && getYoutubeId(task.youtubeLink) && (
                                            <div className="mb-3 rounded-md overflow-hidden bg-black/5 aspect-video relative group/video">
                                                <iframe
                                                    width="100%"
                                                    height="100%"
                                                    src={`https://www.youtube.com/embed/${getYoutubeId(task.youtubeLink)}`}
                                                    title="YouTube video player"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    className="absolute inset-0"
                                                ></iframe>
                                            </div>
                                        )}
                                        {task.youtubeLink && !getYoutubeId(task.youtubeLink) && (
                                            <div className="mb-2 text-xs truncate text-blue-500 hover:underline">
                                                <a href={task.youtubeLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                                    <ExternalLink size={10} />
                                                    {task.youtubeLink}
                                                </a>
                                            </div>
                                        )}

                                        {/* Subtasks Section */}
                                        <div className="mt-2 space-y-2">
                                            {/* Progress Bar */}
                                            {task.subtasks && task.subtasks.length > 0 && (
                                                <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                                                    <div
                                                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Subtask List */}
                                            {task.subtasks?.map(subtask => (
                                                <div key={subtask.id} className="flex items-center gap-2 text-xs group/sub">
                                                    <button
                                                        onClick={() => handleToggleSubtask(subtask.id, !subtask.completed, task.id)}
                                                        className={`text-muted-foreground hover:text-primary transition-colors ${subtask.completed ? "text-primary" : ""}`}
                                                    >
                                                        {subtask.completed ? <CheckSquare size={12} /> : <Square size={12} />}
                                                    </button>
                                                    <span className={`flex-1 truncate ${subtask.completed ? "line-through text-muted-foreground/50" : "text-muted-foreground"}`}>
                                                        {subtask.title}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteSubtask(subtask.id, task.id)}
                                                        className="text-muted-foreground/50 hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Add Subtask Input */}
                                            <form
                                                onSubmit={(e) => handleAddSubtask(e, task.id)}
                                                className="flex items-center gap-2 mt-1"
                                                onClick={(e) => e.stopPropagation()} // Prevent drag start when clicking input
                                            >
                                                <Plus size={12} className="text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={newSubtaskTitles[task.id] || ""}
                                                    onChange={(e) => setNewSubtaskTitles(prev => ({ ...prev, [task.id]: e.target.value }))}
                                                    placeholder="Add subtask..."
                                                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                                                />
                                            </form>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar size={10} />
                                                {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                            {tasks.filter(t => t.status === col.id).length === 0 && (
                                <div className="h-24 border-2 border-dashed border-muted rounded-md flex items-center justify-center text-muted-foreground text-sm italic">
                                    Drop tasks here
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ))}
            </div>
        </div>
    );
}
