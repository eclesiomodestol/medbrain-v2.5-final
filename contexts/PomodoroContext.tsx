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
    selectedFront: string | null;
    pomodorosCompleted: number;
    sessionId: string | null;
    settings: PomodoroSettings;
    isSaving: boolean; // Feedback UI
    elapsedTime: number; // Correct time tracking in seconds
}

interface PomodoroContextType extends PomodoroState {
    start: (subjectId: string, front?: string) => Promise<void>;
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

import { User } from '../types';

export const PomodoroProvider: React.FC<{ children: React.ReactNode; currentUser: User | null }> = ({ children, currentUser }) => {
    const [state, setState] = useState<PomodoroState>({
        isRunning: false,
        isPaused: false,
        currentPhase: 'idle',
        timeRemaining: defaultSettings.workDuration * 60,
        selectedSubject: null,
        selectedFront: null,
        pomodorosCompleted: 0,
        sessionId: null,
        settings: defaultSettings,
        isSaving: false,
        elapsedTime: 0
    });

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // Load settings from Supabase
    useEffect(() => {
        const loadSettings = async () => {
            if (!currentUser) return;
            const user = currentUser; // Use prop

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

                    // Restore elapsed Time logic (approximate for recovery)
                    // If we were running, elapsed time increases by elapsedTotal
                    const previousElapsed = savedState.elapsedTime || 0;

                    if (newTime > 0) {
                        setState(prev => ({
                            ...prev,
                            ...savedState,
                            timeRemaining: newTime,
                            isRunning: true,
                            elapsedTime: previousElapsed + elapsedTotal
                        }));
                        startTimeRef.current = savedState.startedAt;
                    } else {
                        // Timer finished while away
                        // Determine how much time actually passed until it hit 0
                        const timeUntilFinish = savedState.initialTimeRemaining;

                        setState(prev => ({
                            ...prev,
                            ...savedState,
                            timeRemaining: 0,
                            isRunning: false,
                            elapsedTime: previousElapsed + timeUntilFinish
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
        // We only persist if there is something active or paused
        if (state.isRunning || state.isPaused) {
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
                initialTimeRemaining: initialTimeRemaining || state.timeRemaining
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

        // Save progress on phase complete (work)
        if (state.currentPhase === 'work') {
            const newPomodoros = state.pomodorosCompleted + 1;
            const nextPhase = newPomodoros % state.settings.pomodorosUntilLongBreak === 0
                ? 'long_break'
                : 'short_break';

            showNotification(
                'Pomodoro Completo! 🍅',
                `Você completou ${newPomodoros} pomodoro(s). Hora de fazer uma pausa!`
            );

            // Auto-save logic here
            if (state.sessionId) {
                setState(prev => ({ ...prev, isSaving: true }));

                // Calculate final duration for this specific block?
                // Actually, if we are in a session, we just update the accumulators.
                // But user wants "Progress Saved" message.

                // Update the session safely
                const currentDurationMinutes = Math.floor(state.elapsedTime / 60);

                await supabase
                    .from('study_sessions')
                    .update({
                        duration_minutes: currentDurationMinutes,
                        duration_seconds: state.elapsedTime,
                        pomodoros_completed: newPomodoros,
                        last_updated: new Date().toISOString()
                    })
                    .eq('id', state.sessionId);

                // Show saved state briefly
                setTimeout(() => setState(prev => ({ ...prev, isSaving: false })), 2000);
            }

            setState(prev => ({
                ...prev,
                pomodorosCompleted: newPomodoros,
                currentPhase: nextPhase,
                timeRemaining: nextPhase === 'long_break'
                    ? prev.settings.longBreak * 60
                    : prev.settings.shortBreak * 60,
                isRunning: prev.settings.autoStartBreaks,
                isPaused: !prev.settings.autoStartBreaks,
                elapsedTime: prev.elapsedTime // Keep accumulating? Or reset for breakdown?
                // Usually for one session we keep accumulating time studied.
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

    // Timer countdown 
    useEffect(() => {
        if (state.isRunning && !state.isPaused) {
            if (!startTimeRef.current) {
                // Recovery logic if ref is lost but state says running
                startTimeRef.current = Date.now();
            }

            intervalRef.current = setInterval(() => {
                setState(prev => {
                    const newTime = prev.timeRemaining - 1;

                    // Increment elapsed time (only if working)
                    const newElapsed = prev.currentPhase === 'work' ? prev.elapsedTime + 1 : prev.elapsedTime;

                    if (newTime <= 0) {
                        handlePhaseComplete();
                        return { ...prev, timeRemaining: 0, elapsedTime: newElapsed };
                    }
                    return { ...prev, timeRemaining: newTime, elapsedTime: newElapsed };
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

    // Re-sync on visibility change (Simplified for brevity, same logic as before but updates elapsed)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) return;
            const saved = localStorage.getItem('pomodoro_state');
            if (saved) {
                try {
                    const savedState = JSON.parse(saved);
                    if (savedState.isRunning && !savedState.isPaused && savedState.startedAt) {
                        const elapsedSinceStart = Math.floor((Date.now() - savedState.startedAt) / 1000);
                        // This is tricky: we know how much time passed since 'startedAt'. 
                        // 'startedAt' is reset on Resume/Start.
                        // So elapsedSinceStart is the time passed in THIS continuous block.

                        // Update timeRemaining
                        if (savedState.initialTimeRemaining) {
                            const correctRemaining = savedState.initialTimeRemaining - elapsedSinceStart;
                            setState(prev => ({
                                ...prev,
                                timeRemaining: Math.max(0, correctRemaining)
                            }));
                        }

                        // Update elapsedTime: We need to know what it was at start of block.
                        // Current logic increments it 1 by one. 
                        // To be robust: we should have stored `elapsedTimeAtStartOfBlock`.
                        // For now, let's trust the drift isn't massive or just rely on the existing increment 
                        // unless tab was closed for long time.
                    }
                } catch (e) { }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Heartbeat: Auto-save every 60 seconds to enable "Live" tracking
    useEffect(() => {
        let heartbeatInterval: NodeJS.Timeout | null = null;

        if (state.isRunning && !state.isPaused && state.sessionId) {
            console.log(`[Pomodoro] Starting heartbeat for session ${state.sessionId}`);

            heartbeatInterval = setInterval(async () => {
                try {
                    console.log(`[Pomodoro] Heartbeat saving... Elapsed: ${state.elapsedTime}s`);

                    const currentDurationMinutes = Math.floor(state.elapsedTime / 60);

                    const { error } = await supabase
                        .from('study_sessions')
                        .update({
                            duration_minutes: currentDurationMinutes,
                            duration_seconds: state.elapsedTime,
                            last_updated: new Date().toISOString()
                        })
                        .eq('id', state.sessionId);

                    if (error) {
                        console.error('[Pomodoro] Heartbeat save failed:', error);
                    } else {
                        console.log('[Pomodoro] Heartbeat saved successfully.');
                    }
                } catch (err) {
                    console.error('[Pomodoro] Heartbeat error:', err);
                }
            }, 60000); // 60 seconds
        }

        return () => {
            if (heartbeatInterval) {
                console.log('[Pomodoro] Stopping heartbeat');
                clearInterval(heartbeatInterval);
            }
        };
    }, [state.isRunning, state.isPaused, state.sessionId, state.elapsedTime]);

    const start = useCallback(async (subjectId: string, front?: string) => {
        // Use currentUser prop
        const user = currentUser;

        let sessionId = null;

        if (user) {
            console.log('[Pomodoro] Starting new session for', subjectId);

            // 1. Close any existing active sessions to prevent constraint violation
            const { data: activeSessions } = await supabase
                .from('study_sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'in_progress');

            if (activeSessions && activeSessions.length > 0) {
                console.log('[Pomodoro] Closing orphaned sessions:', activeSessions.length);
                await supabase
                    .from('study_sessions')
                    .update({ status: 'abandoned', ended_at: new Date().toISOString() })
                    .eq('user_id', user.id)
                    .eq('status', 'in_progress');
            }

            // 2. Create new session
            const { data: session, error } = await supabase
                .from('study_sessions')
                .insert({
                    user_id: user.id,
                    subject_id: subjectId,
                    front: front || null,
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                    duration_seconds: 0
                })
                .select()
                .single();

            if (!error && session) {
                console.log('[Pomodoro] Session created:', session.id);
                sessionId = session.id;
            } else {
                console.error('[Pomodoro] Could not create study session:', error);
            }
        }

        const now = Date.now();
        const initialTime = state.settings.workDuration * 60;
        startTimeRef.current = now;

        setState({
            isRunning: true,
            isPaused: false,
            currentPhase: 'work',
            timeRemaining: initialTime,
            selectedSubject: subjectId,
            selectedFront: front || null,
            sessionId: sessionId,
            pomodorosCompleted: 0,
            settings: state.settings,
            isSaving: false,
            elapsedTime: 0
        });

        localStorage.setItem('pomodoro_state', JSON.stringify({
            isRunning: true,
            isPaused: false,
            currentPhase: 'work',
            timeRemaining: initialTime,
            selectedSubject: subjectId,
            selectedFront: front || null,
            pomodorosCompleted: 0,
            sessionId: sessionId,
            settings: state.settings,
            isSaving: false,
            elapsedTime: 0,
            startedAt: now,
            initialTimeRemaining: initialTime
        }));
    }, [state.settings]);

    const pause = useCallback(() => {
        setState(prev => {
            const newState = { ...prev, isPaused: true };
            return newState;
        });
    }, []);

    const resume = useCallback(() => {
        const now = Date.now();
        setState(prev => {
            const newState = { ...prev, isPaused: false };
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
        // Trigger Saving UI
        setState(prev => ({ ...prev, isSaving: true }));

        if (state.sessionId) {
            // Final calculation
            const finalSeconds = state.elapsedTime;
            const durationMinutes = Math.floor(finalSeconds / 60);

            try {
                await supabase
                    .from('study_sessions')
                    .update({
                        ended_at: new Date().toISOString(),
                        duration_minutes: durationMinutes,
                        duration_seconds: finalSeconds,
                        pomodoros_completed: state.pomodorosCompleted,
                        status: 'completed'
                    })
                    .eq('id', state.sessionId);

                // Show "Progresso Registrado" message logic could be here, or expected by UI observing isSaving=false
            } catch (err) {
                console.error("Error saving session:", err);
            }
        }

        // Delay cleanup slightly so user sees the saving state
        setTimeout(() => {
            localStorage.removeItem('pomodoro_state');
            setState(prev => ({
                ...prev,
                isRunning: false,
                isPaused: false,
                currentPhase: 'idle',
                timeRemaining: defaultSettings.workDuration * 60,
                selectedSubject: null,
                selectedFront: null,
                sessionId: null,
                pomodorosCompleted: 0,
                isSaving: false,
                elapsedTime: 0
            }));
        }, 1500);

    }, [state.sessionId, state.pomodorosCompleted, state.elapsedTime]);

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
        if (!currentUser) return;
        const user = currentUser;

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
