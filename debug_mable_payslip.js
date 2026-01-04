import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function debugMablePayslip() {
    console.log('🔍 DEBUGGING MABLE PAYSLIP CALCULATION\n');
    console.log('='.repeat(80));
    
    const userEmail = 'mablepernarh@gmail.com';
    const payDate = new Date('2026-01-04'); // Current date
    const currentMonth = payDate.getMonth(); // January = 0
    const currentYear = payDate.getFullYear(); // 2026
    
    // Get user
    const { data: user, error: userError } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', userEmail)
        .single();
    
    if (userError || !user) {
        console.log('❌ User not found:', userError?.message);
        return;
    }
    
    console.log(`\n👤 USER: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Basic Salary: GHS ${user.basic_salary}`);
    console.log(`   Tenant ID: ${user.tenant_id}`);
    
    // Get clock logs
    const { data: clockLogs, error: logsError } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('employee_name', user.name)
        .order('date', { ascending: true });
    
    if (logsError) {
        console.log('❌ Error fetching logs:', logsError.message);
        return;
    }
    
    console.log(`\n📋 TOTAL CLOCK LOGS: ${clockLogs?.length || 0}`);
    
    // Filter for January 2026
    const januaryLogs = clockLogs.filter(entry => {
        if (!entry.clock_in) return false;
        const clockInDate = new Date(entry.clock_in);
        return clockInDate.getMonth() === currentMonth && clockInDate.getFullYear() === currentYear;
    });
    
    console.log(`\n📅 JANUARY 2026 LOGS: ${januaryLogs.length}`);
    
    let totalHours = 0;
    const TOLERANCE_MINUTES = 10;
    const EXPECTED_DAILY_HOURS = 8;
    const breakDurationMinutes = 60;
    
    januaryLogs.forEach((entry, index) => {
        console.log(`\n--- Entry ${index + 1} ---`);
        console.log(`Date: ${entry.date}`);
        console.log(`Clock In: ${entry.clock_in}`);
        console.log(`Clock Out: ${entry.clock_out}`);
        console.log(`Adjustment Status: ${entry.adjustment_status || 'None'}`);
        console.log(`Adjustment Applied: ${entry.adjustment_applied}`);
        
        if (!entry.clock_out) {
            console.log('❌ SKIPPED: No clock out');
            return;
        }
        
        const clockIn = new Date(entry.clock_in);
        const clockOut = new Date(entry.clock_out);
        let dayTotalMs = clockOut.getTime() - clockIn.getTime();
        
        // Apply break deduction for single-session days >= 7 hours
        const minimumHoursForBreak = 7 * 60 * 60 * 1000;
        if (dayTotalMs >= minimumHoursForBreak && breakDurationMinutes > 0) {
            const breakMs = breakDurationMinutes * 60 * 1000;
            console.log(`   Break deduction: ${breakDurationMinutes} minutes`);
            dayTotalMs = Math.max(0, dayTotalMs - breakMs);
        }
        
        const dayHours = dayTotalMs / (1000 * 60 * 60);
        console.log(`   Hours worked: ${dayHours.toFixed(2)}`);
        
        // Check if should be counted
        const isApprovedAdjustment = entry.adjustment_applied === true;
        const toleranceHours = TOLERANCE_MINUTES / 60;
        const lowerBound = EXPECTED_DAILY_HOURS - toleranceHours;
        const upperBound = EXPECTED_DAILY_HOURS + toleranceHours;
        const isOKEntry = dayHours >= lowerBound && dayHours <= upperBound;
        const isPending = entry.adjustment_status === 'Pending';
        const isCancelled = entry.adjustment_status === 'Cancelled';
        
        let shouldCount = false;
        let reason = '';
        
        if (isApprovedAdjustment) {
            shouldCount = true;
            reason = 'Approved adjustment';
        } else if (isPending) {
            shouldCount = false;
            reason = 'Pending adjustment';
        } else if (isCancelled) {
            shouldCount = false;
            reason = 'Cancelled adjustment';
        } else if (isOKEntry) {
            shouldCount = true;
            reason = 'OK entry (~8 hours)';
        } else {
            shouldCount = false;
            reason = `Outside tolerance (${lowerBound.toFixed(2)}-${upperBound.toFixed(2)} hours)`;
        }
        
        console.log(`   Should count: ${shouldCount ? '✅ YES' : '❌ NO'}`);
        console.log(`   Reason: ${reason}`);
        
        if (shouldCount) {
            totalHours += dayHours;
        }
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 TOTAL HOURS THAT WOULD BE COUNTED: ${totalHours.toFixed(2)} hours`);
    console.log(`\n🔍 EXPECTED CALCULATION:`);
    
    if (totalHours > 0) {
        const basicSalary = user.basic_salary;
        const workingHoursPerDay = 8.00;
        
        // Calculate expected hours for January
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        let weekdays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                weekdays++;
            }
        }
        
        const expectedHours = weekdays * workingHoursPerDay;
        const hourlyRate = basicSalary / expectedHours;
        const grossPay = hourlyRate * totalHours;
        
        console.log(`   Expected hours in January: ${expectedHours.toFixed(2)}`);
        console.log(`   Hourly rate: GHS ${hourlyRate.toFixed(2)}`);
        console.log(`   Gross pay: GHS ${grossPay.toFixed(2)}`);
        
        const ssnitEmployee = grossPay * 0.055;
        const paye = 0; // Simplified for now
        const netPay = grossPay - ssnitEmployee - paye;
        
        console.log(`   SSNIT (5.5%): GHS ${ssnitEmployee.toFixed(2)}`);
        console.log(`   Net pay: GHS ${netPay.toFixed(2)}`);
    } else {
        console.log(`   ⚠️ NO HOURS TO CALCULATE - PAYSLIP WOULD BE 0`);
    }
    
    console.log(`\n${'='.repeat(80)}`);
}

debugMablePayslip().catch(console.error);
