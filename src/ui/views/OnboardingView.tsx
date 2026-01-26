import { Check, Terminal, Github, Palette } from 'lucide-react';
import { useTheme } from '../provider/theme-provider';
import { useSettings } from '../hooks/useSettings';
import { Button } from '../components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';

export function OnboardingView() {
    const { theme, setTheme } = useTheme();
    const { updateSettings } = useSettings();

    const handleComplete = async () => {
        await updateSettings({ hasCompletedOnboarding: true });
    };

    const themes = [
        {
            id: 'github-dark',
            name: 'GitHub Dark',
            description: 'Subtle high-contrast dark theme',
            icon: Github,
            colors: { bg: '#0d1117', fg: '#c9d1d9', accent: '#1f6feb' }
        },
        {
            id: 'gruvbox',
            name: 'Gruvbox',
            description: 'Retro groove color scheme',
            icon: Palette,
            colors: { bg: '#282828', fg: '#ebdbb2', accent: '#d79921' }
        },
        {
            id: 'terminal',
            name: 'Terminal',
            description: 'Old-school hacker vibes',
            icon: Terminal,
            colors: { bg: '#0c0c0c', fg: '#00ff00', accent: '#00ff00' }
        }
    ] as const;

    return (
        <div className="w-screen h-screen bg-background flex items-center justify-center p-4">
            <Card className="max-w-4xl w-full border-2 border-primary shadow-2xl animate-in fade-in zoom-in duration-500 p-10">
                <CardHeader className="text-center">
                    <CardTitle className="text-4xl font-bold mb-2 uppercase tracking-widest">{">"}_ Welcome to IronFocus</CardTitle>
                    <CardDescription className="text-xl">
                        Optimize your workflow. Minimize distractions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 mt-8">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-center uppercase tracking-wider mb-6">Choose your aesthetic</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {themes.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`
                                        cursor-pointer relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-105
                                        ${theme === t.id ? 'border-primary ring-2 ring-primary/50' : 'border-border/50 hover:border-primary/50'}
                                    `}
                                >
                                    <div className="h-32 w-full flex items-center justify-center" style={{ backgroundColor: t.colors.bg }}>
                                        <div className="space-y-2 p-4 w-full opacity-80">
                                            <div className="h-2 w-3/4 rounded-full" style={{ backgroundColor: t.colors.fg }}></div>
                                            <div className="h-2 w-1/2 rounded-full" style={{ backgroundColor: t.colors.fg, opacity: 0.5 }}></div>
                                            <div className="h-2 w-full rounded-full" style={{ backgroundColor: t.colors.accent }}></div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-card">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <t.icon className="w-5 h-5 text-primary" />
                                                <span className="font-bold">{t.name}</span>
                                            </div>
                                            {theme === t.id && <Check className="w-5 h-5 text-primary" />}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{t.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <Button
                            size="lg"
                            className="w-full md:w-auto min-w-[200px] text-lg font-bold"
                            onClick={handleComplete}
                        >
                            Get Started
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
