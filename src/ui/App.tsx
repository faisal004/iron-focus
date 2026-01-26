import { UpdateNotification } from './UpdateNotification';
import { PomodoroTimer } from './views/PomodoroTimer';
import { CommitHeatmap } from './views/CommitHeatmap';
import { BlockRuleManager } from './views/BlockRuleManager';

function App() {
  return (
    <div className="w-screen h-screen bg-background flex flex-col overflow-hidden">
      <header className="border-b-2 border-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold uppercase tracking-widest">
            {">"}_ IRON_FOCUS
          </h1>
        </div>
      </header>

      <UpdateNotification />

      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <PomodoroTimer />
          <CommitHeatmap />
          <BlockRuleManager />
        </div>
      </main>
    </div>
  );
}

export default App;
