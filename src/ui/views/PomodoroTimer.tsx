import { useState, useCallback } from 'react';
import { usePomodoroState, usePomodoroEvents } from '../hooks/usePomodoroState';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { Button } from '../components/button';
import { Progress } from '../components/progress';

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function PomodoroTimer() {
    const state = usePomodoroState();
    const [isStarting, setIsStarting] = useState(false);
    const [showCompletedMessage, setShowCompletedMessage] = useState(false);
    const [showFailedMessage, setShowFailedMessage] = useState<string | null>(null);

    usePomodoroEvents({
        onCompleted: () => {
            setShowCompletedMessage(true);
            setTimeout(() => setShowCompletedMessage(false), 5000);
        },
        onFailed: (_session, reason) => {
            setShowFailedMessage(reason);
            setTimeout(() => setShowFailedMessage(null), 5000);
        },
    });

    const handleStart = useCallback(async () => {
        setIsStarting(true);
        try {
            await window.electron.startPomodoro();
        } finally {
            setIsStarting(false);
        }
    }, []);

    const handleStop = useCallback(() => {
        window.electron.stopPomodoro();
    }, []);

    const handlePause = useCallback(() => {
        window.electron.pausePomodoro();
    }, []);

    const handleResume = useCallback(() => {
        window.electron.resumePomodoro();
    }, []);

    const isRunning = state.session?.status === 'running';
    const totalSeconds = (state.session?.durationMinutes ?? 25) * 60;
    const progressPercent = isRunning
        ? ((totalSeconds - state.remainingSeconds) / totalSeconds) * 100
        : 0;

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">🍅 Pomodoro Timer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Timer Display */}
                <div className="text-center">
                    <div className="text-6xl font-mono font-bold text-foreground">
                        {formatTime(state.remainingSeconds)}
                    </div>
                    {state.session && (
                        <div className="mt-2 text-sm text-muted-foreground">
                            {state.isPaused ? 'Paused' : 'Focus time!'}
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                {isRunning && (
                    <Progress value={progressPercent} className="h-2" />
                )}

                {/* Controls */}
                <div className="flex justify-center gap-3">
                    {!isRunning ? (
                        <Button
                            onClick={handleStart}
                            disabled={isStarting}
                            className="px-8 py-3 text-lg"
                        >
                            {isStarting ? 'Starting...' : 'Start Focus'}
                        </Button>
                    ) : (
                        <>
                            {state.isPaused ? (
                                <Button onClick={handleResume} variant="default">
                                    Resume
                                </Button>
                            ) : (
                                <Button onClick={handlePause} variant="secondary">
                                    Pause
                                </Button>
                            )}
                            <Button onClick={handleStop} variant="destructive">
                                Stop
                            </Button>
                        </>
                    )}
                </div>

                {/* Session Stats */}
                {state.session && (
                    <div className="text-center text-sm text-muted-foreground">
                        <span>Violations: {state.session.ruleViolations}</span>
                        {state.session.blockedAppAttempts > 0 && (
                            <span className="ml-4 text-destructive">
                                Blocked: {state.session.blockedAppAttempts}
                            </span>
                        )}
                    </div>
                )}

                {/* Completed Message */}
                {showCompletedMessage && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center text-green-600">
                        🎉 Session completed! Great work!
                    </div>
                )}

                {/* Failed Message */}
                {showFailedMessage && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-red-600">
                        ❌ Session failed: {showFailedMessage}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
