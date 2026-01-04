import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function findAllEntries() {
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    console.log('Checking ALL clock logs for Renata...\n');
    
    const { data: all } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .order('clock_in', { ascending: true });
    
    console.log(`Total entries: ${all?.length || 0}\n`);
    
    all?.forEach((entry, idx) => {
        const clockIn = entry.clock_in || entry.requested_clock_in;
        const clockOut = entry.clock_out || entry.requested_clock_out;
        
        if (!clockIn) return;
        
        const date = new Date(clockIn).toISOString().split('T')[0];
        let hours = 0;
        
        if (clockOut) {
            hours = (new Date(clockOut) - new Date(clockIn)) / (1000 * 60 * 60);
        }
        
        console.log(`${idx+1}. ${date}: ${hours.toFixed(2)}h (${entry.adjustment_status || 'Normal'}, Applied: ${entry.adjustment_applied})`);
    });
    
    // Check for expense claims
    console.log('\n\nChecking for expense claims...');
    
    const tables = ['opoint_expense_claims', 'expense_claims', 'expenses'];
    
    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', user.id);
        
        if (!error && data && data.length > 0) {
            console.log(`\n✅ Found ${data.length} in ${table}:`);
            data.forEach(claim => {
                console.log(`   ${claim.created_at}: GHS ${claim.amount} - ${claim.status}`);
            });
        }
    }
}

findAllEntries();
