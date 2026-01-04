import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testRenataPayslip() {
    console.log('🧪 TESTING RENATA PAYSLIP API ENDPOINT\n');
    
    const { data: users } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('email', '%renata%');
    
    const user = users?.[0];
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`👤 User: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Tenant: ${user.tenant_id}`);
    console.log(`   Salary: GHS ${user.basic_salary}\n`);
    
    const payDate = '2026-01-04';
    const url = `http://localhost:3001/api/payslips/${user.id}/${payDate}?forceRefresh=true`;
    
    console.log(`📡 Calling: ${url}\n`);
    
    try {
        const response = await fetch(url, {
            headers: {
                'x-tenant-id': user.tenant_id
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ SUCCESS!\n');
            console.log('📊 PAYSLIP DATA:');
            console.log(`   Gross Pay: GHS ${result.data.grossPay}`);
            console.log(`   Net Pay: GHS ${result.data.netPay}`);
            console.log(`   Hours Worked: ${result.data.actualHoursWorked}`);
            console.log(`   Expected Hours: ${result.data.expectedHoursThisMonth}`);
            console.log(`   Hourly Rate: GHS ${result.data.hourlyRate}`);
            console.log(`   SSNIT: GHS ${result.data.ssnitEmployee}`);
            console.log(`   PAYE: GHS ${result.data.paye}`);
            console.log('\n💡 EXPECTED: GHS 472.73 gross pay for 16 hours worked');
        } else {
            console.log('❌ FAILED!\n');
            console.log('Error:', result.error);
        }
    } catch (error) {
        console.log('❌ REQUEST FAILED!\n');
        console.log('Error:', error.message);
    }
}

testRenataPayslip().catch(console.error);
