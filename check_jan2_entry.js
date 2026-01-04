import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function checkLatestEntry() {
    console.log('=== CHECKING LATEST ENTRY FOR JAN 2, 2026 ===\n');

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

    // Get all entries for Jan 2
    const { data: logs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .gte('created_at', '2026-01-02T00:00:00')
        .lte('created_at', '2026-01-05T00:00:00')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${logs.length} entries\n`);

    logs.forEach((log, index) => {
        console.log(`\n--- Entry ${index + 1} ---`);
        console.log(`ID: ${log.id}`);
        console.log(`Created: ${log.created_at}`);
        console.log(`Status: ${log.adjustment_status || 'None'}`);
        console.log(`Applied: ${log.adjustment_applied}`);
        console.log(`Reason: ${log.adjustment_reason || 'N/A'}`);
        
        console.log(`\nSession 1:`);
        console.log(`  clock_in: ${log.clock_in || 'null'}`);
        console.log(`  clock_out: ${log.clock_out || 'null'}`);
        console.log(`  requested_clock_in: ${log.requested_clock_in || 'null'}`);
        console.log(`  requested_clock_out: ${log.requested_clock_out || 'null'}`);
        
        console.log(`\nSession 2:`);
        console.log(`  clock_in_2: ${log.clock_in_2 || 'null'}`);
        console.log(`  clock_out_2: ${log.clock_out_2 || 'null'}`);
        console.log(`  requested_clock_in_2: ${log.requested_clock_in_2 || 'null'}`);
        console.log(`  requested_clock_out_2: ${log.requested_clock_out_2 || 'null'}`);

        // Calculate hours
        if (log.clock_in && log.clock_out) {
            const session1Hours = (new Date(log.clock_out) - new Date(log.clock_in)) / (1000 * 60 * 60);
            let session2Hours = 0;
            
            if (log.clock_in_2 && log.clock_out_2) {
                session2Hours = (new Date(log.clock_out_2) - new Date(log.clock_in_2)) / (1000 * 60 * 60);
            }
            
            console.log(`\nCalculated Hours:`);
            console.log(`  Session 1: ${session1Hours.toFixed(2)}h`);
            console.log(`  Session 2: ${session2Hours.toFixed(2)}h`);
            console.log(`  Total: ${(session1Hours + session2Hours).toFixed(2)}h`);
        }
    });
}

checkLatestEntry().catch(console.error);
