import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function compareUsers() {
    console.log('🔍 COMPARING MABLE vs RENATA PAYSLIP CALCULATION\n');
    console.log('='.repeat(80));
    
    const users = [
        { email: 'mablepernarh@gmail.com', name: 'Mable' },
        { email: 'Renata@gmail.com', name: 'Renata' }
    ];
    
    for (const userInfo of users) {
        console.log(`\n\n🧑 ANALYZING ${userInfo.name.toUpperCase()} (${userInfo.email})`);
        console.log('='.repeat(80));
        
        // Get user data
        const { data: user, error: userError } = await supabase
            .from('opoint_users')
            .select('*')
            .eq('email', userInfo.email)
            .single();
        
        if (userError) {
            console.log(`❌ Error fetching user: ${userError.message}`);
            continue;
        }
        
        if (!user) {
            console.log(`❌ User not found`);
            continue;
        }
        
        console.log(`\n📋 USER PROFILE:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Basic Salary: GHS ${user.basic_salary || 'NOT SET ❌'}`);
        console.log(`   Company ID: ${user.company_id}`);
        console.log(`   Working Hours/Day: ${user.working_hours_per_day || '8.00 (default)'}`);
        console.log(`   Mobile Money: ${user.mobile_money_number || 'NOT SET'}`);
        
        // Get attendance records for January 2026
        const startDate = '2026-01-01';
        const endDate = '2026-01-31';
        
        const { data: attendance, error: attError } = await supabase
            .from('opoint_attendance')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });
        
        if (attError) {
            console.log(`❌ Error fetching attendance: ${attError.message}`);
            continue;
        }
        
        console.log(`\n📅 ATTENDANCE RECORDS (January 2026):`);
        console.log(`   Total entries: ${attendance?.length || 0}`);
        
        if (attendance && attendance.length > 0) {
            let totalHours = 0;
            attendance.forEach((record, index) => {
                const hours = record.hours_worked || 0;
                totalHours += hours;
                
                console.log(`   ${index + 1}. ${record.date} | Hours: ${hours.toFixed(2)} | Status: ${record.status}`);
            });
            console.log(`   \n   📊 TOTAL HOURS WORKED: ${totalHours.toFixed(2)} hours`);
        } else {
            console.log(`   ⚠️ No attendance records found for January 2026`);
        }
        
        // Get payslip for January 2026
        const { data: payslips, error: payslipError } = await supabase
            .from('opoint_payslips')
            .select('*')
            .eq('user_id', user.id)
            .gte('pay_date', '2026-01-01')
            .lte('pay_date', '2026-01-31')
            .order('pay_date', { ascending: false });
        
        if (payslipError) {
            console.log(`❌ Error fetching payslips: ${payslipError.message}`);
        } else {
            console.log(`\n💰 PAYSLIPS (January 2026):`);
            console.log(`   Total payslips: ${payslips?.length || 0}`);
            
            if (payslips && payslips.length > 0) {
                payslips.forEach((payslip, index) => {
                    console.log(`\n   Payslip ${index + 1}:`);
                    console.log(`   Pay Date: ${payslip.pay_date}`);
                    console.log(`   Status: ${payslip.status}`);
                    console.log(`   Basic Salary: GHS ${payslip.basic_salary || 0}`);
                    console.log(`   Gross Pay: GHS ${payslip.gross_pay || 0}`);
                    console.log(`   Net Pay: GHS ${payslip.net_pay || 0}`);
                    console.log(`   Hours Worked: ${payslip.hours_worked || 'NOT SET ❌'}`);
                    console.log(`   Expected Hours: ${payslip.expected_hours || 'NOT SET'}`);
                    console.log(`   Hourly Rate: GHS ${payslip.hourly_rate || 'NOT SET'}`);
                    console.log(`   SSNIT: GHS ${payslip.ssnit_employee || 0}`);
                    console.log(`   PAYE: GHS ${payslip.paye || 0}`);
                    console.log(`   Total Deductions: GHS ${payslip.total_deductions || 0}`);
                });
            } else {
                console.log(`   ⚠️ No payslips found for January 2026`);
            }
        }
        
        // Check all payslips for this user (not just January)
        const { data: allPayslips, error: allPayslipsError } = await supabase
            .from('opoint_payslips')
            .select('*')
            .eq('user_id', user.id)
            .order('pay_date', { ascending: false });
        
        if (!allPayslipsError && allPayslips) {
            console.log(`\n📜 ALL PAYSLIPS (All Time):`);
            console.log(`   Total: ${allPayslips.length}`);
            if (allPayslips.length > 0) {
                allPayslips.slice(0, 3).forEach((p) => {
                    console.log(`   - ${p.pay_date}: Net Pay = GHS ${p.net_pay || 0}, Hours = ${p.hours_worked || 'N/A'}`);
                });
            }
        }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 DIAGNOSIS:\n');
    console.log('Common issues that cause $0 payslips:');
    console.log('1. ❌ Basic salary not set in user profile');
    console.log('2. ❌ No payslip record generated for the month');
    console.log('3. ❌ Hours worked not calculated/stored in payslip');
    console.log('4. ❌ Payslip calculation error during generation');
    console.log('='.repeat(80));
}

compareUsers().catch(console.error);
