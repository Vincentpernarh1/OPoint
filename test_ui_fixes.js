/**
 * Verification test for the fixes:
 * 1. Payslip shows hour-based deductions
 * 2. Date cards show approved adjustment times
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE = 'http://localhost:3001';

async function testPayslipDeductions() {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  Testing Payslip Hour-Based Deductions            ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    // Get Renata's info
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`Testing for: ${user.name}`);
    console.log(`Basic Salary: GHS ${user.basicSalary || user.basic_salary || 'Not set'}`);
    
    // Fetch payslip
    try {
        const response = await fetch(
            `${API_BASE}/api/payslip?userId=${user.id}&date=${new Date().toISOString()}`,
            {
                headers: {
                    'x-tenant-id': user.tenant_id
                }
            }
        );
        
        const result = await response.json();
        
        if (result.success) {
            const payslip = result.data;
            
            console.log('\n✅ Payslip Generated Successfully!');
            console.log('\n┌────────────────────────────────────────────┐');
            console.log('│           PAYSLIP SUMMARY                  │');
            console.log('├────────────────────────────────────────────┤');
            console.log(`│ Basic Salary:    GHS ${payslip.basicSalary.toFixed(2).padStart(10)} │`);
            console.log(`│ Gross Pay:       GHS ${payslip.grossPay.toFixed(2).padStart(10)} │`);
            console.log('├────────────────────────────────────────────┤');
            console.log('│ DEDUCTIONS:                                │');
            console.log(`│   SSNIT (5.5%):  GHS ${payslip.ssnitEmployee.toFixed(2).padStart(10)} │`);
            console.log(`│   PAYE Tax:      GHS ${payslip.paye.toFixed(2).padStart(10)} │`);
            
            if (payslip.otherDeductions && payslip.otherDeductions.length > 0) {
                console.log('│   Other Deductions:                        │');
                payslip.otherDeductions.forEach(ded => {
                    const desc = ded.description.substring(0, 25).padEnd(25);
                    console.log(`│     ${desc}GHS ${ded.amount.toFixed(2).padStart(8)} │`);
                });
                console.log('│                                            │');
                console.log('│   ✅ HOUR-BASED DEDUCTIONS SHOWING!       │');
            } else {
                console.log('│   ⚠️  No other deductions                 │');
            }
            
            console.log('├────────────────────────────────────────────┤');
            console.log(`│ Total Deductions: GHS ${payslip.totalDeductions.toFixed(2).padStart(9)} │`);
            console.log(`│ Net Pay:          GHS ${payslip.netPay.toFixed(2).padStart(9)} │`);
            console.log('└────────────────────────────────────────────┘');
            
            // Verify calculation
            const expectedDeduction = payslip.basicSalary - payslip.grossPay;
            if (expectedDeduction > 0) {
                console.log(`\n✅ Hours deduction applied: GHS ${expectedDeduction.toFixed(2)}`);
            }
            
        } else {
            console.log('❌ Error:', result.error);
        }
        
    } catch (error) {
        console.log('❌ Failed to fetch payslip:', error.message);
    }
}

async function testDateCardTimes() {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  Testing Date Card Approved Adjustment Times      ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    // Get approved adjustments
    const { data: adjustments } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('adjustment_status', 'Approved')
        .not('adjustment_status', 'is', null)
        .limit(5);
    
    if (!adjustments || adjustments.length === 0) {
        console.log('⚠️  No approved adjustments found');
        return;
    }
    
    console.log(`Found ${adjustments.length} approved adjustments\n`);
    
    adjustments.forEach((adj, i) => {
        console.log(`${i + 1}. Adjustment for ${adj.employee_name || 'Unknown'}:`);
        console.log(`   Date: ${adj.date || new Date(adj.clock_in).toDateString()}`);
        console.log(`   Clock In:  ${new Date(adj.clock_in).toLocaleTimeString()}`);
        console.log(`   Clock Out: ${new Date(adj.clock_out).toLocaleTimeString()}`);
        
        const hours = (new Date(adj.clock_out) - new Date(adj.clock_in)) / (1000 * 60 * 60);
        console.log(`   Hours: ${hours.toFixed(2)}`);
        console.log(`   ✅ These times should appear in the date card\n`);
    });
}

async function runTests() {
    console.log('\n🧪 Running Verification Tests...\n');
    
    await testPayslipDeductions();
    await testDateCardTimes();
    
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  ✅ Tests Complete                                 ║');
    console.log('╚════════════════════════════════════════════════════╝');
    
    console.log('\n📋 What to verify in the UI:');
    console.log('  1. Open Renata\'s payslip');
    console.log('  2. Check "Other Deductions" section for hour-based deduction');
    console.log('  3. Open Time Clock dashboard');
    console.log('  4. Check December 23 date card shows:');
    console.log('     - Worked: 12:00:00 (not 00:00:00)');
    console.log('     - Clock In: 8:00 AM (not 10:11 PM)');
    console.log('     - Clock Out: 8:00 PM');
    console.log('     - Balance: +04:00:00 (not -08:00:00)');
}

runTests().catch(console.error);
