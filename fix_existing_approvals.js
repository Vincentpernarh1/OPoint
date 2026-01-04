import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function fixExistingApprovals() {
    console.log('=== FIXING EXISTING APPROVED ENTRIES ===\n');

    // Find all approved entries where requested_clock_in_2 existed but clock_in_2 is null
    // We need to check the history to see if there were requested times
    
    // Get all approved entries for Renata
    const { data: user } = await supabase
        .from('opoint_users')
        .select('id')
        .eq('email', 'Renata@gmail.com')
        .single();

    if (!user) {
        console.error('User not found');
        return;
    }

    const { data: approvedLogs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .eq('adjustment_applied', true)
        .eq('adjustment_status', 'Approved');

    if (error) {
        console.error('Error fetching approved logs:', error);
        return;
    }

    console.log(`Found ${approvedLogs.length} approved entries\n`);

    for (const log of approvedLogs) {
        console.log(`\n--- Processing Entry ---`);
        console.log(`ID: ${log.id}`);
        console.log(`Date: ${log.clock_in ? new Date(log.clock_in).toISOString().split('T')[0] : 'N/A'}`);
        console.log(`Current clock_in: ${log.clock_in}`);
        console.log(`Current clock_out: ${log.clock_out}`);
        console.log(`Current clock_in_2: ${log.clock_in_2 || 'null'}`);
        console.log(`Current clock_out_2: ${log.clock_out_2 || 'null'}`);
        
        // Check if this entry looks like it should have been a multi-session
        // (4 hours suggests it's only half of an 8-hour day with break)
        if (log.clock_in && log.clock_out) {
            const clockIn = new Date(log.clock_in);
            const clockOut = new Date(log.clock_out);
            const hours = (clockOut - clockIn) / (1000 * 60 * 60);
            
            console.log(`Hours: ${hours.toFixed(2)}`);
            
            if (hours === 4) {
                console.log('⚠️  This looks like it should be an 8-hour day split into 2 sessions');
                console.log('However, we cannot recover the original requested times automatically.');
                console.log('The user will need to submit a new time adjustment request.');
            }
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log('The fix has been applied to the code in database.js');
    console.log('Going forward, new approvals will correctly copy both sessions.');
    console.log('\nFor existing approved entries with missing session 2 data:');
    console.log('- Users need to submit new time adjustment requests');
    console.log('- Or manually update the database with the correct times');
}

fixExistingApprovals().catch(console.error);
