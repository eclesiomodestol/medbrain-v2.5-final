
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log("Debugging Internships Schema...");

    // 2. Insert Probing with 'date' and 'hour'
    const probe = {
        id: "probe_full_" + Date.now(),
        title: "Probe Full",
        local: "Test Full",
        evolution_model: "{}",
        status: "Em Andamento",
        date: "2025-02-20", // Suspected culprit
        hour: "08:00"       // Suspected culprit
    };

    console.log("Attempting INSERT with date/hour...");
    const { error: insertError } = await supabase.from('internships').insert(probe);
    if (insertError) {
        console.error("INSERT ERROR:", JSON.stringify(insertError, null, 2));
    } else {
        console.log("INSERT SUCCESS");
        await supabase.from('internships').delete().eq('id', probe.id);
    }
}

run();
