
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log(`URL: ${SUPABASE_URL}`);
  
  try {
    // Attempt to get the session - this doesn't require a table and verifies connectivity/keys
    // Note: This relies on the key being valid format.
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Connection failed:', error.message);
      process.exit(1);
    } else {
        console.log('Connection successful!');
        // Usually anonymous key allows reading session (even if null)
        console.log('Supabase client initialized and responded.');
        process.exit(0);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

testConnection();
