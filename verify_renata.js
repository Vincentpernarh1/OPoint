import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkRenataCalculation() {
    console.log('🔍 CHECKING RENATA\'S PAYSLIP CALCULATION\n');
    console.log('='.repeat(80));
    
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    console.log(`👤 User: ${user.name}`);
    console.log(`   Basic Salary: GHS ${user.basic_salary}`);
    
    const { data: clockLogs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .order('clock_in', { ascending: true });
    
    const payDate = new Date('2026-01-04');
    const currentMonth = payDate.getMonth(); // January = 0
    const currentYear = payDate.getFullYear(); // 2026
    
    console.log(`\n📅 Calculating for: ${currentMonth + 1}/${currentYear} (January 2026)`);
    console.log('='.repeat(80));
    
    const monthLogs = clockLogs.filter(entry => {
        if (!entry.clock_in) return false;
        const clockInDate = new Date(entry.clock_in);
        return clockInDate.getMonth() === currentMonth && clockInDate.getFullYear() === currentYear;
    });
    
    console.log(`\n📋 January 2026 entries: ${monthLogs.length}\n`);
    
    let totalHours = 0;
    const breakDuration = 60; // minutes
    
    monthLogs.forEach((entry, idx) => {
        const clockIn = new Date(entry.clock_in);
        const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
        const date = clockIn.toISOString().split('T')[0];
        
        if (!clockOut) {
            console.log(`${idx + 1}. ${date} - INCOMPLETE (no clock out)`);
            return;
        }
        
        let dayTotalMs = 0;
        
        // Check for multi-session (both regular and requested fields)
        const hasMultiSession = entry.clock_in_2 || entry.clock_out_2 || 
                               entry.requested_clock_in_2 || entry.requested_clock_out_2;
        
        if (hasMultiSession) {
            // Session 1
            dayTotalMs += clockOut.getTime() - clockIn.getTime();
            
            // Session 2
            const clockIn2Time = entry.clock_in_2 || entry.requested_clock_in_2;
            const clockOut2Time = entry.clock_out_2 || entry.requested_clock_out_2;
            
            if (clockIn2Time && clockOut2Time) {
                const clockIn2 = new Date(clockIn2Time);
                const clockOut2 = new Date(clockOut2Time);
                dayTotalMs += clockOut2.getTime() - clockIn2.getTime();
                
                console.log(`${idx + 1}. ${date} - MULTI-SESSION`);
                console.log(`   Session 1: ${clockIn.toTimeString().split(' ')[0]} - ${clockOut.toTimeString().split(' ')[0]}`);
                console.log(`   Session 2: ${clockIn2.toTimeString().split(' ')[0]} - ${clockOut2.toTimeString().split(' ')[0]}`);
            }
        } else {
            // Single session
            dayTotalMs = clockOut.getTime() - clockIn.getTime();
            
            console.log(`${idx + 1}. ${date} - SINGLE SESSION`);
            console.log(`   ${clockIn.toTimeString().split(' ')[0]} - ${clockOut.toTimeString().split(' ')[0]}`);
            
            // Apply break if >= 7 hours
            const minimumHoursForBreak = 7 * 60 * 60 * 1000;
            if (dayTotalMs >= minimumHoursForBreak && breakDuration > 0) {
                console.log(`   Break deduction: ${breakDuration} min`);
                dayTotalMs = Math.max(0, dayTotalMs - (breakDuration * 60 * 1000));
            }
        }
        
        const dayHours = dayTotalMs / (1000 * 60 * 60);
        
        // Determine if should count
        const isApproved = entry.adjustment_applied === true;
        const isPending = entry.adjustment_status === 'Pending';
        const isCancelled = entry.adjustment_status === 'Cancelled';
        const isOK = dayHours >= 7.83 && dayHours <= 8.17; // 8 ± 10 min
        
        let shouldCount = false;
        let reason = '';
        
        if (isApproved) {
            shouldCount = true;
            reason = 'Approved adjustment';
        } else if (isPending) {
            shouldCount = false;
            reason = 'Pending - not counted';
        } else if (isCancelled) {
            shouldCount = false;
            reason = 'Cancelled - not counted';
        } else if (isOK) {
            shouldCount = true;
            reason = 'OK entry (~8 hours)';
        } else {
            shouldCount = false;
            reason = `Not OK (${dayHours.toFixed(2)}h)`;
        }
        
        console.log(`   Hours: ${dayHours.toFixed(2)}`);
        console.log(`   Status: ${entry.adjustment_status || 'Normal'}, Applied: ${entry.adjustment_applied}`);
        console.log(`   ${shouldCount ? '✅' : '❌'} ${reason}\n`);
        
        if (shouldCount) {
            totalHours += dayHours;
        }
    });
    
    console.log('='.repeat(80));
    console.log(`📊 TOTAL HOURS: ${totalHours.toFixed(2)}`);
    
    // Calculate payslip
    const januaryWeekdays = 22;
    const expectedHours = januaryWeekdays * 8;
    const hoursNotWorked = expectedHours - totalHours;
    const hourlyRate = user.basic_salary / expectedHours;
    const grossPay = hourlyRate * totalHours;
    const deduction = user.basic_salary - grossPay;
    const ssnit = grossPay * 0.055;
    const netPay = grossPay - ssnit;
    
    console.log('\n💰 PAYSLIP CALCULATION:');
    console.log(`   Basic Salary: GHS ${user.basic_salary.toFixed(2)}`);
    console.log(`   Expected Hours (${januaryWeekdays} weekdays): ${expectedHours}`);
    console.log(`   Hours Worked: ${totalHours.toFixed(2)}`);
    console.log(`   Hours Not Worked: ${hoursNotWorked.toFixed(2)}`);
    console.log(`   Hourly Rate: GHS ${hourlyRate.toFixed(2)}`);
    console.log(`   Deduction: -GHS ${deduction.toFixed(2)}`);
    console.log(`   Gross Pay: GHS ${grossPay.toFixed(2)}`);
    console.log(`   SSNIT (5.5%): -GHS ${ssnit.toFixed(2)}`);
    console.log(`   NET PAY: GHS ${netPay.toFixed(2)}`);
}

checkRenataCalculation();
