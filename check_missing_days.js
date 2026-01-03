import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMissingDays() {
    console.log('🔍 Checking for placeholder entries in opoint_clock_logs...\n');
    
    // Check for entries from January 2, 2026
    const targetDate = '2026-01-02';
    
    const { data, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('date', targetDate)
        .order('employee_name');
    
    if (error) {
        console.error('❌ Error querying database:', error);
        return;
    }
    
    if (!data || data.length === 0) {
        console.log(`⚠️  No entries found for ${targetDate}`);
        return;
    }
    
    console.log(`✅ Found ${data.length} entries for ${targetDate}:\n`);
    
    data.forEach((entry, index) => {
        console.log(`Entry ${index + 1}:`);
        console.log(`  Employee: ${entry.employee_name} (${entry.employee_id})`);
        console.log(`  Company: ${entry.company_name}`);
        console.log(`  Date: ${entry.date}`);
        console.log(`  Clock In: ${entry.clock_in}`);
        console.log(`  Clock Out: ${entry.clock_out}`);
        console.log(`  Location: ${entry.location}`);
        console.log(`  Punches: ${JSON.stringify(entry.punches, null, 2)}`);
        console.log(`  Created At: ${entry.created_at}`);
        console.log('---');
    });
}

checkMissingDays().catch(console.error);
