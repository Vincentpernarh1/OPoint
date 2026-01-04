import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testMablePayslip() {
    console.log('🧪 TESTING MABLE PAYSLIP API ENDPOINT\n');
    
    // Get Mable's user ID
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'mablepernarh@gmail.com')
        .single();
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`👤 User: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Tenant: ${user.tenant_id}`);
    console.log(`   Salary: GHS ${user.basic_salary}\n`);
    
    // Call payslip API
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
        } else {
            console.log('❌ FAILED!\n');
            console.log('Error:', result.error);
        }
    } catch (error) {
        console.log('❌ REQUEST FAILED!\n');
        console.log('Error:', error.message);
        console.log('\n⚠️ Make sure the server is running on port 3001');
    }
}

testMablePayslip().catch(console.error);
