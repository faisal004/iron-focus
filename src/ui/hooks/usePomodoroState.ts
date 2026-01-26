import { useEffect, useState } from 'react';

export function usePomodoroState(): PomodoroState {
    const [state, setState] = useState<PomodoroState>({
        session: null,
        remainingSeconds: 0,
        isPaused: false,
    });

    useEffect(() => {
        const unsub = window.electron.onPomodoroState((newState) => {
            setState(newState);
        });
        return unsub;
    }, []);

    return state;
}

export function usePomodoroEvents(callbacks: {
    onCompleted?: (session: PomodoroSession) => void;
    onFailed?: (session: PomodoroSession, reason: string) => void;
}) {
    useEffect(() => {
        const unsubs: (() => void)[] = [];

        if (callbacks.onCompleted) {
            unsubs.push(window.electron.onPomodoroCompleted(callbacks.onCompleted));
        }

        if (callbacks.onFailed) {
            unsubs.push(
                window.electron.onPomodoroFailed(({ session, reason }) => {
                    callbacks.onFailed?.(session, reason);
                })
            );
        }

        return () => unsubs.forEach((unsub) => unsub());
    }, [callbacks.onCompleted, callbacks.onFailed]);
}
