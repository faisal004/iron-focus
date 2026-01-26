import { useEffect, useMemo, useState } from 'react';
import { useStatistics } from './useStatistics';
import { Chart } from './Chart';
import { UpdateNotification } from './UpdateNotification';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/card';
import { Button } from './components/button';
import { cn } from './lib/utils';
import { PomodoroTimer } from './views/PomodoroTimer';
import { CommitHeatmap } from './views/CommitHeatmap';
import { BlockRuleManager } from './views/BlockRuleManager';

type AppView = 'monitor' | 'pomodoro';

function App() {
  const staticData = useStaticData();
  const statistics = useStatistics(10);
  const [activeView, setActiveView] = useState<AppView>('pomodoro');
  const [activeMonitorView, setActiveMonitorView] = useState<'CPU' | 'RAM' | 'STORAGE'>('CPU');

  const cpuUsages = useMemo(
    () => statistics.map((stat) => stat.cpuUsage),
    [statistics]
  );
  const ramUsages = useMemo(
    () => statistics.map((stat) => stat.ramUsage),
    [statistics]
  );
  const storageUsages = useMemo(
    () => statistics.map((stat) => stat.storageUsage),
    [statistics]
  );
  const activeUsages = useMemo(() => {
    switch (activeMonitorView) {
      case 'CPU':
        return cpuUsages;
      case 'RAM':
        return ramUsages;
      case 'STORAGE':
        return storageUsages;
    }
  }, [activeMonitorView, cpuUsages, ramUsages, storageUsages]);

  return (
    <div className="w-screen h-screen bg-background flex flex-col overflow-hidden">
      {/* Header with Navigation */}
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">
            {activeView === 'pomodoro' ? '🍅 Focus Mode' : '📊 System Monitor'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === 'pomodoro' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('pomodoro')}
          >
            Focus
          </Button>
          <Button
            variant={activeView === 'monitor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('monitor')}
          >
            Monitor
          </Button>
        </div>
      </header>

      {/* Update Notification */}
      <UpdateNotification />

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        {activeView === 'pomodoro' ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <PomodoroTimer />
            <CommitHeatmap />
            <BlockRuleManager />
          </div>
        ) : (
          <div className="grid grid-cols-[280px_1fr] gap-4 h-full">
            {/* Sidebar - Resource Options */}
            <div className="flex flex-col gap-3">
              <SelectOption
                onClick={() => setActiveMonitorView('CPU')}
                title="CPU"
                view="CPU"
                subTitle={staticData?.cpuModel ?? ''}
                data={cpuUsages}
                activeView={activeMonitorView}
              />
              <SelectOption
                onClick={() => setActiveMonitorView('RAM')}
                title="RAM"
                view="RAM"
                subTitle={(staticData?.totalMemoryGB.toString() ?? '') + ' GB'}
                data={ramUsages}
                activeView={activeMonitorView}
              />
              <SelectOption
                onClick={() => setActiveMonitorView('STORAGE')}
                title="STORAGE"
                view="STORAGE"
                subTitle={(staticData?.totalStorage.toString() ?? '') + ' GB'}
                data={storageUsages}
                activeView={activeMonitorView}
              />
            </div>

            {/* Main Chart */}
            <Card className="flex-1 min-h-0">
              <CardHeader className="pb-2">
                <CardTitle>{activeMonitorView} Usage</CardTitle>
                <CardDescription>Real-time {activeMonitorView.toLowerCase()} utilization</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 pb-4">
                <div className="w-full h-full min-h-[200px]">
                  <Chart
                    selectedView={activeMonitorView}
                    data={activeUsages}
                    maxDataPoints={10}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function SelectOption(props: {
  title: string;
  view: 'CPU' | 'RAM' | 'STORAGE';
  subTitle: string;
  data: number[];
  onClick: () => void;
  activeView: 'CPU' | 'RAM' | 'STORAGE';
}) {
  const isActive = props.view === props.activeView;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:border-muted-foreground/50",
        isActive && "border-primary ring-1 ring-primary"
      )}
      onClick={props.onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">{props.title}</CardTitle>
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            {props.subTitle}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[60px]">
          <Chart selectedView={props.view} data={props.data} maxDataPoints={10} />
        </div>
      </CardContent>
    </Card>
  );
}

function useStaticData() {
  const [staticData, setStaticData] = useState<StaticData | null>(null);

  useEffect(() => {
    (async () => {
      setStaticData(await window.electron.getStaticData());
    })();
  }, []);

  return staticData;
}

export default App;
