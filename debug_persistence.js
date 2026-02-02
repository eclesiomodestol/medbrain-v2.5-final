
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log("Debugging Internships Table...");

    // 1. Fetch
    const { data, error } = await supabase.from('internships').select('*').limit(1);

    if (error) {
        console.error("FETCH ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("FETCH SUCCESS. Count:", data.length);
    }

    // 2. Insert Probing
    const probe = {
        id: "probe_" + Date.now(),
        title: "Probe",
        local: "Test",
        evolution_model: "{}",
        status: "Em Andamento" // Check enum consistency
    };

    const { error: insertError } = await supabase.from('internships').insert(probe);
    if (insertError) {
        console.error("INSERT ERROR:", JSON.stringify(insertError, null, 2));
    } else {
        console.log("INSERT SUCCESS");
        // Clean
        await supabase.from('internships').delete().eq('id', probe.id);
    }
}

run();
