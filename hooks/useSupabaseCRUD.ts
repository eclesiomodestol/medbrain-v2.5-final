
import { useState, useCallback } from 'react';
import { PostgrestError } from '@supabase/supabase-js';

export const useSupabaseCRUD = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<PostgrestError | Error | null>(null);

    const handleSupabaseError = useCallback((err: any, context: string) => {
        console.error(`Erro em ${context}:`, err);
        setError(err);

        let activeAlert = true; // Flag to prevent double alerts if handled externally? No, simple alert for now.

        if (err.name === 'TypeError' && err.message === 'Load failed') {
            alert(`🛑 Conexão Bloqueada (${context})!\n\nSeu navegador ou uma extensão (AdBlock, Privacy Badger, etc) está bloqueando a conexão com o banco de dados.\n\nSOLUÇÃO:\n1. Desative o AdBlock para este site.\n2. Verifique se seu Firewall permite conexões com supabase.co.`);
        } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('Network request failed'))) {
            alert(`Erro de conexão em ${context}: Verifique sua internet.`);
        } else {
            alert(`Erro em ${context}: ${err.message || 'Erro desconhecido'}`);
        }
    }, []);

    const executeInfo = useCallback(async <T>(
        operation: () => Promise<{ data: T | null; error: any }>,
        context: string,
        onSuccess?: (data: T) => void,
        onError?: (error: any) => void
    ) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await operation();
            if (error) {
                handleSupabaseError(error, context);
                if (onError) onError(error);
                return { success: false, error };
            }
            if (onSuccess && data !== null) onSuccess(data);
            return { success: true, data };
        } catch (err: any) {
            handleSupabaseError(err, context);
            if (onError) onError(err);
            return { success: false, error: err };
        } finally {
            setLoading(false);
        }
    }, [handleSupabaseError]);

    return { executeInfo, loading, error, handleSupabaseError };
};
