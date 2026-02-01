import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Button } from '../components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../components/dialog';
import { toast } from 'sonner';

export function SettingsView() {
    const { settings, updateSettings, loading } = useSettings();
    const [duration, setDuration] = useState(25);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (settings) {
            setDuration(settings.defaultDurationMinutes);
        }
    }, [settings]);

    const handleSave = async () => {
        if (!settings) return;

        try {
            await updateSettings({
                defaultDurationMinutes: duration,
            });
            toast.success('Settings saved successfully');
            setIsOpen(false);
        } catch (error) {
            toast.error('Failed to save settings');
        }
    };

    const PRESETS = [15, 25, 45, 60];

    if (loading) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-2 border-primary hover:bg-primary  font-mono font-bold uppercase tracking-wider rounded-none">
                    [ CONFIG ]
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-4 border-primary bg-background shadow-none rounded-none">
                <DialogHeader className="border-b-2 border-primary pb-4">
                    <DialogTitle className="text-xl uppercase font-extrabold tracking-widest flex items-center gap-2">
                        {">"}_ SYSTEM_CONFIG
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs opacity-70">
                        // ADJUST_CORE_PARAMETERS
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold uppercase tracking-wide">
                                SESSION_DURATION_MINUTES
                            </label>
                            <span className="font-mono font-bold text-primary">
                                {duration}m
                            </span>
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-4 gap-2">
                            {PRESETS.map((preset) => (
                                <Button
                                    key={preset}
                                    type="button"
                                    variant={duration === preset ? "default" : "outline"}
                                    onClick={() => setDuration(preset)}
                                    className={`
                                        rounded-none border-2 border-primary font-bold
                                        ${duration === preset
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-primary hover:text-primary-foreground'
                                        }
                                    `}
                                >
                                    {preset}m
                                </Button>
                            ))}
                        </div>

                        {/* Custom Slider / Input (Visual Fallback) */}
                        <div className="flex items-center gap-4 border-2 border-primary p-2">
                            <input
                                type="range"
                                min="1"
                                max="120"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full h-2 bg-secondary appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 border-t-2 border-primary/20 pt-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold uppercase tracking-wide opacity-50 cursor-not-allowed">
                                NOTIFICATIONS (ENABLED)
                            </label>
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        </div>
                    </div>

                    <div className="space-y-4 border-t-2 border-primary/20 pt-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold uppercase tracking-wide">
                                UI_STYLE (BOXED_MODE)
                            </label>
                            <Button
                                type="button"
                                variant={settings?.isBoxed ? "default" : "outline"}
                                onClick={() => {
                                    if (settings) updateSettings({ isBoxed: !settings.isBoxed });
                                }}
                                className={`
                                    rounded-none border-2 border-primary font-bold w-24
                                    ${settings?.isBoxed
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-primary hover:text-primary-foreground'
                                    }
                                `}
                            >
                                {settings?.isBoxed ? "ON" : "OFF"}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        className="rounded-none hover:bg-destructive/10 hover:text-destructive font-bold uppercase"
                    >
                        [ CANCEL ]
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="rounded-none border-2 border-primary bg-primary text-primary-foreground hover:opacity-90 font-bold uppercase"
                    >
                        [ APPLY_CHANGES ]
                    </Button>
                </div>
            </DialogContent >
        </Dialog >
    );
}
