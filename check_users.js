
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log("Checking users...");
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error("Error fetching users:", JSON.stringify(error, null, 2));
    } else {
        console.log("Users found:", data.length);
        console.log(JSON.stringify(data, null, 2));
    }
}

run();
