import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { generateDeviceFingerprint, getDeviceInfo } from '../utils/deviceFingerprint';

let currentSessionId: string | null = null;

export const useSessionManager = () => {
    const sessionStarted = useRef(false);
    const activityInterval = useRef<NodeJS.Timeout | null>(null);

    // Inicia uma nova sessão
    const startSession = async () => {
        if (sessionStarted.current) return currentSessionId;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const fingerprint = generateDeviceFingerprint();
            const deviceInfo = getDeviceInfo();

            // Tenta criar nova sessão
            const { data, error } = await supabase
                .from('user_sessions')
                .insert({
                    user_id: user.id,
                    device_fingerprint: fingerprint,
                    device_info: deviceInfo
                })
                .select()
                .single();

            if (error) {
                console.error('Error starting session:', error);
                return null;
            }

            currentSessionId = data.id;
            sessionStarted.current = true;

            // Atualiza atividade a cada 30 segundos
            activityInterval.current = setInterval(() => {
                updateActivity();
            }, 30000);

            // Marca sessão como inativa ao fechar a janela
            window.addEventListener('beforeunload', endSession);

            return data.id;
        } catch (error) {
            console.error('Error in startSession:', error);
            return null;
        }
    };

    // Atualiza timestamp de última atividade
    const updateActivity = async () => {
        if (!currentSessionId) return;

        try {
            await supabase
                .from('user_sessions')
                .update({ last_activity: new Date().toISOString() })
                .eq('id', currentSessionId);
        } catch (error) {
            console.error('Error updating activity:', error);
        }
    };

    // Encerra a sessão
    const endSession = async () => {
        if (!currentSessionId) return;

        try {
            await supabase
                .from('user_sessions')
                .update({
                    ended_at: new Date().toISOString(),
                    is_active: false
                })
                .eq('id', currentSessionId);

            if (activityInterval.current) {
                clearInterval(activityInterval.current);
            }

            window.removeEventListener('beforeunload', endSession);
            sessionStarted.current = false;
            currentSessionId = null;
        } catch (error) {
            console.error('Error ending session:', error);
        }
    };

    useEffect(() => {
        startSession();

        return () => {
            endSession();
        };
    }, []);

    return {
        sessionId: currentSessionId,
        updateActivity,
        endSession
    };
};

// Exporta função para obter session ID atual
export const getCurrentSessionId = () => currentSessionId;
