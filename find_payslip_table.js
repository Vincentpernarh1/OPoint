import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function findPayslipTable() {
    console.log('🔍 Searching for payslip-related tables...\n');
    
    const possibleTables = [
        'payslips',
        'opoint_payslips',
        'employee_payslips',
        'salary_payments',
        'payments',
        'opoint_payments',
        'user_payments'
    ];
    
    for (const table of possibleTables) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
        
        if (!error) {
            console.log(`✅ Found: ${table}`);
            if (data && data.length > 0) {
                console.log(`   Sample columns:`, Object.keys(data[0]));
            }
        }
    }
    
    console.log('\n\n🔍 Checking opoint_clock_logs structure...\n');
    
    const { data: logs, error: logsError } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .limit(1);
    
    if (!logsError && logs && logs.length > 0) {
        console.log('Columns in opoint_clock_logs:', Object.keys(logs[0]));
    } else {
        console.log('Error or no data:', logsError?.message || 'No records');
    }
}

findPayslipTable().catch(console.error);
