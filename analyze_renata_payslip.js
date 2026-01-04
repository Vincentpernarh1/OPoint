import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Ghana tax calculation function
function calculateNetPay(basicSalary, payDate, workingHoursPerDay = 8.00, actualHoursWorked = null) {
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
        hourlyRate = basicSalary / expectedHoursThisMonth;
        grossPay = hourlyRate * actualHoursWorked;
        
        console.log(`\n📊 Hours-based calculation:`);
        console.log(`   Days in month: ${daysInMonth}`);
        console.log(`   Weekdays: ${weekdays}`);
        console.log(`   Expected hours: ${expectedHoursThisMonth.toFixed(2)}`);
        console.log(`   Actual hours worked: ${actualHoursWorked.toFixed(2)}`);
        console.log(`   Hourly rate: GHS ${hourlyRate.toFixed(2)}`);
        console.log(`   Gross pay (hours-based): GHS ${grossPay.toFixed(2)}`);
    }

    const ssnitEmployee = grossPay * 0.055;
    
    // PAYE calculation (Ghana tax bands)
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

async function analyzeRenataPayslip() {
    console.log('🔍 ANALYZING RENATA\'S PAYSLIP\n');
    console.log('='.repeat(60));
    
    // Get user data
    const { data: user, error: userError } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    if (userError) {
        console.log('❌ Error:', userError.message);
        return;
    }
    
    console.log('\n👤 USER INFORMATION:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Basic Salary: GHS ${user.basic_salary}`);
    console.log(`   Working Hours/Day: ${user.working_hours_per_day || 8.00}`);
    console.log(`   Company ID: ${user.company_id || 'Not assigned'}`);
    
    // Check for attendance records
    console.log('\n\n📅 ATTENDANCE DATA:');
    console.log('='.repeat(60));
    
    const { data: allAttendance, error: attError } = await supabase
        .from('opoint_attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50);
    
    if (attError) {
        console.log('Error fetching attendance:', attError.message);
    } else {
        console.log(`Total attendance records: ${allAttendance?.length || 0}`);
        
        if (allAttendance && allAttendance.length > 0) {
            // Group by month
            const monthlyData = {};
            
            allAttendance.forEach(record => {
                const monthKey = record.date.substring(0, 7); // YYYY-MM
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        records: [],
                        totalHours: 0
                    };
                }
                monthlyData[monthKey].records.push(record);
                monthlyData[monthKey].totalHours += record.hours_worked || 0;
            });
            
            console.log('\nMonthly Summary:');
            for (const [month, data] of Object.entries(monthlyData)) {
                console.log(`\n${month}: ${data.records.length} days, ${data.totalHours.toFixed(2)} hours`);
                
                // Show first few records
                data.records.slice(0, 5).forEach(r => {
                    console.log(`   ${r.date}: ${r.hours_worked?.toFixed(2) || 0} hrs (${r.status})`);
                });
                if (data.records.length > 5) {
                    console.log(`   ... and ${data.records.length - 5} more`);
                }
            }
            
            // Calculate expected payslip for latest month
            const latestMonth = Object.keys(monthlyData).sort().reverse()[0];
            const latestData = monthlyData[latestMonth];
            
            console.log(`\n\n💰 PAYSLIP CALCULATION FOR ${latestMonth}:`);
            console.log('='.repeat(60));
            
            const calculation = calculateNetPay(
                user.basic_salary,
                `${latestMonth}-01`,
                user.working_hours_per_day || 8.00,
                latestData.totalHours
            );
            
            console.log(`\n📋 Expected Breakdown:`);
            console.log(`   Basic Salary: GHS ${calculation.basicSalary.toFixed(2)}`);
            console.log(`   Gross Pay: GHS ${calculation.grossPay.toFixed(2)}`);
            console.log(`   SSNIT (5.5%): -GHS ${calculation.ssnitEmployee.toFixed(2)}`);
            console.log(`   PAYE: -GHS ${calculation.paye.toFixed(2)}`);
            console.log(`   ─────────────────────────────`);
            console.log(`   Total Deductions: -GHS ${calculation.totalDeductions.toFixed(2)}`);
            console.log(`   NET PAY: GHS ${calculation.netPay.toFixed(2)}`);
            
            if (calculation.underPayment > 0) {
                console.log(`\n   ⚠️  Reduced by GHS ${calculation.underPayment.toFixed(2)} (insufficient hours)`);
            }
        } else {
            console.log('\n⚠️  No attendance records found');
        }
    }
    
    // Check payslip records
    console.log('\n\n📄 STORED PAYSLIPS:');
    console.log('='.repeat(60));
    
    const { data: payslips, error: payslipError } = await supabase
        .from('opoint_payslips')
        .select('*')
        .eq('user_id', user.id)
        .order('pay_date', { ascending: false });
    
    if (payslipError) {
        console.log('Error fetching payslips:', payslipError.message);
    } else if (payslips && payslips.length > 0) {
        console.log(`\nFound ${payslips.length} payslip(s):\n`);
        
        payslips.forEach((slip, idx) => {
            console.log(`Payslip #${idx + 1} - ${slip.pay_date}`);
            console.log(`   Basic Salary: GHS ${slip.basic_salary}`);
            console.log(`   Gross Pay: GHS ${slip.gross_pay}`);
            console.log(`   SSNIT: -GHS ${slip.ssnit_employee}`);
            console.log(`   PAYE: -GHS ${slip.paye}`);
            console.log(`   Total Deductions: -GHS ${slip.total_deductions}`);
            console.log(`   NET PAY: GHS ${slip.net_pay}`);
            
            if (slip.hours_worked !== undefined && slip.hours_worked !== null) {
                console.log(`   Hours Worked: ${slip.hours_worked}`);
                console.log(`   Expected Hours: ${slip.expected_hours_this_month}`);
                console.log(`   Hourly Rate: GHS ${slip.hourly_rate}`);
            }
            
            // Verify calculations
            console.log(`\n   Verification:`);
            const recalc = calculateNetPay(
                slip.basic_salary,
                slip.pay_date,
                user.working_hours_per_day || 8.00,
                slip.hours_worked
            );
            
            const grossMatch = Math.abs(recalc.grossPay - slip.gross_pay) < 0.01;
            const ssnitMatch = Math.abs(recalc.ssnitEmployee - slip.ssnit_employee) < 0.01;
            const payeMatch = Math.abs(recalc.paye - slip.paye) < 0.01;
            const netMatch = Math.abs(recalc.netPay - slip.net_pay) < 0.01;
            
            console.log(`   Gross Pay: ${grossMatch ? '✅' : '❌'} ${grossMatch ? '' : `Expected: ${recalc.grossPay.toFixed(2)}`}`);
            console.log(`   SSNIT: ${ssnitMatch ? '✅' : '❌'} ${ssnitMatch ? '' : `Expected: ${recalc.ssnitEmployee.toFixed(2)}`}`);
            console.log(`   PAYE: ${payeMatch ? '✅' : '❌'} ${payeMatch ? '' : `Expected: ${recalc.paye.toFixed(2)}`}`);
            console.log(`   Net Pay: ${netMatch ? '✅' : '❌'} ${netMatch ? '' : `Expected: ${recalc.netPay.toFixed(2)}`}`);
            
            if (!grossMatch || !ssnitMatch || !payeMatch || !netMatch) {
                console.log(`\n   ⚠️  CALCULATION MISMATCH DETECTED!`);
            }
            
            console.log('');
        });
    } else {
        console.log('\n⚠️  No payslips found in database');
    }
}

analyzeRenataPayslip();
