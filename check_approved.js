import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkApprovedEntries() {
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    const { data: logs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .eq('adjustment_applied', true);
    
    console.log(`Found ${logs.length} approved entries:\n`);
    
    logs.forEach((log, idx) => {
        console.log(`${idx + 1}. ID: ${log.id}`);
        console.log(`   Date: ${log.clock_in?.split('T')[0]}`);
        console.log(`   clock_in: ${log.clock_in}`);
        console.log(`   clock_out: ${log.clock_out}`);
        console.log(`   clock_in_2: ${log.clock_in_2}`);
        console.log(`   clock_out_2: ${log.clock_out_2}`);
        console.log(`   requested_clock_in: ${log.requested_clock_in}`);
        console.log(`   requested_clock_out: ${log.requested_clock_out}`);
        console.log(`   requested_clock_in_2: ${log.requested_clock_in_2}`);
        console.log(`   requested_clock_out_2: ${log.requested_clock_out_2}`);
        console.log(`   adjustment_status: ${log.adjustment_status}`);
        console.log(`   adjustment_applied: ${log.adjustment_applied}\n`);
    });
}

checkApprovedEntries();
