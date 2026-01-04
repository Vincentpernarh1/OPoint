import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function finalInvestigation() {
    console.log('🔍 FINAL INVESTIGATION: MABLE vs RENATA\n');
    console.log('='.repeat(80));
    
    const users = [
        { email: 'mablepernarh@gmail.com', name: 'Mable' },
        { email: 'Renata@gmail.com', name: 'Renata' }
    ];
    
    for (const userInfo of users) {
        console.log(`\n\n🧑 ${userInfo.name.toUpperCase()} (${userInfo.email})`);
        console.log('='.repeat(80));
        
        // Get user data
        const { data: user, error: userError } = await supabase
            .from('opoint_users')
            .select('*')
            .eq('email', userInfo.email)
            .single();
        
        if (userError || !user) {
            console.log(`❌ User not found: ${userError?.message}`);
            continue;
        }
        
        console.log(`\n📋 USER PROFILE:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Employee ID: ${user.employee_id || '❌ NOT SET'}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Basic Salary: GHS ${user.basic_salary || '❌ NOT SET'}`);
        console.log(`   Tenant ID: ${user.tenant_id}`);
        
        // Search clock logs by employee name
        const { data: logsByName, error: nameError } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('employee_name', user.name)
            .gte('date', '2026-01-01')
            .lte('date', '2026-01-31')
            .order('date', { ascending: true });
        
        console.log(`\n⏰ CLOCK LOGS (January 2026) - By Name:`);
        
        if (nameError) {
            console.log(`   ❌ Error: ${nameError.message}`);
        } else if (!logsByName || logsByName.length === 0) {
            console.log(`   ⚠️ No clock logs found for name: "${user.name}"`);
            
            // Try fuzzy matching
            const { data: allJanLogs } = await supabase
                .from('opoint_clock_logs')
                .select('employee_name, employee_id, date')
                .gte('date', '2026-01-01')
                .lte('date', '2026-01-31')
                .limit(20);
            
            console.log(`\n   Other employees with January logs:`);
            if (allJanLogs) {
                const uniqueEmployees = [...new Set(allJanLogs.map(l => l.employee_name))];
                uniqueEmployees.forEach(name => {
                    const count = allJanLogs.filter(l => l.employee_name === name).length;
                    console.log(`   - ${name}: ${count} days`);
                });
            }
        } else {
            console.log(`   ✅ Found ${logsByName.length} logs`);
            displayClockLogs(logsByName);
        }
        
        // Check all-time logs
        const { data: allTimeLogs } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('employee_name', user.name)
            .order('date', { ascending: false })
            .limit(10);
        
        console.log(`\n📊 ALL-TIME LOGS (last 10):`);
        if (allTimeLogs && allTimeLogs.length > 0) {
            console.log(`   Found ${allTimeLogs.length} records:`);
            allTimeLogs.forEach((log, i) => {
                const hours = calculateHours(log);
                console.log(`   ${i+1}. ${log.date}: ${hours.toFixed(2)} hours`);
            });
        } else {
            console.log(`   ⚠️ No logs found for "${user.name}"`);
        }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('🔬 ROOT CAUSE ANALYSIS\n');
}

function calculateHours(log) {
    const clockIn = log.clock_in ? new Date(log.clock_in) : null;
    const clockOut = log.clock_out ? new Date(log.clock_out) : null;
    
    if (!clockIn || !clockOut) return 0;
    
    let hours = (clockOut - clockIn) / (1000 * 60 * 60);
    hours = Math.max(0, hours - 1); // Subtract 1 hour break
    return hours;
}

function displayClockLogs(logs) {
    let totalHours = 0;
    
    logs.forEach((log, index) => {
        const hours = calculateHours(log);
        totalHours += hours;
        
        const clockInStr = log.clock_in ? new Date(log.clock_in).toLocaleTimeString() : 'N/A';
        const clockOutStr = log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : 'NOT OUT';
        
        console.log(`   ${index + 1}. ${log.date}: ${clockInStr} - ${clockOutStr} | ${hours.toFixed(2)}h`);
    });
    
    console.log(`   \n   📊 TOTAL: ${totalHours.toFixed(2)} hours`);
}

finalInvestigation().catch(console.error);
