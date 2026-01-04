import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testRenataPayslip() {
    const { data: user, error } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('email', '%renata%')
        .single();
    
    if (error || !user) {
        console.log('❌ User not found:', error);
        return;
    }
    
    console.log('\n🧪 TESTING RENATA PAYSLIP AFTER TIMEZONE FIX\n');
    console.log('='.repeat(100));
    
    // Call the actual payslip API with tenant header
    const response = await fetch(`http://localhost:3001/api/payslips/${user.id}/2026-01-04`, {
        headers: {
            'X-Tenant-ID': user.tenant_id
        }
    });
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.payslip) {
        const payslip = data.payslip;
        
        console.log('\n💰 PAYSLIP RESULTS:');
        console.log(`   Basic Salary: GHS ${payslip.basicSalary}`);
        console.log(`   Expected Hours: ${payslip.expectedHoursWorked}`);
        console.log(`   Actual Hours: ${payslip.actualHoursWorked}`);
        console.log(`   Hours Not Worked: ${payslip.hoursNotWorked}`);
        console.log(`   Hourly Rate: GHS ${payslip.hourlyRate}`);
        console.log(`   Gross Pay: GHS ${payslip.grossPay}`);
        console.log(`   Net Pay: GHS ${payslip.netPay}`);
        
        console.log('\n' + '='.repeat(100));
        
        if (Math.abs(payslip.actualHoursWorked - 16) < 0.1) {
            console.log('\n✅ SUCCESS! Backend now calculates 16 hours (approved adjustments only)');
            console.log('   - Jan 2: 8 hours (approved adjustment)');
            console.log('   - Jan 3: 8 hours (approved adjustment)');
            console.log('   - Jan 2 punch entry (6.56h) correctly SKIPPED');
        } else {
            console.log(`\n❌ STILL WRONG: Expected 16 hours, got ${payslip.actualHoursWorked}`);
        }
        
        if (Math.abs(payslip.grossPay - 472.73) < 1) {
            console.log('✅ Gross pay is correct: GHS 472.73');
        } else {
            console.log(`❌ Gross pay wrong: Expected GHS 472.73, got GHS ${payslip.grossPay}`);
        }
        
        console.log('\n' + '='.repeat(100) + '\n');
    } else {
        console.log('❌ Error:', data.error);
    }
}

testRenataPayslip().catch(console.error);
