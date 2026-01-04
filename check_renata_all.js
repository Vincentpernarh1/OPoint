import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function checkRenataEntries() {
    console.log('=== CHECKING ALL RENATA ENTRIES ===\n');

    // Get Renata's user ID
    const { data: user } = await supabase
        .from('opoint_users')
        .select('id')
        .eq('email', 'Renata@gmail.com')
        .single();

    if (!user) {
        console.error('User not found');
        return;
    }

    console.log(`Renata ID: ${user.id}\n`);

    // Get ALL her entries
    const { data: logs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${logs.length} total entries\n`);

    logs.forEach((log, index) => {
        const date = log.clock_in || log.requested_clock_in || 'NO DATE';
        const dateStr = date !== 'NO DATE' ? new Date(date).toISOString().split('T')[0] : 'NO DATE';
        
        console.log(`\n=== Entry ${index + 1}: ${dateStr} ===`);
        console.log(`ID: ${log.id}`);
        console.log(`Created: ${log.created_at}`);
        console.log('\nAdjustment Fields:');
        console.log(`  status: ${log.adjustment_status}`);
        console.log(`  applied: ${log.adjustment_applied}`);
        console.log(`  reason: ${log.adjustment_reason}`);
        console.log(`  requested_at: ${log.adjustment_requested_at}`);
        console.log('\nClock Times:');
        console.log(`  clock_in: ${log.clock_in}`);
        console.log(`  clock_out: ${log.clock_out}`);
        console.log('\nRequested Times:');
        console.log(`  requested_clock_in: ${log.requested_clock_in}`);
        console.log(`  requested_clock_out: ${log.requested_clock_out}`);
        console.log(`  requested_clock_in_2: ${log.requested_clock_in_2}`);
        console.log(`  requested_clock_out_2: ${log.requested_clock_out_2}`);
    });
}

checkRenataEntries().catch(console.error);
