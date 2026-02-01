import { useState } from 'react';
import { UpdateNotification } from './UpdateNotification';
import { PomodoroTimer } from './views/PomodoroTimer';
import { CommitHeatmap } from './views/CommitHeatmap';
import { BlockRuleManager } from './views/BlockRuleManager';
import { SettingsView } from './views/SettingsView';
import { ModeToggle } from './components/mode-toggle';
import { OnboardingView } from './views/OnboardingView';
import { KanbanBoard } from './views/KanbanBoard';
import { useSettings } from './hooks/useSettings';

function App() {
  const { settings, loading } = useSettings();
  const [activeTab, setActiveTab] = useState<'focus' | 'plan'>('focus');

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  if (settings && !settings.hasCompletedOnboarding) {
    return <OnboardingView />;
  }

  return (
    <div className="w-screen h-screen bg-background flex flex-col overflow-hidden">
      <header className="border-b-2 border-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold uppercase tracking-widest">
            {">"}_ GIT_FOCUS
          </h1>

          <nav className="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
            <button
              onClick={() => setActiveTab('focus')}
              className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-all ${activeTab === 'focus'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
            >
              Focus
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-all ${activeTab === 'plan'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
            >
              Plan
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <SettingsView />
          <ModeToggle />
        </div>
      </header>

      <UpdateNotification />

      <main className="flex-1 overflow-auto p-4">
        {activeTab === 'focus' ? (
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 h-full">
              <PomodoroTimer />
            </div>
            <div className="md:col-span-2 h-full">
              <BlockRuleManager />
            </div>

            <div className="md:col-span-3">
              <CommitHeatmap />
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto h-full">
            <KanbanBoard />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
