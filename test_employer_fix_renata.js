/**
 * Test Employer Contributions Fix using Renata@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE = 'http://localhost:3001';

async function testEmployerContributions() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     EMPLOYER CONTRIBUTIONS FIX TEST                    ║');
    console.log('║     Testing with Renata@gmail.com                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Get Renata's user info
        console.log('📋 Step 1: Fetching user Renata@gmail.com...\n');
        
        const { data: user, error: userError } = await supabase
            .from('opoint_users')
            .select('*')
            .eq('email', 'Renata@gmail.com')
            .single();

        if (userError || !user) {
            console.log('❌ User not found:', userError?.message);
            return;
        }

        console.log(`✅ User found: ${user.name}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Basic Salary: GHS ${parseFloat(user.basic_salary || 0).toFixed(2)}`);
        console.log(`   Company: ${user.company_name || 'Not assigned'}`);
        console.log(`   Tenant ID: ${user.tenant_id || 'Not assigned'}\n`);

        // Use tenant_id from user record
        const tenantId = user.tenant_id;
        
        if (!tenantId) {
            console.log('❌ User has no tenant_id assigned');
            return;
        }

        // Get payslip
        console.log('📊 Step 2: Fetching Payslip...\n');
        
        const response = await fetch(
            `${API_BASE}/api/payslips/${user.id}/${new Date().toISOString()}`,
            {
                headers: {
                    'x-tenant-id': tenantId
                }
            }
        );

        const result = await response.json();

        if (!result.success) {
            console.log('❌ Failed to fetch payslip:', result.error);
            return;
        }

        const payslip = result.data;

        console.log('════════════════════════════════════════════════════════');
        console.log('                    PAYSLIP DETAILS                     ');
        console.log('════════════════════════════════════════════════════════\n');
        
        console.log(`Basic Salary:          GHS ${payslip.basicSalary.toFixed(2)}`);
        console.log(`Gross Pay:             GHS ${payslip.grossPay.toFixed(2)}`);
        
        if (payslip.grossPay !== payslip.basicSalary) {
            console.log(`                       (Adjusted for hours worked)`);
        }
        console.log('');
        
        // Employee Contributions
        console.log('EMPLOYEE CONTRIBUTIONS (Deducted from salary):');
        console.log('────────────────────────────────────────────────────────');
        console.log(`  SSNIT Employee (5.5%): GHS ${payslip.ssnitEmployee.toFixed(2)}`);
        console.log(`  PAYE Tax:              GHS ${payslip.paye.toFixed(2)}`);
        console.log(`  Total Deductions:      GHS ${payslip.totalDeductions.toFixed(2)}`);
        console.log('');
        
        // Employer Contributions
        console.log('EMPLOYER CONTRIBUTIONS (Company pays):');
        console.log('────────────────────────────────────────────────────────');
        console.log(`  SSNIT Employer (13%):  GHS ${payslip.ssnitEmployer.toFixed(2)}`);
        console.log(`  SSNIT Tier 1 (13.5%):  GHS ${payslip.ssnitTier1.toFixed(2)}`);
        console.log(`  SSNIT Tier 2 (5%):     GHS ${payslip.ssnitTier2.toFixed(2)}`);
        console.log('');
        console.log(`Net Pay:               GHS ${payslip.netPay.toFixed(2)}`);
        console.log('════════════════════════════════════════════════════════\n');

        // Verify calculations
        console.log('🔍 VERIFICATION (All based on GROSS PAY):');
        console.log('════════════════════════════════════════════════════════\n');
        
        const expectedSsnitEmployee = payslip.grossPay * 0.055;
        const expectedSsnitEmployer = payslip.grossPay * 0.13;
        const expectedApplicableSalary = Math.min(payslip.grossPay, 1500);
        const expectedTier1 = expectedApplicableSalary * 0.135;
        const expectedTier2 = expectedApplicableSalary * 0.05;

        // Employee SSNIT
        const employeeMatch = Math.abs(payslip.ssnitEmployee - expectedSsnitEmployee) < 0.01;
        console.log(`1. Employee SSNIT (5.5% of Gross Pay: ${payslip.grossPay.toFixed(2)})`);
        console.log(`   Expected: GHS ${expectedSsnitEmployee.toFixed(2)}`);
        console.log(`   Actual:   GHS ${payslip.ssnitEmployee.toFixed(2)}`);
        console.log(`   ${employeeMatch ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

        // Employer SSNIT (THE MAIN FIX)
        const employerMatch = Math.abs(payslip.ssnitEmployer - expectedSsnitEmployer) < 0.01;
        console.log(`2. Employer SSNIT (13% of Gross Pay: ${payslip.grossPay.toFixed(2)})`);
        console.log(`   Expected: GHS ${expectedSsnitEmployer.toFixed(2)}`);
        console.log(`   Actual:   GHS ${payslip.ssnitEmployer.toFixed(2)}`);
        console.log(`   ${employerMatch ? '✅ CORRECT - Using Gross Pay!' : '❌ INCORRECT - Still using Basic Salary!'}\n`);

        // Tier 1
        const tier1Match = Math.abs(payslip.ssnitTier1 - expectedTier1) < 0.01;
        console.log(`3. SSNIT Tier 1 (13.5% of applicable salary: ${expectedApplicableSalary.toFixed(2)})`);
        console.log(`   Expected: GHS ${expectedTier1.toFixed(2)}`);
        console.log(`   Actual:   GHS ${payslip.ssnitTier1.toFixed(2)}`);
        console.log(`   ${tier1Match ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

        // Tier 2
        const tier2Match = Math.abs(payslip.ssnitTier2 - expectedTier2) < 0.01;
        console.log(`4. SSNIT Tier 2 (5% of applicable salary: ${expectedApplicableSalary.toFixed(2)})`);
        console.log(`   Expected: GHS ${expectedTier2.toFixed(2)}`);
        console.log(`   Actual:   GHS ${payslip.ssnitTier2.toFixed(2)}`);
        console.log(`   ${tier2Match ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

        // Final summary
        console.log('════════════════════════════════════════════════════════');
        console.log('                      TEST RESULTS                      ');
        console.log('════════════════════════════════════════════════════════\n');
        
        if (employeeMatch && employerMatch && tier1Match && tier2Match) {
            console.log('✅ ALL TESTS PASSED!\n');
            console.log('✓ Employee contributions calculated on Gross Pay');
            console.log('✓ Employer contributions calculated on Gross Pay');
            console.log('✓ SSNIT Tier 1 calculated correctly');
            console.log('✓ SSNIT Tier 2 calculated correctly\n');
            console.log('The fix is working correctly! Employer contributions');
            console.log('are now based on GROSS PAY instead of Basic Salary.');
        } else {
            console.log('❌ SOME TESTS FAILED!\n');
            if (!employerMatch) {
                console.log('⚠️  Employer SSNIT is still using Basic Salary');
                console.log('    Expected (13% of gross): GHS ' + expectedSsnitEmployer.toFixed(2));
                console.log('    Actual: GHS ' + payslip.ssnitEmployer.toFixed(2));
            }
        }
        console.log('════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error during test:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testEmployerContributions();
