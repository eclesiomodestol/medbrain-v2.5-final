
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log("Debugging Schedule Deletion...");

    // 1. Fetch all schedule items to find one to delete
    const { data: items, error: fetchError } = await supabase.from('schedule').select('*');

    if (fetchError) {
        console.error("FETCH ERROR:", JSON.stringify(fetchError, null, 2));
        return;
    }

    console.log(`Found ${items.length} items.`);

    // Find the test item added by browser agent
    const testItem = items.find(i => i.front === 'TESTE DELETAR');

    if (!testItem) {
        console.log("Test item 'TESTE DELETAR' not found in DB. Was it never saved?");
        return;
    }

    console.log("Found test item:", testItem);

    // 2. Try to delete it
    console.log(`Attempting to delete item ${testItem.id}...`);
    const { error: deleteError, count } = await supabase
        .from('schedule')
        .delete({ count: 'exact' })
        .eq('id', testItem.id);

    if (deleteError) {
        console.error("DELETE ERROR:", JSON.stringify(deleteError, null, 2));
    } else {
        console.log("DELETE SUCCESS. Count:", count);
    }
}

run();
