import { useCallback } from 'react';
import { supabase } from '../supabase';
import { getCurrentSessionId } from './useSessionManager';

export const useActivityTracker = (module: string, userId?: string) => {
    // Rastreia uma ação genérica
    const trackAction = useCallback(async (actionType: string, details?: any) => {
        if (!userId) return;

        try {
            const sessionId = getCurrentSessionId();

            await supabase.from('activity_logs').insert({
                user_id: userId,
                session_id: sessionId,
                action_type: actionType,
                module: module,
                details: details || {}
            });
        } catch (error) {
            console.error('Error tracking action:', error);
        }
    }, [module, userId]);

    // Rastreia visualização de página
    const trackPageView = useCallback(async () => {
        await trackAction('page_view', { timestamp: new Date().toISOString() });
    }, [trackAction]);

    // Rastreia clique em botão
    const trackButtonClick = useCallback(async (buttonName: string) => {
        await trackAction('button_click', { button_name: buttonName });
    }, [trackAction]);

    // Rastreia submissão de formulário
    const trackFormSubmit = useCallback(async (formName: string, data?: any) => {
        await trackAction('form_submit', { form_name: formName, data });
    }, [trackAction]);

    // Rastreia download
    const trackDownload = useCallback(async (fileType: string, fileName?: string) => {
        if (!userId) return;

        try {
            const sessionId = getCurrentSessionId();

            // Registra no activity_logs
            await trackAction('download', { file_type: fileType, file_name: fileName });

            // Registra também no download_logs
            await supabase.from('download_logs').insert({
                user_id: userId,
                session_id: sessionId,
                file_type: fileType,
                file_name: fileName,
                module: module
            });
        } catch (error) {
            console.error('Error tracking download:', error);
        }
    }, [module, userId, trackAction]);

    return {
        trackAction,
        trackPageView,
        trackButtonClick,
        trackFormSubmit,
        trackDownload
    };
};
