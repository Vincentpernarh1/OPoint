import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function investigateUsers() {
    console.log('🔍 INVESTIGATING MABLE vs RENATA\n');
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
        console.log(`   Employee ID: ${user.employee_id || 'NOT SET ❌'}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Basic Salary: GHS ${user.basic_salary || 'NOT SET ❌'}`);
        console.log(`   Company ID: ${user.company_id || 'NOT SET'}`);
        console.log(`   Tenant ID: ${user.tenant_id || 'NOT SET'}`);
        console.log(`   Working Hours/Day: ${user.working_hours_per_day || 'NOT SET (default 8.00)'}`);
        console.log(`   Mobile Money: ${user.mobile_money_number || 'NOT SET'}`);
        
        // Get clock logs for January 2026 using employee_id
        const { data: clockLogs, error: logsError } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('employee_id', user.employee_id)
            .gte('date', '2026-01-01')
            .lte('date', '2026-01-31')
            .order('date', { ascending: true });
        
        console.log(`\n⏰ CLOCK LOGS (January 2026):`);
        
        if (logsError) {
            console.log(`   ❌ Error: ${logsError.message}`);
        } else if (!clockLogs || clockLogs.length === 0) {
            console.log(`   ⚠️ No clock logs found for employee_id: ${user.employee_id}`);
            
            // Try with tenant_id and employee_name
            const { data: altLogs, error: altError } = await supabase
                .from('opoint_clock_logs')
                .select('*')
                .eq('employee_name', user.name)
                .gte('date', '2026-01-01')
                .lte('date', '2026-01-31')
                .order('date', { ascending: true });
            
            if (!altError && altLogs && altLogs.length > 0) {
                console.log(`   ✅ Found ${altLogs.length} logs using employee_name`);
                displayClockLogs(altLogs);
            } else {
                console.log(`   Also tried employee_name: No results`);
            }
        } else {
            console.log(`   ✅ Found ${clockLogs.length} logs`);
            displayClockLogs(clockLogs);
        }
        
        // Get all clock logs (not filtered by date) to see if there's any data
        const { data: allLogs, error: allLogsError } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('employee_id', user.employee_id)
            .limit(5);
        
        console.log(`\n📊 ALL-TIME CLOCK LOGS (sample):`);
        if (allLogsError) {
            console.log(`   ❌ Error: ${allLogsError.message}`);
        } else if (!allLogs || allLogs.length === 0) {
            console.log(`   ⚠️ No clock logs found at all for employee_id: ${user.employee_id}`);
        } else {
            console.log(`   Found records (showing first 5):`);
            allLogs.forEach((log, i) => {
                console.log(`   ${i+1}. Date: ${log.date}, Employee: ${log.employee_name}, ID: ${log.employee_id}`);
            });
        }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 SUMMARY\n');
    console.log('Key findings to look for:');
    console.log('1. Do both users have employee_id set?');
    console.log('2. Do both users have basic_salary set?');
    console.log('3. Do clock logs match their employee_id?');
    console.log('4. Are there any clock logs for January 2026?');
    console.log('='.repeat(80));
}

function displayClockLogs(logs) {
    let totalHours = 0;
    
    logs.forEach((log, index) => {
        const clockIn = log.clock_in ? new Date(log.clock_in) : null;
        const clockOut = log.clock_out ? new Date(log.clock_out) : null;
        
        let hours = 0;
        if (clockIn && clockOut) {
            hours = (clockOut - clockIn) / (1000 * 60 * 60);
            // Subtract 1 hour break by default
            hours = Math.max(0, hours - 1);
            totalHours += hours;
        }
        
        const clockInStr = clockIn ? clockIn.toLocaleTimeString() : 'N/A';
        const clockOutStr = clockOut ? clockOut.toLocaleTimeString() : 'NOT CLOCKED OUT';
        
        console.log(`   ${index + 1}. ${log.date}: ${clockInStr} - ${clockOutStr} | Hours: ${hours.toFixed(2)}`);
    });
    
    console.log(`   \n   📊 TOTAL HOURS: ${totalHours.toFixed(2)} hours`);
}

investigateUsers().catch(console.error);
