import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkRenataClock() {
    console.log('🔍 CHECKING RENATA\'S CLOCK LOGS\n');
    console.log('='.repeat(70));
    
    // Get Renata's user ID
    const { data: user, error: userError } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    if (userError) {
        console.log('❌ Error:', userError.message);
        return;
    }
    
    console.log(`\n👤 User: ${user.name}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Basic Salary: GHS ${user.basic_salary}`);
    
    // Get ALL clock logs for this user
    console.log('\n\n📋 FETCHING ALL CLOCK LOGS...');
    const { data: allLogs, error: logsError } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('clock_in', { ascending: false });
    
    if (logsError) {
        console.log('❌ Error fetching clock logs:', logsError.message);
        return;
    }
    
    console.log(`\nTotal clock log entries: ${allLogs?.length || 0}`);
    
    if (!allLogs || allLogs.length === 0) {
        console.log('\n⚠️  NO CLOCK LOGS FOUND FOR THIS USER!');
        
        // Check if there are ANY clock logs in the table
        const { count } = await supabase
            .from('opoint_clock_logs')
            .select('*', { count: 'exact', head: true });
        
        console.log(`\nTotal clock logs in system: ${count}`);
        
        if (count > 0) {
            // Show sample of other users' logs
            const { data: sampleLogs } = await supabase
                .from('opoint_clock_logs')
                .select('user_id, clock_in')
                .limit(5);
            
            console.log('\nSample clock logs from other users:');
            sampleLogs?.forEach(log => {
                console.log(`   User: ${log.user_id}, Clock in: ${log.clock_in}`);
            });
        }
        
        return;
    }
    
    // Organize by month
    const byMonth = {};
    allLogs.forEach(log => {
        if (!log.clock_in) return;
        
        const date = new Date(log.clock_in);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!byMonth[monthKey]) {
            byMonth[monthKey] = [];
        }
        byMonth[monthKey].push(log);
    });
    
    console.log('\n📅 LOGS BY MONTH:');
    console.log('='.repeat(70));
    
    for (const [month, logs] of Object.entries(byMonth).sort().reverse()) {
        console.log(`\n${month}: ${logs.length} entries`);
        
        let totalHours = 0;
        
        logs.forEach(log => {
            if (!log.clock_in || !log.clock_out) return;
            
            const clockIn = new Date(log.clock_in);
            const clockOut = new Date(log.clock_out);
            const hours = (clockOut - clockIn) / (1000 * 60 * 60);
            totalHours += hours;
            
            const date = clockIn.toISOString().split('T')[0];
            const timeIn = clockIn.toTimeString().split(' ')[0];
            const timeOut = clockOut.toTimeString().split(' ')[0];
            
            console.log(`   ${date}: ${timeIn} - ${timeOut} (${hours.toFixed(2)} hours)`);
        });
        
        console.log(`   ─────────────────────────────────`);
        console.log(`   TOTAL: ${totalHours.toFixed(2)} hours`);
        
        // Calculate expected hours for this month
        const [year, monthNum] = month.split('-');
        const date = new Date(year, parseInt(monthNum) - 1, 1);
        const daysInMonth = new Date(year, parseInt(monthNum), 0).getDate();
        
        let weekdays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dayOfWeek = new Date(year, parseInt(monthNum) - 1, day).getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                weekdays++;
            }
        }
        
        const expectedHours = weekdays * (user.working_hours_per_day || 8);
        console.log(`   Expected hours (${weekdays} weekdays × 8h): ${expectedHours.toFixed(2)}`);
        console.log(`   Difference: ${(totalHours - expectedHours).toFixed(2)} hours`);
        
        // Calculate payslip for this month
        const basicSalary = user.basic_salary;
        const hourlyRate = basicSalary / expectedHours;
        const grossPay = hourlyRate * totalHours;
        const ssnit = grossPay * 0.055;
        
        // PAYE calculation
        const annualGross = grossPay * 12;
        let paye = 0;
        
        if (annualGross <= 4380) {
            paye = 0;
        } else if (annualGross <= 6240) {
            paye = (annualGross - 4380) * 0.05;
        } else if (annualGross <= 34380) {
            paye = (6240 - 4380) * 0.05 + (annualGross - 6240) * 0.10;
        } else if (annualGross <= 50760) {
            paye = (6240 - 4380) * 0.05 + (34380 - 6240) * 0.10 + (annualGross - 34380) * 0.175;
        } else if (annualGross <= 393360) {
            paye = (6240 - 4380) * 0.05 + (34380 - 6240) * 0.10 + (50760 - 34380) * 0.175 + (annualGross - 50760) * 0.25;
        } else {
            paye = (6240 - 4380) * 0.05 + (34380 - 6240) * 0.10 + (50760 - 34380) * 0.175 + (393360 - 50760) * 0.25 + (annualGross - 393360) * 0.30;
        }
        
        paye = paye / 12;
        
        const totalDeductions = ssnit + paye;
        const netPay = grossPay - totalDeductions;
        
        console.log(`\n   💰 PAYSLIP CALCULATION:`);
        console.log(`   Hourly Rate: GHS ${hourlyRate.toFixed(2)}`);
        console.log(`   Gross Pay: GHS ${grossPay.toFixed(2)}`);
        console.log(`   SSNIT (5.5%): -GHS ${ssnit.toFixed(2)}`);
        console.log(`   PAYE: -GHS ${paye.toFixed(2)}`);
        console.log(`   Total Deductions: -GHS ${totalDeductions.toFixed(2)}`);
        console.log(`   NET PAY: GHS ${netPay.toFixed(2)}`);
        
        const fullSalaryNet = basicSalary - (basicSalary * 0.055) - 723.63;
        const difference = fullSalaryNet - netPay;
        console.log(`\n   ℹ️  vs Full Salary (GHS ${fullSalaryNet.toFixed(2)}): ${difference >= 0 ? '-' : '+'}GHS ${Math.abs(difference).toFixed(2)}`);
    }
    
    // Show most recent entries in detail
    console.log('\n\n📝 MOST RECENT 10 ENTRIES (DETAILED):');
    console.log('='.repeat(70));
    
    allLogs.slice(0, 10).forEach((log, idx) => {
        console.log(`\n${idx + 1}. ID: ${log.id}`);
        console.log(`   Clock In: ${log.clock_in || 'N/A'}`);
        console.log(`   Clock Out: ${log.clock_out || 'STILL CLOCKED IN'}`);
        
        if (log.clock_in_2) {
            console.log(`   Clock In 2: ${log.clock_in_2}`);
            console.log(`   Clock Out 2: ${log.clock_out_2 || 'STILL CLOCKED IN'}`);
        }
        
        if (log.clock_in && log.clock_out) {
            const hours = (new Date(log.clock_out) - new Date(log.clock_in)) / (1000 * 60 * 60);
            console.log(`   Duration: ${hours.toFixed(2)} hours`);
        }
    });
}

checkRenataClock();
