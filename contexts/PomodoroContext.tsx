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
        timeRemaining: defaultSettings.workDuration * 60, // Start with 25:00 displayed
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

    // Load state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('pomodoro_state');
        if (saved) {
            try {
                const savedState = JSON.parse(saved);
                const elapsed = (Date.now() - savedState.startedAt) / 1000;
                const newTime = Math.max(0, savedState.timeRemaining - elapsed);

                if (newTime > 0 && savedState.isRunning) {
                    setState(prev => ({
                        ...prev,
                        ...savedState,
                        timeRemaining: Math.floor(newTime),
                        isRunning: true
                    }));
                    startTimeRef.current = Date.now() - (savedState.timeRemaining - newTime) * 1000;
                }
            } catch (error) {
                console.error('Error loading pomodoro state:', error);
            }
        }
    }, []);

    // Save state to localStorage
    useEffect(() => {
        if (state.isRunning || state.isPaused) {
            localStorage.setItem('pomodoro_state', JSON.stringify({
                ...state,
                startedAt: startTimeRef.current
            }));
        }
    }, [state]);

    // Timer countdown
    useEffect(() => {
        if (state.isRunning && !state.isPaused) {
            intervalRef.current = setInterval(() => {
                setState(prev => {
                    const newTime = prev.timeRemaining - 1;
                    if (newTime <= 0) {
                        handlePhaseComplete();
                        return prev;
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
    }, [state.isRunning, state.isPaused]);

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

    const start = useCallback(async (subjectId: string) => {
        const { data: { user } } = await supabase.auth.getUser();

        let sessionId = null;

        // Only create database session if user is authenticated
        if (user) {
            const { data: session, error } = await supabase
                .from('study_sessions')
                .insert({
                    user_id: user.id,
                    subject_id: subjectId,
                    status: 'in_progress'
                })
                .select()
                .single();

            if (!error && session) {
                sessionId = session.id;
            } else {
                console.warn('Could not create study session:', error);
            }
        } else {
            console.log('No user session - timer will work locally without database sync');
        }

        startTimeRef.current = Date.now();
        setState(prev => ({
            ...prev,
            isRunning: true,
            isPaused: false,
            currentPhase: 'work',
            timeRemaining: prev.settings.workDuration * 60,
            selectedSubject: subjectId,
            sessionId: sessionId,
            pomodorosCompleted: 0
        }));
    }, []);

    const pause = useCallback(() => {
        setState(prev => ({ ...prev, isPaused: true }));
    }, []);

    const resume = useCallback(() => {
        setState(prev => ({ ...prev, isPaused: false }));
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
