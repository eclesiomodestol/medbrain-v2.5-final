
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectSchema() {
    console.log("Inspecting 'schedule' table...");

    const { data, error } = await supabase.from('schedule').select('*').limit(1);

    if (error) {
        console.error("Error fetching schedule:", error);
    } else {
        if (data && data.length > 0) {
            console.log("Sample row:", data[0]);
            console.log("ID Type:", typeof data[0].id);
            console.log("ID Value:", data[0].id);
        } else {
            console.log("Table is empty. Attempting insert to test ID type.");
            const testId = Math.random().toString(36).substr(2, 9);
            const { error: insertError } = await supabase.from('schedule').insert({
                id: testId,
                day: 'Segunda',
                period: 'Manhã',
                subject_id: '00000000-0000-0000-0000-000000000000' // May fail on FK, but error will tell us
            });

            if (insertError) {
                console.log("Insert Error:", insertError);
            } else {
                console.log("Insert successful with string ID:", testId);
                // cleanup
                await supabase.from('schedule').delete().eq('id', testId);
            }
        }
    }
}

inspectSchema();
