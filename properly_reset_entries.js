import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function properlyReset2026Entries() {
    console.log('=== PROPERLY RESETTING JANUARY 2026 ENTRIES ===\n');

    const entryIds = [
        'eb63bf03-a048-4f3d-82d3-33e3b806a8b7', // Jan 2
        'f51217f8-c03c-4194-b1c8-bcc2bdae3428'  // Jan 3
    ];

    for (const id of entryIds) {
        // Get the current entry
        const { data: entry, error: fetchError } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error(`Error fetching entry ${id}:`, fetchError);
            continue;
        }

        const date = entry.requested_clock_in ? new Date(entry.requested_clock_in).toISOString().split('T')[0] : 'N/A';
        console.log(`\nResetting ${date}:`);
        console.log(`  Current state:`);
        console.log(`    clock_in: ${entry.clock_in}`);
        console.log(`    clock_out: ${entry.clock_out}`);
        console.log(`    requested_clock_in: ${entry.requested_clock_in}`);
        console.log(`    requested_clock_out: ${entry.requested_clock_out}`);

        // Move requested times back to actual times and clear ALL adjustment fields
        const { error: updateError } = await supabase
            .from('opoint_clock_logs')
            .update({
                // Restore the actual clock times from requested times
                clock_in: entry.requested_clock_in,
                clock_out: entry.requested_clock_out,
                // Clear ALL requested fields
                requested_clock_in: null,
                requested_clock_out: null,
                requested_clock_in_2: null,
                requested_clock_out_2: null,
                // Clear ALL adjustment fields
                adjustment_status: null,
                adjustment_applied: false,
                adjustment_reason: null,
                adjustment_requested_at: null,
                adjustment_reviewed_by: null,
                adjustment_reviewed_at: null
            })
            .eq('id', id);

        if (updateError) {
            console.error(`  ❌ Failed: ${updateError.message}`);
        } else {
            console.log(`  ✓ Successfully reset`);
            console.log(`    New state:`);
            console.log(`      clock_in: ${entry.requested_clock_in}`);
            console.log(`      clock_out: ${entry.requested_clock_out}`);
            console.log(`      requested_clock_in: null`);
            console.log(`      All adjustment fields: cleared`);
        }
    }

    console.log('\n=== DONE ===');
    console.log('The entries now have:');
    console.log('  ✓ Actual clock times restored (the incomplete 4-hour times)');
    console.log('  ✓ All requested_* fields cleared');
    console.log('  ✓ All adjustment_* fields cleared');
    console.log('\nUser should now be able to submit new adjustment requests.');
}

properlyReset2026Entries().catch(console.error);
