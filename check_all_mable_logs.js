import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkAllMableLogs() {
    console.log('🔍 CHECKING ALL MABLE LOGS FOR JANUARY 2026\n');
    
    const user = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'mablepernarh@gmail.com')
        .single();
    
    // Get ALL logs with different filters
    console.log('1️⃣ Logs by tenant_id + employee_name:');
    const { data: logs1 } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('tenant_id', user.data.tenant_id)
        .eq('employee_name', user.data.name)
        .gte('date', '2026-01-01')
        .lte('date', '2026-01-31');
    console.log(`   Found: ${logs1?.length || 0} logs`);
    if (logs1) {
        logs1.forEach(log => {
            console.log(`   - ${log.date}: ${log.clock_in} to ${log.clock_out} (Status: ${log.adjustment_status || 'None'})`);
        });
    }
    
    console.log('\n2️⃣ Logs by employee_id (if set):');
    const { data: logs2 } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.data.id)
        .gte('date', '2026-01-01')
        .lte('date', '2026-01-31');
    console.log(`   Found: ${logs2?.length || 0} logs`);
    
    console.log('\n3️⃣ ALL January 2026 logs for this tenant:');
    const { data: allLogs } = await supabase
        .from('opoint_clock_logs')
        .select('employee_name, date, clock_in, clock_out, adjustment_status')
        .eq('tenant_id', user.data.tenant_id)
        .gte('date', '2026-01-01')
        .lte('date', '2026-01-31')
        .order('date');
    
    if (allLogs) {
        console.log(`   Total logs for tenant: ${allLogs.length}`);
        const mableLogs = allLogs.filter(l => l.employee_name.toLowerCase().includes('mabel'));
        console.log(`   Mable/Mabel logs: ${mableLogs.length}`);
        mableLogs.forEach(log => {
            const clockIn = log.clock_in ? new Date(log.clock_in) : null;
            const clockOut = log.clock_out ? new Date(log.clock_out) : null;
            let hours = 0;
            if (clockIn && clockOut) {
                hours = (clockOut - clockIn) / (1000 * 60 * 60);
            }
            console.log(`   - ${log.date}: ${log.clock_in || 'NO IN'} to ${log.clock_out || 'NO OUT'} | ${hours.toFixed(2)}h (${log.adjustment_status || 'None'})`);
        });
    }
}

checkAllMableLogs().catch(console.error);
