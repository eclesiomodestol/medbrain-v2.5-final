
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testInsert() {
    console.log("Testing INSERT...");
    const newTopic = {
        id: `test_${Date.now()}`,
        title: 'Test Topic via Node',
        subject_id: 'cc3', // valid subject
        date: '2026-02-18',
        status: 'Pendente',
        tag: 'PR1'
    };

    try {
        const { data, error } = await supabase.from('topics').insert(newTopic);
        if (error) {
            console.error("INSERT failed with error:", error);
        } else {
            console.log("INSERT successful! Data:", data);
        }
    } catch (err) {
        console.error("INSERT failed with exception:", err);
    }
}

testInsert();
