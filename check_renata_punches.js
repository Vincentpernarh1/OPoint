import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkRenataPunches() {
    console.log('🔍 CHECKING RENATA\'S PUNCHES ARRAY IN CLOCK LOGS\n');
    
    const { data: users } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('email', '%renata%');
    
    const user = users?.[0];
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`👤 User: ${user.name}`);
    console.log(`   Salary: GHS ${user.basic_salary}\n`);
    
    // Get clock logs for January 2026
    const { data: logs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('employee_id', user.id)
        .order('date', { ascending: true });
    
    const januaryLogs = logs?.filter(log => {
        const date = new Date(log.date || log.clock_in);
        return date.getMonth() === 0 && date.getFullYear() === 2026;
    });
    
    console.log(`📅 January 2026 logs: ${januaryLogs?.length || 0}\n`);
    
    let totalHoursFromUI = 0;
    
    // Group by date to match UI logic
    const byDate = {};
    januaryLogs?.forEach(log => {
        const date = new Date(log.date || log.clock_in);
        const dateKey = date.toDateString();
        if (!byDate[dateKey]) {
            byDate[dateKey] = [];
        }
        byDate[dateKey].push(log);
    });
    
    console.log('📊 CALCULATING LIKE THE UI DOES:\n');
    
    Object.keys(byDate).sort().forEach(dateKey => {
        const dayLogs = byDate[dateKey];
        console.log(`\n${dateKey}:`);
        
        // Find approved adjustment (like UI does)
        const approvedAdj = dayLogs.find(l => l.adjustment_applied === true);
        
        if (approvedAdj) {
            console.log('  ✅ Has approved adjustment');
            console.log(`     clock_in: ${approvedAdj.clock_in}`);
            console.log(`     clock_out: ${approvedAdj.clock_out}`);
            console.log(`     clock_in_2: ${approvedAdj.clock_in_2}`);
            console.log(`     clock_out_2: ${approvedAdj.clock_out_2}`);
            console.log(`     adjustment_hours: ${approvedAdj.adjustment_hours}`);
            console.log(`     punches: ${JSON.stringify(approvedAdj.punches)}`);
            
            let dayHours = 0;
            
            // Session 1
            if (approvedAdj.clock_in && approvedAdj.clock_out) {
                const h = (new Date(approvedAdj.clock_out) - new Date(approvedAdj.clock_in)) / (1000 * 60 * 60);
                console.log(`     Session 1: ${h.toFixed(2)} hours`);
                dayHours += h;
            }
            
            // Session 2
            if (approvedAdj.clock_in_2 && approvedAdj.clock_out_2) {
                const h = (new Date(approvedAdj.clock_out_2) - new Date(approvedAdj.clock_in_2)) / (1000 * 60 * 60);
                console.log(`     Session 2: ${h.toFixed(2)} hours`);
                dayHours += h;
            }
            
            console.log(`  💼 Total: ${dayHours.toFixed(2)} hours`);
            totalHoursFromUI += dayHours;
        } else {
            console.log('  ❌ No approved adjustment');
        }
    });
    
    console.log(`\n\n📊 TOTAL HOURS (UI LOGIC): ${totalHoursFromUI.toFixed(2)}`);
    
    const hourlyRate = user.basic_salary / 176;
    const grossPay = hourlyRate * totalHoursFromUI;
    console.log(`\n💰 Expected Gross Pay: GHS ${grossPay.toFixed(2)}`);
    console.log(`   (User says it should be: GHS 472.73)`);
}

checkRenataPunches().catch(console.error);
