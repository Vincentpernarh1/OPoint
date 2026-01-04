import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Ghana tax calculation function (copied from server.js)
function calculateNetPay(basicSalary, userId, payDate, workingHoursPerDay = 8.00, actualHoursWorked = null) {
    let grossPay = basicSalary;
    let hourlyRate = 0;
    let expectedHoursThisMonth = 0;

    // If actualHoursWorked is provided, calculate prorated pay
    if (actualHoursWorked !== null) {
        const date = new Date(payDate);
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Count weekdays in the month (assuming 5-day work week)
        let weekdays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dayOfWeek = new Date(year, month, day).getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                weekdays++;
            }
        }
        
        expectedHoursThisMonth = weekdays * workingHoursPerDay;
        
        // Calculate hourly rate: basic salary / expected monthly hours
        hourlyRate = basicSalary / expectedHoursThisMonth;
        
        // Calculate gross pay based on actual hours worked
        grossPay = hourlyRate * actualHoursWorked;
        
        console.log(`\n📊 Hours-based calculation:`);
        console.log(`   Days in month: ${daysInMonth}`);
        console.log(`   Weekdays: ${weekdays}`);
        console.log(`   Expected hours: ${expectedHoursThisMonth.toFixed(2)}`);
        console.log(`   Actual hours worked: ${actualHoursWorked.toFixed(2)}`);
        console.log(`   Hourly rate: GHS ${hourlyRate.toFixed(2)}`);
        console.log(`   Gross pay (hours-based): GHS ${grossPay.toFixed(2)}`);
    }

    // NOTE: SSNIT is calculated on gross pay, not basic salary
    const ssnitEmployee = grossPay * 0.055;  // 5.5% employee contribution
    
    // PAYE calculation (Ghana tax bands for 2024)
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
    
    paye = paye / 12; // Monthly PAYE
    
    const otherDeductions = 0;
    const totalDeductions = ssnitEmployee + paye + otherDeductions;
    const netPay = grossPay - totalDeductions;
    
    // This shows how much was deducted from basic salary, but doesn't affect net pay
    const underPayment = actualHoursWorked !== null ? (basicSalary - grossPay) : 0;
    
    return {
        basicSalary,
        grossPay,
        ssnitEmployee: parseFloat(ssnitEmployee.toFixed(2)),
        paye: parseFloat(paye.toFixed(2)),
        otherDeductions: parseFloat(otherDeductions.toFixed(2)),
        totalDeductions: parseFloat(totalDeductions.toFixed(2)),
        netPay: parseFloat(netPay.toFixed(2)),
        underPayment: parseFloat(underPayment.toFixed(2)),
        expectedHoursThisMonth: parseFloat(expectedHoursThisMonth.toFixed(2)),
        hourlyRate: parseFloat(hourlyRate.toFixed(2))
    };
}

async function checkRenataPayslip() {
    console.log('🔍 Fetching Renata user data...\n');
    
    // Get user data
    const { data: user, error: userError } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    if (userError) {
        console.log('❌ Error fetching user:', userError.message);
        return;
    }
    
    console.log('👤 User Data:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Basic Salary: GHS ${user.basic_salary}`);
    console.log(`   Company ID: ${user.company_id}`);
    console.log(`   Working Hours/Day: ${user.working_hours_per_day || 8.00}`);
    
    // Get latest attendance data for current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formattedFirstDay = firstDayOfMonth.toISOString().split('T')[0];
    const formattedLastDay = lastDayOfMonth.toISOString().split('T')[0];
    
    console.log(`\n📅 Checking attendance for: ${formattedFirstDay} to ${formattedLastDay}`);
    
    const { data: attendance, error: attendanceError } = await supabase
        .from('opoint_attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', formattedFirstDay)
        .lte('date', formattedLastDay)
        .order('date', { ascending: true });
    
    if (attendanceError) {
        console.log('❌ Error fetching attendance:', attendanceError.message);
    } else {
        console.log(`\n📊 Attendance Records Found: ${attendance.length}`);
        
        let totalHours = 0;
        attendance.forEach(day => {
            const hours = day.hours_worked || 0;
            totalHours += hours;
            console.log(`   ${day.date}: ${hours.toFixed(2)} hours (Status: ${day.status})`);
        });
        
        console.log(`\n⏰ Total Hours Worked: ${totalHours.toFixed(2)}`);
        
        // Calculate expected payslip
        console.log('\n💰 EXPECTED PAYSLIP CALCULATION:');
        console.log('=' .repeat(50));
        
        const calculation = calculateNetPay(
            user.basic_salary,
            user.id,
            formattedLastDay,
            user.working_hours_per_day || 8.00,
            totalHours
        );
        
        console.log(`\n📋 Breakdown:`);
        console.log(`   Basic Salary: GHS ${calculation.basicSalary.toFixed(2)}`);
        console.log(`   Gross Pay: GHS ${calculation.grossPay.toFixed(2)}`);
        console.log(`   SSNIT (5.5%): GHS ${calculation.ssnitEmployee.toFixed(2)}`);
        console.log(`   PAYE: GHS ${calculation.paye.toFixed(2)}`);
        console.log(`   Total Deductions: GHS ${calculation.totalDeductions.toFixed(2)}`);
        console.log(`   NET PAY: GHS ${calculation.netPay.toFixed(2)}`);
        
        if (calculation.underPayment > 0) {
            console.log(`\n⚠️  Under-payment: GHS ${calculation.underPayment.toFixed(2)} (due to insufficient hours)`);
        }
    }
    
    // Fetch latest payslip from database (if exists)
    console.log('\n\n📄 CHECKING STORED PAYSLIP DATA...');
    console.log('=' .repeat(50));
    
    const { data: payslips, error: payslipError } = await supabase
        .from('opoint_payslips')
        .select('*')
        .eq('user_id', user.id)
        .order('pay_date', { ascending: false })
        .limit(3);
    
    if (payslipError) {
        console.log('❌ Error fetching payslips:', payslipError.message);
    } else if (payslips && payslips.length > 0) {
        console.log(`\n📋 Latest Payslips (${payslips.length} found):\n`);
        
        payslips.forEach((payslip, index) => {
            console.log(`Payslip #${index + 1} - Date: ${payslip.pay_date}`);
            console.log(`   Basic Salary: GHS ${payslip.basic_salary}`);
            console.log(`   Gross Pay: GHS ${payslip.gross_pay}`);
            console.log(`   SSNIT: GHS ${payslip.ssnit_employee}`);
            console.log(`   PAYE: GHS ${payslip.paye}`);
            console.log(`   Total Deductions: GHS ${payslip.total_deductions}`);
            console.log(`   Net Pay: GHS ${payslip.net_pay}`);
            if (payslip.hours_worked) {
                console.log(`   Hours Worked: ${payslip.hours_worked}`);
                console.log(`   Expected Hours: ${payslip.expected_hours_this_month}`);
                console.log(`   Hourly Rate: GHS ${payslip.hourly_rate}`);
            }
            console.log('');
        });
    } else {
        console.log('\n⚠️  No payslips found in database');
    }
}

checkRenataPayslip();
