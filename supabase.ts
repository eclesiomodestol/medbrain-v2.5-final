import { createClient } from '@supabase/supabase-js';

// Use environment variables in production, fallback to hardcoded values for development
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});
