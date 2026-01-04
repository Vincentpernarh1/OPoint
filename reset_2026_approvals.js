import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function reset2026Approvals() {
    console.log('=== RESETTING APPROVED ENTRIES IN JANUARY 2026 ===\n');

    // Get all approved entries in January 2026
    const { data: approvedLogs, error: fetchError } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('adjustment_applied', true)
        .eq('adjustment_status', 'Approved')
        .gte('clock_in', '2026-01-01T00:00:00')
        .lt('clock_in', '2026-02-01T00:00:00');

    if (fetchError) {
        console.error('Error fetching approved logs:', fetchError);
        return;
    }

    console.log(`Found ${approvedLogs.length} approved entries in January 2026\n`);

    if (approvedLogs.length === 0) {
        console.log('No entries to reset');
        return;
    }

    // Display entries to be reset
    console.log('Entries to reset:');
    approvedLogs.forEach((log, index) => {
        const date = log.clock_in ? new Date(log.clock_in).toISOString().split('T')[0] : 'N/A';
        const clockIn = log.clock_in ? new Date(log.clock_in).toISOString() : 'N/A';
        const clockOut = log.clock_out ? new Date(log.clock_out).toISOString() : 'N/A';
        console.log(`${index + 1}. ${date} - ${log.employee_name}`);
        console.log(`   ID: ${log.id}`);
        console.log(`   Times: ${clockIn} to ${clockOut}`);
    });

    console.log('\nProceeding with reset...\n');

    let resetCount = 0;
    let failedCount = 0;

    for (const log of approvedLogs) {
        const date = log.clock_in ? new Date(log.clock_in).toISOString().split('T')[0] : 'N/A';
        
        console.log(`Resetting ${date} - ${log.employee_name}...`);

        // Reset the approval status and copy current times to requested times
        const updateData = {
            adjustment_status: null,
            adjustment_applied: false,
            adjustment_reviewed_by: null,
            adjustment_reviewed_at: null,
            adjustment_reason: null,
            adjustment_requested_at: null,
            // Clear the current clock times and move them to requested times
            // This allows the user to submit a new adjustment request
            requested_clock_in: log.clock_in,
            requested_clock_out: log.clock_out,
            clock_in: null,
            clock_out: null
        };

        const { error: updateError } = await supabase
            .from('opoint_clock_logs')
            .update(updateData)
            .eq('id', log.id);

        if (updateError) {
            console.error(`  ❌ Failed: ${updateError.message}`);
            failedCount++;
        } else {
            console.log(`  ✓ Reset successfully`);
            resetCount++;
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Reset: ${resetCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('\nUsers can now submit new adjustment requests for these entries.');
}

reset2026Approvals().catch(console.error);
