import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, CheckSquare, Square, X, History, Link as LinkIcon, ExternalLink, ChevronRight, ChevronDown, Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/sheet";
import { ScrollArea } from "../components/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "../components/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../components/alert-dlalog";
import { Button } from "../components/button";

// Types are globally available via types.d.ts

export function KanbanBoard() {
    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskLink, setNewTaskLink] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    // Edit State
    const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editLink, setEditLink] = useState("");
    const [editSubtasks, setEditSubtasks] = useState<{ id: string, title: string }[]>([]);

    const [logs, setLogs] = useState<KanbanActivityLog[]>([]);
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

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTaskToDelete(id);
    };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;
        try {
            setTasks(tasks.filter((t) => t.id !== taskToDelete));
            await window.electron.deleteKanbanTask(taskToDelete);
        } catch (error) {
            console.error("Failed to delete task:", error);
            loadTasks();
        } finally {
            setTaskToDelete(null);
        }
    };

    const handleEditClick = (task: KanbanTask, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTask(task);
        setEditTitle(task.title);
        setEditLink(task.youtubeLink || "");
        setEditSubtasks(task.subtasks.map(s => ({ id: s.id, title: s.title })));
    };

    const handleSaveEdit = async () => {
        if (!editingTask) return;

        try {
            // Update Main Task
            const updatedTask = {
                ...editingTask,
                title: editTitle,
                youtubeLink: editLink.trim() || undefined
            };

            await window.electron.updateKanbanTask(updatedTask);

            // Update Changed Subtasks
            const originalSubtasks = editingTask.subtasks;
            for (const sub of editSubtasks) {
                const original = originalSubtasks.find(os => os.id === sub.id);
                if (original && original.title !== sub.title && sub.title.trim()) {
                    await window.electron.updateKanbanSubtaskTitle(sub.id, sub.title);
                }
            }

            // Reload tasks to be safe and clean, or update optimistically
            // For now, let's just reload to ensure consistency with DB state
            // But to make it snappy, we can do local update too

            setTasks(prev => prev.map(t => {
                if (t.id === editingTask.id) {
                    return {
                        ...updatedTask,
                        subtasks: t.subtasks.map(s => {
                            const edited = editSubtasks.find(es => es.id === s.id);
                            return edited ? { ...s, title: edited.title } : s;
                        })
                    };
                }
                return t;
            }));

            setEditingTask(null);
        } catch (error) {
            console.error("Failed to update task:", error);
            loadTasks(); // Fallback
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

    const groupLogsByTask = (logs: KanbanActivityLog[]) => {
        return logs.reduce((acc, log) => {
            if (!acc[log.taskId]) {
                acc[log.taskId] = {
                    taskId: log.taskId,
                    taskTitle: log.taskTitle,
                    logs: []
                };
            }
            acc[log.taskId].logs.push(log);
            return acc;
        }, {} as Record<string, { taskId: string, taskTitle: string, logs: KanbanActivityLog[] }>);
    };

    const LogGroup = ({ group }: { group: { taskId: string, taskTitle: string, logs: KanbanActivityLog[] } }) => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <div className="border bg-card/50 overflow-hidden">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-2 truncate">
                        {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                        <span className="truncate">{group.taskTitle}</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {group.logs.length}
                    </span>
                </button>
                {isOpen && (
                    <div className="border-t bg-background/50 divide-y divide-border/30">
                        {group.logs.map(log => (
                            <div key={log.id} className="p-3 text-xs hover:bg-muted/10 transition-colors">
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <span className="text-muted-foreground font-mono opacity-70">
                                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold ${log.action === 'created' ? 'bg-green-500/10 text-green-500' :
                                            log.action === 'deleted' ? 'bg-red-500/10 text-red-500' :
                                                log.action === 'moved' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-gray-500/10 text-gray-500'
                                        }`}>
                                        {log.action.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-foreground/80 pl-8">{log.details}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const columns: { id: KanbanStatus; title: string }[] = [
        { id: "todo", title: "To Do" },
        { id: "in-progress", title: "In Progress" },
        { id: "done", title: "Done" },
    ];

    if (loading) {
        return <div className="p-8 text-center">Loading board...</div>;
    }

    const groupedLogs = groupLogsByTask(logs);

    return (
        <div className="h-full flex flex-col gap-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Weekly Planner</h2>
                    <p className="text-muted-foreground">Plan your week. Drag and drop to track progress.</p>
                </div>
                <div className="flex gap-2">
                    <Sheet onOpenChange={(open) => { if (open) loadLogs(); }}>
                        <SheetTrigger asChild>
                            <button
                                className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                                title="View Activity Log"
                            >
                                <History size={16} />
                                History
                            </button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader className="">
                                <SheetTitle>Activity Log</SheetTitle>
                            </SheetHeader>
                            <ScrollArea className="h-[calc(100vh-6rem)] ">
                                <div className="space-y-3 px-5">
                                    {logs.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            <History className="mx-auto mb-2 opacity-50" size={32} />
                                            No activity recorded yet.
                                        </div>
                                    ) : (
                                        Object.values(groupedLogs)
                                            .sort((a, b) => {
                                                const latestA = Math.max(...a.logs.map(l => l.createdAt));
                                                const latestB = Math.max(...b.logs.map(l => l.createdAt));
                                                return latestB - latestA;
                                            })
                                            .map(group => (
                                                <LogGroup key={group.taskId} group={group} />
                                            ))
                                    )}
                                </div>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>

                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={16} />
                        New Task
                    </button>
                </div>
            </div>

            {/* Create Task Dialog */}
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Task</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTask} id="create-task-form" className="space-y-4">
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="What do you want to achieve?"
                                className="w-full bg-background border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                                autoFocus
                            />
                            <div className="relative">
                                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={newTaskLink}
                                    onChange={(e) => setNewTaskLink(e.target.value)}
                                    placeholder="Optional: Paste YouTube link..."
                                    className="w-full bg-background border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                        <Button type="submit" form="create-task-form" disabled={!newTaskTitle.trim()}>Add Task</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
                <DialogContent className="max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Task Title</label>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-background border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">YouTube Link</label>
                            <div className="relative">
                                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={editLink}
                                    onChange={(e) => setEditLink(e.target.value)}
                                    className="w-full bg-background border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>

                        {editSubtasks.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subtasks</label>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                    {editSubtasks.map((sub, index) => (
                                        <div key={sub.id} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={sub.title}
                                                onChange={(e) => {
                                                    const newSubtasks = [...editSubtasks];
                                                    newSubtasks[index].title = e.target.value;
                                                    setEditSubtasks(newSubtasks);
                                                }}
                                                className="flex-1 bg-muted/30 border-b border-transparent focus:border-primary/50 px-2 py-1 text-sm outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={!editTitle.trim()}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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

                        <div className="flex-1 space-y-3 pr-1">
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
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleEditClick(task, e)}
                                                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                                                    title="Edit task"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteClick(task.id, e)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                    title="Delete task"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
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
