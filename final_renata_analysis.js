import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Ghana tax calculation function (from server.js)
function calculateNetPay(basicSalary, userId, payDate, workingHoursPerDay = 8.00, actualHoursWorked = null) {
    let grossPay = basicSalary;
    let hourlyRate = 0;
    let expectedHoursThisMonth = 0;

    if (actualHoursWorked !== null) {
        const date = new Date(payDate);
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let weekdays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dayOfWeek = new Date(year, month, day).getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                weekdays++;
            }
        }
        
        expectedHoursThisMonth = weekdays * workingHoursPerDay;
        hourlyRate = basicSalary / expectedHoursThisMonth;
        grossPay = hourlyRate * actualHoursWorked;
    }

    const ssnitEmployee = grossPay * 0.055;
    
    let paye = 0;
    const annualGross = grossPay * 12;
    
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
    
    const otherDeductions = 0;
    const totalDeductions = ssnitEmployee + paye + otherDeductions;
    const netPay = grossPay - totalDeductions;
    const underPayment = actualHoursWorked !== null ? (basicSalary - grossPay) : 0;
    
    return {
        basicSalary,
        grossPay: parseFloat(grossPay.toFixed(2)),
        ssnitEmployee: parseFloat(ssnitEmployee.toFixed(2)),
        paye: parseFloat(paye.toFixed(2)),
        otherDeductions: parseFloat(otherDeductions.toFixed(2)),
        totalDeductions: parseFloat(totalDeductions.toFixed(2)),
        netPay: parseFloat(netPay.toFixed(2)),
        underPayment: parseFloat(underPayment.toFixed(2)),
        expectedHoursThisMonth: parseFloat(expectedHoursThisMonth.toFixed(2)),
        hourlyRate: parseFloat(hourlyRate.toFixed(2)),
        annualGross: parseFloat(annualGross.toFixed(2))
    };
}

