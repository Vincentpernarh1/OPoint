import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function checkTableStructure() {
    console.log('=== CHECKING OPOINT_CLOCK_LOGS TABLE STRUCTURE ===\n');

    // Get one record to see all columns
    const { data, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Available columns:');
    Object.keys(data).sort().forEach(key => {
        console.log(`  - ${key}: ${typeof data[key]} = ${data[key]}`);
    });
}

checkTableStructure().catch(console.error);
