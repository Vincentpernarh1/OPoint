import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function debugRenataHours() {
    console.log('🔍 DEBUGGING RENATA\'S HOURS CALCULATION\n');
    console.log('='.repeat(80));
    
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    console.log(`\n👤 User: ${user.name} (${user.id})`);
    console.log(`   Basic Salary: GHS ${user.basic_salary}`);
    
    // Pay period from screenshot: Dec 4, 2025 - Jan 3, 2026
    const payPeriodStart = '2025-12-04';
    const payPeriodEnd = '2026-01-03';
    
    console.log(`\n📅 Pay Period: ${payPeriodStart} to ${payPeriodEnd}`);
    
    // Get ALL clock logs in this period
    const { data: allLogs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: true });
    
    console.log(`\n📋 Total clock logs: ${allLogs?.length || 0}`);
    
    if (!allLogs || allLogs.length === 0) {
        console.log('No logs found!');
        return;
    }
    
    // Filter logs in pay period and calculate hours
    const logsInPeriod = allLogs.filter(log => {
        const clockInTime = log.clock_in || log.requested_clock_in;
        if (!clockInTime) return false;
        
        const date = new Date(clockInTime).toISOString().split('T')[0];
        return date >= payPeriodStart && date <= payPeriodEnd;
    });
    
    console.log(`\n📊 Logs in pay period: ${logsInPeriod.length}`);
    console.log('='.repeat(80));
    
    let totalServerCalculation = 0;
    let totalUICalculation = 0;
    
    logsInPeriod.forEach(log => {
        const clockInTime = log.clock_in || log.requested_clock_in;
        const clockOutTime = log.clock_out || log.requested_clock_out;
        
        if (!clockInTime || !clockOutTime) return;
        
        const clockIn = new Date(clockInTime);
        const clockOut = new Date(clockOutTime);
        const date = clockIn.toISOString().split('T')[0];
        
        const hours = (clockOut - clockIn) / (1000 * 60 * 60);
        
        console.log(`\n${date}:`);
        console.log(`   Status: ${log.adjustment_status || 'Normal'} | Applied: ${log.adjustment_applied}`);
        console.log(`   Clock In: ${clockInTime}`);
        console.log(`   Clock Out: ${clockOutTime}`);
        console.log(`   Duration: ${hours.toFixed(2)} hours`);
        
        // Check if this should be counted by server
        const shouldCountForServer = log.adjustment_applied === true || 
                                     (!log.adjustment_status && log.clock_in && log.clock_out) ||
                                     (log.adjustment_status === 'Approved');
        
        // Check if this should be counted by UI (likely only approved/applied)
        const shouldCountForUI = log.adjustment_applied === true || 
                                (!log.adjustment_status && log.clock_in && log.clock_out);
        
        if (shouldCountForServer) {
            totalServerCalculation += hours;
            console.log(`   ✅ COUNTED BY SERVER`);
        } else {
            console.log(`   ❌ NOT COUNTED BY SERVER`);
        }
        
        if (shouldCountForUI) {
            totalUICalculation += hours;
            console.log(`   ✅ COUNTED BY UI`);
        } else {
            console.log(`   ⚠️  NOT COUNTED BY UI`);
        }
        
        // Check for session 2
        if (log.requested_clock_in_2 && log.requested_clock_out_2) {
            const clockIn2 = new Date(log.requested_clock_in_2);
            const clockOut2 = new Date(log.requested_clock_out_2);
            const hours2 = (clockOut2 - clockIn2) / (1000 * 60 * 60);
            console.log(`   Session 2: ${hours2.toFixed(2)} hours`);
            
            if (shouldCountForServer) totalServerCalculation += hours2;
            if (shouldCountForUI) totalUICalculation += hours2;
        }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 TOTALS:');
    console.log(`   UI Should Show: ${totalUICalculation.toFixed(2)} hours (${Math.floor(totalUICalculation)}:${String(Math.floor((totalUICalculation % 1) * 60)).padStart(2, '0')}:${String(Math.floor(((totalUICalculation % 1) * 60 % 1) * 60)).padStart(2, '0')})`);
    console.log(`   Server Calculated: ${totalServerCalculation.toFixed(2)} hours`);
    
    // Calculate expected hours for period
    const start = new Date(payPeriodStart);
    const end = new Date(payPeriodEnd);
    let weekdays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) weekdays++;
    }
    
    const expectedHours = weekdays * 8;
    const hoursNotWorked = expectedHours - totalServerCalculation;
    
    console.log(`\n   Expected Hours (${weekdays} weekdays × 8): ${expectedHours} hours`);
    console.log(`   Hours Not Worked: ${hoursNotWorked.toFixed(2)} hours`);
    
    // Calculate payslip
    const hourlyRate = user.basic_salary / expectedHours;
    const grossPay = hourlyRate * totalServerCalculation;
    const deduction = user.basic_salary - grossPay;
    const ssnit = grossPay * 0.055;
    const netPay = grossPay - ssnit;
    
    console.log(`\n💰 CALCULATED PAYSLIP:`);
    console.log(`   Basic Salary: GHS ${user.basic_salary.toFixed(2)}`);
    console.log(`   Hourly Rate: GHS ${hourlyRate.toFixed(2)}/hour`);
    console.log(`   Deduction (hours not worked): -GHS ${deduction.toFixed(2)}`);
    console.log(`   Gross Pay: GHS ${grossPay.toFixed(2)}`);
    console.log(`   SSNIT (5.5%): -GHS ${ssnit.toFixed(2)}`);
    console.log(`   NET PAY: GHS ${netPay.toFixed(2)}`);
    
    console.log(`\n📋 COMPARISON TO SCREENSHOT:`);
    console.log(`   Screenshot shows: 7:05:43 hours`);
    console.log(`   Screenshot Gross Pay: GHS 1,952.40`);
    console.log(`   Screenshot Deduction: -GHS 3,247.60`);
    console.log(`   Screenshot Hours Not Worked: 109.92 hours`);
    
    const screenshotHours = 7 + (5/60) + (43/3600);
    const screenshotExpected = 109.92 + screenshotHours;
    const screenshotHourlyRate = 5200 / screenshotExpected;
    const screenshotCalculatedHours = 1952.40 / screenshotHourlyRate;
    
    console.log(`\n🔍 REVERSE CALCULATION FROM SCREENSHOT:`);
    console.log(`   Expected hours (109.92 + 7.09): ${screenshotExpected.toFixed(2)}`);
    console.log(`   Hourly rate: GHS ${screenshotHourlyRate.toFixed(2)}`);
    console.log(`   Hours system thinks were worked: ${screenshotCalculatedHours.toFixed(2)}`);
    console.log(`   ⚠️  DISCREPANCY: ${(screenshotCalculatedHours - screenshotHours).toFixed(2)} hours!`);
}

debugRenataHours();
