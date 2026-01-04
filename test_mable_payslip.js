import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testMablePayslip() {
    console.log('🧪 TESTING MABLE\'S PAYSLIP CALCULATION\n');
    console.log('='.repeat(100));
    
    // Get user
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'mablepernarh@gmail.com')
        .single();
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`\n👤 User: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Basic Salary: GHS ${user.basic_salary || 'NOT SET'}\n`);
    
    // Test payslip API endpoint
    const payDate = '2026-01-01'; // January 2026
    const apiUrl = `http://localhost:3001/api/payslips/${user.id}/${payDate}`;
    
    console.log(`📡 Testing API: ${apiUrl}\n`);
    console.log('Fetching payslip...\n');
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ PAYSLIP GENERATED SUCCESSFULLY!\n');
            console.log('='.repeat(100));
            console.log('\n📊 PAYSLIP DETAILS:\n');
            console.log(`Employee: ${data.employeeName}`);
            console.log(`Period: ${data.period}`);
            console.log(`\n💰 EARNINGS:`);
            console.log(`   Basic Salary: GHS ${data.basicSalary?.toFixed(2) || '0.00'}`);
            console.log(`   Gross Pay: GHS ${data.grossPay?.toFixed(2) || '0.00'}`);
            
            console.log(`\n⏱️  HOURS INFORMATION:`);
            console.log(`   Actual Hours Worked: ${data.actualHoursWorked?.toFixed(2) || '0.00'} hours`);
            console.log(`   Expected Hours: ${data.expectedHours?.toFixed(2) || '0.00'} hours`);
            console.log(`   Hours Difference: ${(data.actualHoursWorked - data.expectedHours)?.toFixed(2) || '0.00'} hours`);
            
            console.log(`\n💸 DEDUCTIONS:`);
            console.log(`   PAYE Tax: GHS ${data.payeTax?.toFixed(2) || '0.00'}`);
            console.log(`   SSNIT (Employee): GHS ${data.ssnitEmployee?.toFixed(2) || '0.00'}`);
            console.log(`   Total Deductions: GHS ${data.totalDeductions?.toFixed(2) || '0.00'}`);
            
            console.log(`\n💵 NET PAY: GHS ${data.netPay?.toFixed(2) || '0.00'}`);
            
            console.log('\n' + '='.repeat(100));
            
            // Check if hours are correctly calculated
            if (data.actualHoursWorked > 0) {
                console.log('\n✅ SUCCESS: Hours are being calculated from punches array!');
                console.log(`   Expected: ~7.50 hours (06:26:30 from frontend)`);
                console.log(`   Got: ${data.actualHoursWorked?.toFixed(2)} hours`);
            } else {
                console.log('\n❌ PROBLEM: Hours are still 0!');
                console.log('   Check server logs for detailed calculation output');
            }
            
        } else {
            console.log('❌ ERROR GENERATING PAYSLIP:\n');
            console.log(JSON.stringify(data, null, 2));
        }
        
    } catch (error) {
        console.log('❌ ERROR CALLING API:', error.message);
        console.log('\n💡 Make sure the server is running on port 3001');
    }
    
    console.log('\n' + '='.repeat(100));
}

testMablePayslip().catch(console.error);
