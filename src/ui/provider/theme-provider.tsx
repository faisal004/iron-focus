import { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';

type Theme = 'github-dark' | 'gruvbox' | 'terminal' | 'system' | 'light';

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: 'github-dark',
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, defaultTheme = 'github-dark', ...props }: ThemeProviderProps) {
    const { settings, updateSettings } = useSettings();
    const [theme, setThemeState] = useState<Theme>(defaultTheme);

    // Sync from settings when they load
    useEffect(() => {
        if (settings?.theme) {
            setThemeState(settings.theme);
        }
    }, [settings?.theme]);

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old theme classes
        root.classList.remove('github-dark', 'gruvbox', 'terminal', 'dark', 'light');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark' // System dark maps to default dark (which we aliased to github-dark styles mostly)
                : 'light';
            root.classList.add(systemTheme);
            // Also add github-dark as a fallback for dark mode if systemTheme is dark, 
            // but our CSS uses .dark OR .github-dark, so .dark is sufficient for the variables.
            // However, sticking to specific class if needed. 
            // If system is dark, we can map to github-dark styles if we want that to be the "dark" default.
            if (systemTheme === 'dark') {
                root.classList.add('github-dark');
            }
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        if (settings?.isBoxed) {
            root.style.setProperty('--radius', '0rem');
        } else {
            root.style.removeProperty('--radius'); // Reverts to CSS default
        }
    }, [settings?.isBoxed]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        // Persist to backend
        updateSettings({ theme: newTheme });
    };

    return (
        <ThemeProviderContext.Provider {...props} value={{ theme, setTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');

    return context;
};