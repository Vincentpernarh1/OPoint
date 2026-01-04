import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkRenataHours() {
    console.log('🔍 CHECKING RENATA\'S HOURS\n');
    
    // Get Renata's user
    const { data: users } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('email', '%renata%');
    
    console.log('Found users:', users);
    
    const user = users?.[0];
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`👤 User: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Salary: GHS ${user.basic_salary}\n`);
    
    // Get all clock logs for January 2026
    const { data: logs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('employee_id', user.id)
        .order('date', { ascending: true });
    
    console.log(`📋 Total clock logs: ${logs?.length || 0}\n`);
    
    // Filter for January 2026
    const januaryLogs = logs?.filter(log => {
        const date = new Date(log.date || log.clock_in);
        return date.getMonth() === 0 && date.getFullYear() === 2026;
    });
    
    console.log(`📅 January 2026 logs: ${januaryLogs?.length || 0}\n`);
    
    console.log('ALL JANUARY ENTRIES:');
    januaryLogs?.forEach((log, i) => {
        const d = new Date(log.date || log.clock_in);
        console.log(`\n${i + 1}. ${d.toDateString()}`);
        console.log(`   Status: ${log.adjustment_status || 'None'}, Applied: ${log.adjustment_applied}`);
        console.log(`   clock_in: ${log.clock_in}, clock_out: ${log.clock_out}`);
        console.log(`   clock_in_2: ${log.clock_in_2}, clock_out_2: ${log.clock_out_2}`);
    });
    console.log('\n');
    
    // Group by date
    const byDate = {};
    januaryLogs?.forEach(log => {
        const date = new Date(log.date || log.clock_in);
        const dateKey = date.toDateString();
        if (!byDate[dateKey]) {
            byDate[dateKey] = [];
        }
        byDate[dateKey].push(log);
    });
    
    console.log('📊 DAILY BREAKDOWN:\n');
    
    let totalHours = 0;
    
    Object.keys(byDate).sort().forEach(dateKey => {
        const dayLogs = byDate[dateKey];
        console.log(`\n${dateKey} (${dayLogs.length} entries):`);
        
        dayLogs.forEach((log, i) => {
            console.log(`\n  Entry ${i + 1}:`);
            console.log(`    Status: ${log.adjustment_status || 'None'}`);
            console.log(`    Applied: ${log.adjustment_applied}`);
            console.log(`    Adjustment Hours: ${log.adjustment_hours}`);
            console.log(`    Clock In: ${log.clock_in}`);
            console.log(`    Clock Out: ${log.clock_out}`);
            
            if (log.clock_in && log.clock_out) {
                const hours = (new Date(log.clock_out) - new Date(log.clock_in)) / (1000 * 60 * 60);
                console.log(`    Calculated Hours: ${hours.toFixed(2)}`);
            }
            
            // Check which one should be used
            if (log.adjustment_applied && log.adjustment_hours != null) {
                console.log(`    ✅ USE adjustment_hours: ${log.adjustment_hours} hours`);
            } else if (log.adjustment_applied) {
                // Approved but no adjustment_hours field - calculate from clock times
                let calcHours = 0;
                if (log.clock_in && log.clock_out) {
                    calcHours += (new Date(log.clock_out) - new Date(log.clock_in)) / (1000 * 60 * 60);
                }
                if (log.clock_in_2 && log.clock_out_2) {
                    calcHours += (new Date(log.clock_out_2) - new Date(log.clock_in_2)) / (1000 * 60 * 60);
                }
                console.log(`    ✅ USE calculated hours: ${calcHours.toFixed(2)} hours (approved adjustment, no adjustment_hours field)`);
            } else if (log.adjustment_status === 'Cancelled' || log.adjustment_status === 'Pending') {
                console.log(`    ✅ USE calculated hours: ${calcHours.toFixed(2)} hours (approved adjustment, no adjustment_hours field)`);
            } else if (log.adjustment_status === 'Cancelled' || log.adjustment_status === 'Pending') {
                console.log(`    ⏭️ SKIP (${log.adjustment_status})`);
            } else if (log.clock_in && log.clock_out) {
                const hours = (new Date(log.clock_out) - new Date(log.clock_in)) / (1000 * 60 * 60);
                console.log(`    ✅ USE: ${hours.toFixed(2)} hours (Actual work)`);
            }
        });
    });
    
    console.log(`\n\n📊 Analysis complete - check above to understand what should be counted`);
}

checkRenataHours().catch(console.error);
