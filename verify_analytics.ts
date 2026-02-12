
import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback values from supabase.ts
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

async function verifyAnalytics() {
    console.log('Verifying Analytics Setup (Retry)...');
    console.log(`URL: ${SUPABASE_URL}`);

    // 1. Get a valid user ID (UUID)
    let userId = '00000000-0000-0000-0000-000000000000'; // Default valid UUID

    console.log('\n--- Fetching a valid User ID ---');
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (users && users.length > 0) {
            userId = users[0].id;
            console.log('✅ Found existing user ID:', userId);
        } else {
            console.log('⚠️ No users found in public.users. Using dummy UUID:', userId);
            // If foreign key constraint exists, this might fail if we don't insert the user first.
        }
        if (error) {
            console.log('Error fetching user:', error.message);
        }
    } catch (e: any) {
        console.error('❌ Error fetching users:', e.message);
    }

    // 2. Try to insert a test session
    console.log('\n--- Simulating Session Creation ---');
    let sessionId: string | null = null;

    try {
        const { data: newSession, error: insertError } = await supabase
            .from('user_sessions')
            .insert({
                user_id: userId,
                device_fingerprint: 'test-fingerprint',
                device_info: { type: 'test-script' },
                is_active: true
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ Failed to insert test session:', insertError.message);
            if (insertError.code === '23503') console.log('❌ Foreign Key Violation. User ID likely invalid.');
        } else {
            console.log('✅ Successfully created test session:', newSession.id);
            sessionId = newSession.id;
        }
    } catch (e: any) {
        console.error('❌ Unexpected error inserting session:', e.message);
    }

    // 3. Try to track an activity
    if (sessionId) {
        console.log('\n--- Simulating Activity Tracking ---');
        try {
            const { error: activityError } = await supabase
                .from('activity_logs')
                .insert({
                    user_id: userId,
                    session_id: sessionId,
                    action_type: 'test_verification',
                    module: 'verification_script',
                    details: { timestamp: new Date().toISOString() }
                });

            if (activityError) {
                console.error('❌ Failed to track activity:', activityError.message);
            } else {
                console.log('✅ Successfully tracked test activity.');
            }
        } catch (e: any) {
            console.error('❌ Unexpected error tracking activity:', e.message);
        }

        // Cleanup
        console.log('\n--- Cleanup ---');
        try {
            const { error: deleteError } = await supabase
                .from('user_sessions')
                .delete()
                .eq('id', sessionId);
            if (deleteError) console.log('⚠️ Cleanup failed (RLS?):', deleteError.message);
            else console.log('✅ Test session cleaned up.');
        } catch (e) {
            console.log('⚠️ Cleanup skipped/failed.');
        }
    }

    console.log('\nVerification Complete.');
}

verifyAnalytics().catch(console.error);