async function calculateHoursFromClockLogs(userId, payDate, breakDurationMinutes = 60) {
    const currentMonth = payDate.getMonth();
    const currentYear = payDate.getFullYear();

    // Get clock logs
    const { data: clockLogs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('user_id', userId)
        .order('clock_in', { ascending: true });

    if (error || !clockLogs || clockLogs.length === 0) {
        console.log(`⚠️ No clock logs found for user`);
        return { totalHours: null, details: [] };
    }

    console.log(`📋 Found ${clockLogs.length} total clock logs`);

    let totalHoursWorked = 0;
    const details = [];
    const entriesByDate = {};
    const now = new Date();

    clockLogs.forEach(entry => {
        if (!entry.clock_in) return;
        
        const clockInDate = new Date(entry.clock_in);
        if (clockInDate.getMonth() !== currentMonth || clockInDate.getFullYear() !== currentYear) {
            return;
        }
        
        if (!entry.clock_out) {
            entry = { ...entry, clock_out: now.toISOString(), isIncomplete: true };
        }
        
        const dateKey = clockInDate.toISOString().split('T')[0];
        if (!entriesByDate[dateKey]) {
            entriesByDate[dateKey] = [];
        }
        entriesByDate[dateKey].push(entry);
    });

    Object.keys(entriesByDate).sort().forEach(dateKey => {
        const dayEntries = entriesByDate[dateKey];
        let dayTotalMs = 0;
        
        const hasMultiSession = dayEntries.some(entry => entry.clock_in_2 || entry.clock_out_2);
        
        if (hasMultiSession) {
            dayEntries.forEach(entry => {
                if (entry.clock_in && entry.clock_out) {
                    const clockIn = new Date(entry.clock_in);
                    const clockOut = new Date(entry.clock_out);
                    dayTotalMs += clockOut.getTime() - clockIn.getTime();
                }
                if (entry.clock_in_2 && entry.clock_out_2) {
                    const clockIn2 = new Date(entry.clock_in_2);
                    const clockOut2 = new Date(entry.clock_out_2);
                    dayTotalMs += clockOut2.getTime() - clockIn2.getTime();
                }
            });
        } else {
            dayEntries.forEach(entry => {
                const clockIn = new Date(entry.clock_in);
                const clockOut = new Date(entry.clock_out);
                dayTotalMs += clockOut.getTime() - clockIn.getTime();
            });

            const isSingleSession = dayEntries.length === 1;
            const minimumHoursForBreak = 7 * 60 * 60 * 1000;
            
            if (isSingleSession && breakDurationMinutes > 0 && dayTotalMs >= minimumHoursForBreak) {
                const breakMs = breakDurationMinutes * 60 * 1000;
                dayTotalMs = Math.max(0, dayTotalMs - breakMs);
            }
        }

        const dayHours = dayTotalMs / (1000 * 60 * 60);
        totalHoursWorked += dayHours;
        
        details.push({
            date: dateKey,
            hours: parseFloat(dayHours.toFixed(2)),
            sessions: dayEntries.length,
            multiSession: hasMultiSession
        });
    });

    return { totalHours: totalHoursWorked, details };
}

async function analyzeRenataPayslip() {
    console.log('🔍 PAYSLIP ANALYSIS FOR RENATA@GMAIL.COM\n');
    console.log('='.repeat(70));
    
    // Get user
    const { data: user, error: userError } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    if (userError) {
        console.log('❌ Error:', userError.message);
        return;
    }
    
    console.log('\n👤 USER PROFILE:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Basic Salary: GHS ${user.basic_salary?.toFixed(2) || 'NOT SET'}`);
    console.log(`   Working Hours/Day: ${user.working_hours_per_day || 8.00}`);
    console.log(`   Company ID: ${user.company_id || 'Not assigned'}`);
    
    if (!user.basic_salary) {
        console.log('\n❌ ERROR: No basic salary set for this user!');
        return;
    }
    
    // Get company settings if company_id exists
    let breakDuration = 60;
    if (user.company_id) {
        const { data: company } = await supabase
            .from('opoint_companies')
            .select('*')
            .eq('id', user.company_id)
            .single();
        
        if (company) {
            console.log(`\n🏢 COMPANY: ${company.company_name}`);
            console.log(`   Break Duration: ${company.break_duration_minutes || 60} minutes`);
            console.log(`   Working Hours/Day: ${company.working_hours_per_day || 8.00}`);
            breakDuration = company.break_duration_minutes || 60;
        }
    }
    
    // Analyze current month
    const now = new Date();
    console.log(`\n📅 ANALYZING MONTH: ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
    console.log('='.repeat(70));
    
    const { totalHours, details } = await calculateHoursFromClockLogs(user.id, now, breakDuration);
    
    if (totalHours === null) {
        console.log('\n⚠️  No time tracking data found for this month');
        console.log('\n💰 FULL SALARY CALCULATION (no hours tracking):');
        const calc = calculateNetPay(user.basic_salary, user.id, now, user.working_hours_per_day || 8.00, null);
        console.log(`   Gross Pay: GHS ${calc.grossPay.toFixed(2)}`);
        console.log(`   SSNIT (5.5%): -GHS ${calc.ssnitEmployee.toFixed(2)}`);
        console.log(`   PAYE: -GHS ${calc.paye.toFixed(2)}`);
        console.log(`   Total Deductions: -GHS ${calc.totalDeductions.toFixed(2)}`);
        console.log(`   ═══════════════════════════════════`);
        console.log(`   NET PAY: GHS ${calc.netPay.toFixed(2)}`);
    } else {
        console.log(`\n⏰ HOURS WORKED:`);
        console.log(`   Total Hours: ${totalHours.toFixed(2)} hours`);
        console.log(`\n   Daily Breakdown:`);
        details.forEach(day => {
            console.log(`   ${day.date}: ${day.hours.toFixed(2)} hours ${day.multiSession ? '(multi-session)' : ''}`);
        });
        
        console.log(`\n💰 PAYSLIP CALCULATION:`);
        console.log('='.repeat(70));
        
        const calculation = calculateNetPay(
            user.basic_salary,
            user.id,
            now,
            user.working_hours_per_day || 8.00,
            totalHours
        );
        
        console.log(`\n📊 Calculation Details:`);
        console.log(`   Basic Salary (Monthly): GHS ${calculation.basicSalary.toFixed(2)}`);
        console.log(`   Expected Hours This Month: ${calculation.expectedHoursThisMonth.toFixed(2)}`);
        console.log(`   Actual Hours Worked: ${totalHours.toFixed(2)}`);
        console.log(`   Hourly Rate: GHS ${calculation.hourlyRate.toFixed(2)}`);
        console.log(`   ─────────────────────────────────────`);
        console.log(`   Gross Pay (hours × rate): GHS ${calculation.grossPay.toFixed(2)}`);
        
        if (calculation.underPayment > 0) {
            console.log(`   ⚠️  Reduction: -GHS ${calculation.underPayment.toFixed(2)} (insufficient hours)`);
        }
        
        console.log(`\n📋 Tax & Deductions:`);
        console.log(`   Annual Gross (for tax): GHS ${calculation.annualGross.toFixed(2)}`);
        console.log(`   SSNIT Employee (5.5%): -GHS ${calculation.ssnitEmployee.toFixed(2)}`);
        console.log(`   PAYE (Ghana Tax): -GHS ${calculation.paye.toFixed(2)}`);
        console.log(`   Other Deductions: -GHS ${calculation.otherDeductions.toFixed(2)}`);
        console.log(`   ─────────────────────────────────────`);
        console.log(`   Total Deductions: -GHS ${calculation.totalDeductions.toFixed(2)}`);
        
        console.log(`\n💵 FINAL RESULT:`);
        console.log(`   ═══════════════════════════════════`);
        console.log(`   NET PAY: GHS ${calculation.netPay.toFixed(2)}`);
        console.log(`   ═══════════════════════════════════`);
        
        // Calculate what full salary would be
        const fullSalaryCalc = calculateNetPay(user.basic_salary, user.id, now, user.working_hours_per_day || 8.00, null);
        console.log(`\n   ℹ️  For comparison:`);
        console.log(`   Full Month Salary (if all hours worked): GHS ${fullSalaryCalc.netPay.toFixed(2)}`);
        console.log(`   Difference: GHS ${(fullSalaryCalc.netPay - calculation.netPay).toFixed(2)}`);
    }
}

analyzeRenataPayslip();
