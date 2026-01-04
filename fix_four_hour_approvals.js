import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function fixFourHourApprovals() {
    console.log('=== FIXING 4-HOUR APPROVED ENTRIES ===\n');
    console.log('Assumption: 11:00-15:00 should be 08:00-12:00, 13:00-17:00\n');

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

    // Find all 4-hour approved entries (11:00-15:00 pattern)
    const { data: fourHourLogs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .eq('adjustment_applied', true)
        .eq('adjustment_status', 'Approved');

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    console.log(`Found ${fourHourLogs.length} approved entries\n`);

    const toFix = [];
    
    for (const log of fourHourLogs) {
        if (log.clock_in && log.clock_out) {
            const clockIn = new Date(log.clock_in);
            const clockOut = new Date(log.clock_out);
            const hours = (clockOut - clockIn) / (1000 * 60 * 60);
            
            // Check if it's a 4-hour entry with the 11:00-15:00 pattern
            if (hours === 4 && clockIn.getUTCHours() === 11 && clockOut.getUTCHours() === 15) {
                toFix.push(log);
            }
        }
    }

    console.log(`Found ${toFix.length} entries matching 4-hour 11:00-15:00 pattern\n`);

    if (toFix.length === 0) {
        console.log('No entries to fix');
        return;
    }

    console.log('Entries to fix:');
    toFix.forEach((log, index) => {
        const date = new Date(log.clock_in).toISOString().split('T')[0];
        console.log(`${index + 1}. ${date} - ID: ${log.id}`);
    });

    console.log('\nProceeding with fix...\n');

    let fixedCount = 0;
    let failedCount = 0;

    for (const log of toFix) {
        const date = new Date(log.clock_in);
        const dateStr = date.toISOString().split('T')[0];
        
        // Create the correct times: 08:00-12:00, 13:00-17:00
        const newClockIn = `${dateStr}T08:00:00+00:00`;
        const newClockOut = `${dateStr}T12:00:00+00:00`;
        const newClockIn2 = `${dateStr}T13:00:00+00:00`;
        const newClockOut2 = `${dateStr}T17:00:00+00:00`;

        console.log(`Fixing entry ${dateStr}:`);
        console.log(`  Old: ${log.clock_in} to ${log.clock_out}`);
        console.log(`  New: ${newClockIn} to ${newClockOut}, ${newClockIn2} to ${newClockOut2}`);

        const { error: updateError } = await supabase
            .from('opoint_clock_logs')
            .update({
                clock_in: newClockIn,
                clock_out: newClockOut,
                clock_in_2: newClockIn2,
                clock_out_2: newClockOut2
            })
            .eq('id', log.id);

        if (updateError) {
            console.error(`  ❌ Failed: ${updateError.message}`);
            failedCount++;
        } else {
            console.log(`  ✓ Success`);
            fixedCount++;
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log('\nNote: This assumes all 4-hour entries should have been 8-hour days (8-12, 13-17)');
}

fixFourHourApprovals().catch(console.error);
