
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
// The key from supabase.ts
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log("Testing connection...");
  try {
    const { data, error } = await supabase.from('topics').select('*').limit(1);
    if (error) {
      console.error("Connection failed with error:", error);
    } else {
      console.log("Connection successful! Data:", data);
    }
  } catch (err) {
    console.error("Connection failed with exception:", err);
  }
}

testConnection();
