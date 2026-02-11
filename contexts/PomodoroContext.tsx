import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';

interface PomodoroSettings {
    workDuration: number;
    shortBreak: number;
    longBreak: number;
    pomodorosUntilLongBreak: number;
    autoStartBreaks: boolean;
    autoStartPomodoros: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
}

interface PomodoroState {
    isRunning: boolean;
    isPaused: boolean;
    currentPhase: 'work' | 'short_break' | 'long_break' | 'idle';
    timeRemaining: number; // in seconds
    selectedSubject: string | null;
    pomodorosCompleted: number;
    sessionId: string | null;
    settings: PomodoroSettings;
}

interface PomodoroContextType extends PomodoroState {
    start: (subjectId: string) => Promise<void>;
    pause: () => void;
    resume: () => void;
    stop: () => Promise<void>;
    reset: () => void;
    skipPhase: () => void;
    updateSettings: (settings: Partial<PomodoroSettings>) => Promise<void>;
}

const defaultSettings: PomodoroSettings = {
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    pomodorosUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    soundEnabled: true,
    notificationsEnabled: true
};

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const usePomodoroTimer = () => {
    const context = useContext(PomodoroContext);
    if (!context) {
        throw new Error('usePomodoroTimer must be used within PomodoroProvider');
    }
    return context;
};

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<PomodoroState>({
        isRunning: false,
        isPaused: false,
        currentPhase: 'idle',
        timeRemaining: defaultSettings.workDuration * 60,
        selectedSubject: null,
        pomodorosCompleted: 0,
        sessionId: null,
        settings: defaultSettings
    });

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // Load settings from Supabase
    useEffect(() => {
        const loadSettings = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('pomodoro_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data && !error) {
                setState(prev => ({
                    ...prev,
                    settings: {
                        workDuration: data.work_duration,
                        shortBreak: data.short_break,
                        longBreak: data.long_break,
                        pomodorosUntilLongBreak: data.pomodoros_until_long_break,
                        autoStartBreaks: data.auto_start_breaks,
                        autoStartPomodoros: data.auto_start_pomodoros,
                        soundEnabled: data.sound_enabled,
                        notificationsEnabled: data.notifications_enabled
                    }
                }));
            }
        };

        loadSettings();
    }, []);

    // Load state from localStorage on mount & handle recovery
    useEffect(() => {
        const saved = localStorage.getItem('pomodoro_state');
        if (saved) {
            try {
                const savedState = JSON.parse(saved);

                // If checking persistence for background running
                if (savedState.isRunning && !savedState.isPaused && savedState.startedAt && savedState.initialTimeRemaining) {
                    const elapsedTotal = Math.floor((Date.now() - savedState.startedAt) / 1000);
                    const correctRemaining = savedState.initialTimeRemaining - elapsedTotal;
                    const newTime = Math.max(0, correctRemaining);

                    if (newTime > 0) {
                        setState(prev => ({
                            ...prev,
                            ...savedState,
                            timeRemaining: newTime,
                            isRunning: true
                        }));
                        startTimeRef.current = savedState.startedAt;
                    } else {
                        // Timer finished while away
                        setState(prev => ({
                            ...prev,
                            ...savedState,
                            timeRemaining: 0,
                            isRunning: false
                        }));
                    }
                } else {
                    // Paused or idle state
                    setState(prev => ({
                        ...prev,
                        ...savedState
                    }));
                    if (savedState.startedAt) {
                        startTimeRef.current = savedState.startedAt;
                    }
                }
            } catch (error) {
                console.error('Error loading pomodoro state:', error);
            }
        }
    }, []);

    // Save state to localStorage on change
    useEffect(() => {
        if (state.isRunning || state.isPaused) {
            localStorage.setItem('pomodoro_state', JSON.stringify({
                ...state,
                startedAt: startTimeRef.current,
                // Ensure we persist initialTimeRemaining if it exists in previous state/storage
                // actually we should store it in state if we want to persist it easily,
                // but since it's not in the interface, we rely on start/resume to put it there.
                // The issue: if we just dump `...state`, we lose `initialTimeRemaining` if it's not a property of state.
                // Fix: Read it from current localStorage to preserve it? 
                // Or better: Add it to state interface? No, let's keep interface clean.
                // We'll trust that start/resume set it.
                // But wait, `localStorage.setItem` in this effect OVERWRITES the one from `start`?
                // YES. This is the bug. 
                // If `start` writes `initialTimeRemaining`, and then this effect runs (due to state change),
                // and writes `...state`, `initialTimeRemaining` is LOST if it's not in `state`.
            }));

            // To fix the overwrite issue:
            // We need to fetch the existing 'initialTimeRemaining' from LS and keep it.
            const existing = localStorage.getItem('pomodoro_state');
            let initialTimeRemaining = 0;
            if (existing) {
                try {
                    const parsed = JSON.parse(existing);
                    if (parsed.initialTimeRemaining) initialTimeRemaining = parsed.initialTimeRemaining;
                } catch (e) { }
            }

            localStorage.setItem('pomodoro_state', JSON.stringify({
                ...state,
                startedAt: startTimeRef.current,
                initialTimeRemaining: initialTimeRemaining || state.timeRemaining // Fallback
            }));
        }
    }, [state]);

    const playNotificationSound = useCallback(() => {
        if (state.settings.soundEnabled) {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(err => console.log('Audio play failed:', err));
        }
    }, [state.settings.soundEnabled]);

    const showNotification = useCallback((title: string, body: string) => {
        if (state.settings.notificationsEnabled && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body, icon: '/tomato-icon.png' });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, { body, icon: '/tomato-icon.png' });
                    }
                });
            }
        }
    }, [state.settings.notificationsEnabled]);

    const handlePhaseComplete = useCallback(async () => {
        playNotificationSound();

        if (state.currentPhase === 'work') {
            const newPomodoros = state.pomodorosCompleted + 1;
            const nextPhase = newPomodoros % state.settings.pomodorosUntilLongBreak === 0
                ? 'long_break'
                : 'short_break';

            showNotification(
                'Pomodoro Completo! 🍅',
                `Você completou ${newPomodoros} pomodoro(s). Hora de fazer uma pausa!`
            );

            setState(prev => ({
                ...prev,
                pomodorosCompleted: newPomodoros,
                currentPhase: nextPhase,
                timeRemaining: nextPhase === 'long_break'
                    ? prev.settings.longBreak * 60
                    : prev.settings.shortBreak * 60,
                isRunning: prev.settings.autoStartBreaks,
                isPaused: !prev.settings.autoStartBreaks
            }));
        } else {
            showNotification(
                'Pausa Completa! ☕',
                'Hora de voltar ao trabalho!'
            );

            setState(prev => ({
                ...prev,
                currentPhase: 'work',
                timeRemaining: prev.settings.workDuration * 60,
                isRunning: prev.settings.autoStartPomodoros,
                isPaused: !prev.settings.autoStartPomodoros
            }));
        }
    }, [state, playNotificationSound, showNotification]);

    // Timer countdown with drift correction via visibility re-sync
    useEffect(() => {
        if (state.isRunning && !state.isPaused) {
            if (!startTimeRef.current) {
                const saved = localStorage.getItem('pomodoro_state');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.startedAt) startTimeRef.current = parsed.startedAt;
                }
                if (!startTimeRef.current) startTimeRef.current = Date.now();
            }

            intervalRef.current = setInterval(() => {
                setState(prev => {
                    const newTime = prev.timeRemaining - 1;
                    if (newTime <= 0) {
                        handlePhaseComplete();
                        return { ...prev, timeRemaining: 0 };
                    }
                    return { ...prev, timeRemaining: newTime };
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [state.isRunning, state.isPaused, handlePhaseComplete]);

    // Re-sync on visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) return;

            const saved = localStorage.getItem('pomodoro_state');
            if (saved) {
                try {
                    const savedState = JSON.parse(saved);
                    // Critical Drift Correction
                    if (savedState.isRunning && !savedState.isPaused && savedState.startedAt && savedState.initialTimeRemaining) {
                        const elapsedTotal = Math.floor((Date.now() - savedState.startedAt) / 1000);
                        const correctRemaining = savedState.initialTimeRemaining - elapsedTotal;

                        // Only update if discrepancy is large (>2s) to avoid stutter
                        setState(prev => {
                            if (Math.abs(prev.timeRemaining - correctRemaining) > 2) {
                                return { ...prev, timeRemaining: Math.max(0, correctRemaining) };
                            }
                            return prev;
                        });
                    }
                } catch (e) { console.error(e); }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const start = useCallback(async (subjectId: string) => {
        const { data: { user } } = await supabase.auth.getUser();

        let sessionId = null;

        if (user) {
            const { data: session, error } = await supabase
                .from('study_sessions')
                .insert({
                    user_id: user.id,
                    subject_id: subjectId,
                    status: 'in_progress',
                    started_at: new Date().toISOString()
                })
                .select()
                .single();

            if (!error && session) {
                sessionId = session.id;
            } else {
                console.warn('Could not create study session:', error);
            }
        }

        const now = Date.now();
        const initialTime = state.settings.workDuration * 60;
        startTimeRef.current = now;

        setState(prev => {
            const newState = {
                ...prev,
                isRunning: true,
                isPaused: false,
                currentPhase: 'work',
                timeRemaining: initialTime,
                selectedSubject: subjectId,
                sessionId: sessionId,
                pomodorosCompleted: 0
            };
            // Save initial state logic
            localStorage.setItem('pomodoro_state', JSON.stringify({
                ...newState,
                startedAt: now,
                initialTimeRemaining: initialTime
            }));
            return newState;
        });
    }, [state.settings.workDuration]);

    const pause = useCallback(() => {
        setState(prev => {
            const newState = { ...prev, isPaused: true };
            // On pause, we don't start/stop anchor times, just update state.
            // The effect at [state] will handle storage.
            return newState;
        });
    }, []);

    const resume = useCallback(() => {
        const now = Date.now();
        setState(prev => {
            const newState = { ...prev, isPaused: false };
            // RESUME: We must reset the anchor because "Time Elapsed" logic depends on continuous run.
            // New Anchor = NOW.
            // New Initial Time = Current Remaining.
            localStorage.setItem('pomodoro_state', JSON.stringify({
                ...newState,
                startedAt: now,
                initialTimeRemaining: prev.timeRemaining
            }));
            startTimeRef.current = now;
            return newState;
        });
    }, []);

    const stop = useCallback(async () => {
        if (state.sessionId) {
            const durationMinutes = Math.floor((Date.now() - startTimeRef.current) / 60000);

            await supabase
                .from('study_sessions')
                .update({
                    ended_at: new Date().toISOString(),
                    duration_minutes: durationMinutes,
                    pomodoros_completed: state.pomodorosCompleted,
                    status: 'completed'
                })
                .eq('id', state.sessionId);
        }

        localStorage.removeItem('pomodoro_state');
        setState(prev => ({
            ...prev,
            isRunning: false,
            isPaused: false,
            currentPhase: 'idle',
            timeRemaining: 0,
            selectedSubject: null,
            sessionId: null,
            pomodorosCompleted: 0
        }));
    }, [state.sessionId, state.pomodorosCompleted]);

    const reset = useCallback(() => {
        setState(prev => ({
            ...prev,
            timeRemaining: prev.currentPhase === 'work'
                ? prev.settings.workDuration * 60
                : prev.currentPhase === 'short_break'
                    ? prev.settings.shortBreak * 60
                    : prev.settings.longBreak * 60,
            isPaused: false
        }));
    }, []);

    const skipPhase = useCallback(() => {
        handlePhaseComplete();
    }, [handlePhaseComplete]);

    const updateSettings = useCallback(async (newSettings: Partial<PomodoroSettings>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updatedSettings = { ...state.settings, ...newSettings };

        await supabase
            .from('pomodoro_settings')
            .upsert({
                user_id: user.id,
                work_duration: updatedSettings.workDuration,
                short_break: updatedSettings.shortBreak,
                long_break: updatedSettings.longBreak,
                pomodoros_until_long_break: updatedSettings.pomodorosUntilLongBreak,
                auto_start_breaks: updatedSettings.autoStartBreaks,
                auto_start_pomodoros: updatedSettings.autoStartPomodoros,
                sound_enabled: updatedSettings.soundEnabled,
                notifications_enabled: updatedSettings.notificationsEnabled
            });

        setState(prev => ({ ...prev, settings: updatedSettings }));
    }, [state.settings]);

    return (
        <PomodoroContext.Provider
            value={{
                ...state,
                start,
                pause,
                resume,
                stop,
                reset,
                skipPhase,
                updateSettings
            }}
        >
            {children}
        </PomodoroContext.Provider>
    );
};
