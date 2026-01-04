import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function checkCurrentState() {
    console.log('=== CHECKING CURRENT STATE OF JANUARY 2026 ENTRIES ===\n');

    const { data: logs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .gte('clock_in', '2026-01-01T00:00:00')
        .lt('clock_in', '2026-02-01T00:00:00')
        .or('clock_in.gte.2026-01-01T00:00:00,requested_clock_in.gte.2026-01-01T00:00:00');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${logs.length} entries\n`);

    logs.forEach((log, index) => {
        const date = log.clock_in || log.requested_clock_in;
        const dateStr = date ? new Date(date).toISOString().split('T')[0] : 'N/A';
        
        console.log(`\n=== Entry ${index + 1}: ${dateStr} - ${log.employee_name} ===`);
        console.log(`ID: ${log.id}`);
        console.log('\nAdjustment Fields:');
        console.log(`  adjustment_status: ${log.adjustment_status}`);
        console.log(`  adjustment_applied: ${log.adjustment_applied}`);
        console.log(`  adjustment_reason: ${log.adjustment_reason}`);
        console.log(`  adjustment_requested_at: ${log.adjustment_requested_at}`);
        console.log(`  adjustment_reviewed_by: ${log.adjustment_reviewed_by}`);
        console.log(`  adjustment_reviewed_at: ${log.adjustment_reviewed_at}`);
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

checkCurrentState().catch(console.error);
