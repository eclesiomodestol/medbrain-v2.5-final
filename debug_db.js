
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log("Checking RLS status on 'schedule' table...");

    // 1. Try to fetch schedule
    const { data: rows, error: selectError } = await supabase
        .from('schedule')
        .select('*')
        .limit(1);

    if (selectError) {
        console.error("SELECT Error (RLS likely ACTIVE):", JSON.stringify(selectError, null, 2));
    } else {
        console.log("SELECT Success. Rows found:", rows?.length);
    }

    // 2. Try to insert into schedule
    const dummyPayload = {
        id: "probe_" + Date.now(),
        day: "Segunda",
        period: "Manhã",
        subject_id: "test",
        front: "Probe"
    };

    console.log("Attempting INSERT...");
    const { data: insertData, error: insertError } = await supabase
        .from('schedule')
        .insert(dummyPayload)
        .select();

    if (insertError) {
        console.error("INSERT Error (RLS likely ACTIVE):", JSON.stringify(insertError, null, 2));
    } else {
        console.log("INSERT Success (RLS likely DISABLED or PERMISSIVE).");
        // Clean up
        if (insertData && insertData.length > 0) {
            await supabase.from('schedule').delete().eq('id', insertData[0].id);
        }
    }
}

run();
