
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPermissions() {
    console.log("Testing CRUD permissions on 'schedule' table...");

    // 1. Insert
    const testId = Math.random().toString(36).substr(2, 9);
    console.log(`1. Attempting INSERT with ID: ${testId}`);

    const { error: insertError } = await supabase.from('schedule').insert({
        id: testId,
        day: 'Segunda',
        period: 'Manhã',
        subject_id: 'iesc7', // using a known ID from previous probe to avoid FK error
        front: 'TESTE_CRUD'
    });

    if (insertError) {
        console.error("INSERT Failed:", insertError);
        return;
    } else {
        console.log("INSERT Success");
    }

    // 2. Update
    console.log("2. Attempting UPDATE...");
    const { error: updateError } = await supabase.from('schedule').update({ front: 'TESTE_UPDATED' }).eq('id', testId);
    if (updateError) console.error("UPDATE Failed:", updateError);
    else console.log("UPDATE Success");

    // 3. Delete
    console.log("3. Attempting DELETE...");
    const { error: deleteError } = await supabase.from('schedule').delete().eq('id', testId);

    if (deleteError) {
        console.error("DELETE Failed:", deleteError);
    } else {
        console.log("DELETE Success");
    }
}

testPermissions();
