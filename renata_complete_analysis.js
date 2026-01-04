import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function analyzeRenataClock() {
    console.log('🔍 RENATA\'S COMPLETE CLOCK ANALYSIS\n');
    console.log('='.repeat(80));
    
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
    console.log(`   Working Hours/Day: ${user.working_hours_per_day || 8.00}`);
    
    // Get ALL clock logs for Renata
    const { data: allLogs, error: logsError } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });
    
    if (logsError) {
        console.log('❌ Error:', logsError.message);
        return;
    }
    
    console.log(`\n\n📋 TOTAL CLOCK LOG ENTRIES: ${allLogs?.length || 0}`);
    
    if (!allLogs || allLogs.length === 0) {
        console.log('\n⚠️  NO CLOCK LOGS FOUND FOR RENATA!');
        return;
    }
    
    // Separate approved entries from pending/cancelled
    const approvedLogs = allLogs.filter(log => 
        log.adjustment_applied === true || 
        (log.clock_in && log.clock_out && !log.adjustment_status) ||
        (log.adjustment_status === 'Approved' && log.adjustment_applied)
    );
    
    const pendingLogs = allLogs.filter(log => 
        log.adjustment_status === 'Pending'
    );
    
    const cancelledLogs = allLogs.filter(log => 
        log.adjustment_status === 'Cancelled'
    );
    
    console.log(`\n   ✅ Approved/Applied: ${approvedLogs.length}`);
    console.log(`   ⏳ Pending: ${pendingLogs.length}`);
    console.log(`   ❌ Cancelled: ${cancelledLogs.length}`);
    
    // Group approved logs by month
    const byMonth = {};
    
    approvedLogs.forEach(log => {
        // Use clock_in for date or requested_clock_in if clock_in is null
        const clockInTime = log.clock_in || log.requested_clock_in;
        if (!clockInTime) return;
        
        const date = new Date(clockInTime);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!byMonth[monthKey]) {
            byMonth[monthKey] = [];
        }
        byMonth[monthKey].push(log);
    });
    
    console.log('\n\n📅 APPROVED HOURS BY MONTH:');
    console.log('='.repeat(80));
    
    const breakDuration = 60; // Default break in minutes
    
    for (const [month, logs] of Object.entries(byMonth).sort().reverse()) {
        console.log(`\n${'▼'.repeat(40)}`);
        console.log(`📆 ${month} (${logs.length} work days)`);
        console.log('='.repeat(80));
        
        let totalMonthHours = 0;
        const dailyBreakdown = {};
        
        logs.forEach(log => {
            const clockInTime = log.clock_in || log.requested_clock_in;
            const clockOutTime = log.clock_out || log.requested_clock_out;
            
            if (!clockInTime || !clockOutTime) return;
            
            const clockIn = new Date(clockInTime);
            const clockOut = new Date(clockOutTime);
            const date = clockIn.toISOString().split('T')[0];
            
            if (!dailyBreakdown[date]) {
                dailyBreakdown[date] = {
                    sessions: [],
                    totalMs: 0
                };
            }
            
            // Calculate session 1
            const session1Ms = clockOut - clockIn;
            dailyBreakdown[date].sessions.push({
                clockIn: clockInTime,
                clockOut: clockOutTime,
                hours: session1Ms / (1000 * 60 * 60)
            });
            dailyBreakdown[date].totalMs += session1Ms;
            
            // Check for session 2
            if (log.requested_clock_in_2 && log.requested_clock_out_2) {
                const clockIn2 = new Date(log.requested_clock_in_2);
                const clockOut2 = new Date(log.requested_clock_out_2);
                const session2Ms = clockOut2 - clockIn2;
                
                dailyBreakdown[date].sessions.push({
                    clockIn: log.requested_clock_in_2,
                    clockOut: log.requested_clock_out_2,
                    hours: session2Ms / (1000 * 60 * 60)
                });
                dailyBreakdown[date].totalMs += session2Ms;
            }
        });
        
        // Calculate daily hours with break deduction
        for (const [date, data] of Object.entries(dailyBreakdown).sort()) {
            let dayTotalMs = data.totalMs;
            const isMultiSession = data.sessions.length > 1;
            const isSingleSession = data.sessions.length === 1;
            const minimumHoursForBreak = 7 * 60 * 60 * 1000;
            
            // Apply break deduction only for single-session days >= 7 hours
            let breakDeducted = false;
            if (isSingleSession && breakDuration > 0 && dayTotalMs >= minimumHoursForBreak) {
                const breakMs = breakDuration * 60 * 1000;
                dayTotalMs = Math.max(0, dayTotalMs - breakMs);
                breakDeducted = true;
            }
            
            const dayHours = dayTotalMs / (1000 * 60 * 60);
            totalMonthHours += dayHours;
            
            console.log(`\n   ${date}:`);
            data.sessions.forEach((session, idx) => {
                const timeIn = new Date(session.clockIn).toTimeString().split(' ')[0];
                const timeOut = new Date(session.clockOut).toTimeString().split(' ')[0];
                console.log(`      Session ${idx + 1}: ${timeIn} → ${timeOut} (${session.hours.toFixed(2)}h)`);
            });
            
            if (breakDeducted) {
                console.log(`      Break: -${breakDuration} min`);
            }
            console.log(`      Daily Total: ${dayHours.toFixed(2)} hours ${isMultiSession ? '(multi-session)' : ''}`);
        }
        
        // Calculate expected hours
        const [year, monthNum] = month.split('-');
        const daysInMonth = new Date(year, parseInt(monthNum), 0).getDate();
        let weekdays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dayOfWeek = new Date(year, parseInt(monthNum) - 1, day).getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) weekdays++;
        }
        
        const expectedHours = weekdays * (user.working_hours_per_day || 8);
        
        console.log(`\n   ${'─'.repeat(76)}`);
        console.log(`   📊 MONTH SUMMARY:`);
        console.log(`   Total Hours Worked: ${totalMonthHours.toFixed(2)} hours`);
        console.log(`   Expected Hours (${weekdays} weekdays × ${user.working_hours_per_day || 8}h): ${expectedHours.toFixed(2)} hours`);
        console.log(`   Difference: ${(totalMonthHours - expectedHours).toFixed(2)} hours (${((totalMonthHours / expectedHours) * 100).toFixed(1)}%)`);
        
        // Calculate payslip
        const basicSalary = user.basic_salary;
        const hourlyRate = basicSalary / expectedHours;
        const grossPay = hourlyRate * totalMonthHours;
        const ssnit = grossPay * 0.055;
        
        // PAYE
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
        console.log(`   Basic Salary: GHS ${basicSalary.toFixed(2)}`);
        console.log(`   Hourly Rate: GHS ${hourlyRate.toFixed(2)}/hour`);
        console.log(`   Gross Pay (${totalMonthHours.toFixed(2)}h × ${hourlyRate.toFixed(2)}): GHS ${grossPay.toFixed(2)}`);
        console.log(`   SSNIT (5.5%): -GHS ${ssnit.toFixed(2)}`);
        console.log(`   PAYE: -GHS ${paye.toFixed(2)}`);
        console.log(`   ─────────────────────────────────────────`);
        console.log(`   Total Deductions: -GHS ${totalDeductions.toFixed(2)}`);
        console.log(`   NET PAY: GHS ${netPay.toFixed(2)}`);
        
        // Compare to full salary
        const fullSalarySsnit = basicSalary * 0.055;
        const fullSalaryPaye = 723.63; // From earlier calculation
        const fullSalaryNet = basicSalary - fullSalarySsnit - fullSalaryPaye;
        const reduction = fullSalaryNet - netPay;
        
        console.log(`\n   ℹ️  Comparison:`);
        console.log(`   Full Month Salary: GHS ${fullSalaryNet.toFixed(2)}`);
        console.log(`   Reduction: -GHS ${reduction.toFixed(2)} (${((reduction / fullSalaryNet) * 100).toFixed(1)}%)`);
    }
    
    // Show pending adjustments if any
    if (pendingLogs.length > 0) {
        console.log(`\n\n⏳ PENDING ADJUSTMENTS (${pendingLogs.length}):`);
        console.log('='.repeat(80));
        pendingLogs.forEach((log, idx) => {
            console.log(`\n${idx + 1}. ${log.requested_clock_in?.split('T')[0] || 'N/A'}`);
            console.log(`   In: ${log.requested_clock_in}`);
            console.log(`   Out: ${log.requested_clock_out}`);
            console.log(`   Reason: ${log.adjustment_reason}`);
        });
    }
}

analyzeRenataClock();
