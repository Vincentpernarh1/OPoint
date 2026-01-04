import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugJan1() {
    const userId = 'f6776821-05d3-4c55-8434-9e838ab995aa'; // Renata
    
    console.log('🔍 Checking ALL clock logs for Jan 1, 2026\n');
    
    // Get all clock logs for this user in January 2026
    const { data: logs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', userId)
        .gte('date', '2026-01-01')
        .lte('date', '2026-01-01');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Found ${logs.length} entries for Jan 1\n`);
    
    logs.forEach((log, index) => {
        console.log(`\n━━━ Entry ${index + 1} (ID: ${log.id}) ━━━`);
        console.log(`Date: ${log.date}`);
        console.log(`Clock In: ${log.clock_in}`);
        console.log(`Clock Out: ${log.clock_out}`);
        console.log(`Clock In 2: ${log.clock_in_2}`);
        console.log(`Clock Out 2: ${log.clock_out_2}`);
        console.log(`Adjustment Status: ${log.adjustment_status}`);
        console.log(`Adjustment Applied: ${log.adjustment_applied}`);
        
        if (log.punches) {
            console.log(`\nPunches array (${log.punches.length} items):`);
            log.punches.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.type} at ${p.time}`);
            });
        } else {
            console.log('Punches: null');
        }
    });
}

debugJan1();
