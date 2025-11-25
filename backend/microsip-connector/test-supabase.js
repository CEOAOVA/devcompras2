require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key Length:', supabaseKey ? supabaseKey.length : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    try {
        const { data, error } = await supabase.from('microsip.etl_sync_log').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase Error:', error.message);
            console.error('Details:', error);
        } else {
            console.log('✅ Supabase Connection Successful!');
            console.log('Table etl_sync_log exists and is accessible.');
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err.message);
    }
}

test();
