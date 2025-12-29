const API_BASE = 'http://localhost:3001';

async function testEmployerContributions() {
    console.log('\n========================================');
    console.log('Testing Employer Contributions Fix');
    console.log('========================================\n');

    // Test with a known user - Bob Williams (ID: 2, Basic Salary: 6000)
    const testUserId = '2';
    const testTenantId = 'c1'; // Vertex company

    try {
        // Step 1: Get payslip for the user
        console.log('📊 Step 1: Fetching Payslip...\n');
        const payslipResponse = await fetch(
            `${API_BASE}/api/payslips/${testUserId}/${new Date().toISOString()}`,
            {
                headers: {
                    'x-tenant-id': testTenantId
                }
            }
        );

        const payslipResult = await payslipResponse.json();

        if (!payslipResult.success) {
            console.log('❌ Failed to fetch payslip:', payslipResult.error);
            return;
        }

        const payslip = payslipResult.data;

        console.log('Employee: Bob Williams');
        console.log('────────────────────────────────────────');
        console.log(`Basic Salary:          GHS ${payslip.basicSalary.toFixed(2)}`);
        console.log(`Gross Pay:             GHS ${payslip.grossPay.toFixed(2)}`);
        console.log('');
        
        // Employee Contributions
        console.log('EMPLOYEE CONTRIBUTIONS (Deducted from salary):');
        console.log(`  SSNIT Employee (5.5%): GHS ${payslip.ssnitEmployee.toFixed(2)}`);
        console.log(`  PAYE Tax:              GHS ${payslip.paye.toFixed(2)}`);
        console.log(`  Total Deductions:      GHS ${payslip.totalDeductions.toFixed(2)}`);
        console.log('');
        
        // Employer Contributions
        console.log('EMPLOYER CONTRIBUTIONS (Company pays to tax authorities):');
        console.log(`  SSNIT Employer (13%):  GHS ${payslip.ssnitEmployer.toFixed(2)}`);
        console.log(`  SSNIT Tier 1 (13.5%):  GHS ${payslip.ssnitTier1.toFixed(2)}`);
        console.log(`  SSNIT Tier 2 (5%):     GHS ${payslip.ssnitTier2.toFixed(2)}`);
        console.log('');
        console.log(`Net Pay:               GHS ${payslip.netPay.toFixed(2)}`);
        console.log('────────────────────────────────────────\n');

        // Verify calculations
        console.log('🔍 VERIFICATION:\n');
        
        const expectedSsnitEmployee = payslip.grossPay * 0.055;
        const expectedSsnitEmployer = payslip.grossPay * 0.13;
        const expectedApplicableSalary = Math.min(payslip.grossPay, 1500);
        const expectedTier1 = expectedApplicableSalary * 0.135;
        const expectedTier2 = expectedApplicableSalary * 0.05;

        // Check if employee contribution is based on gross pay
        const employeeMatch = Math.abs(payslip.ssnitEmployee - expectedSsnitEmployee) < 0.01;
        console.log(`Employee SSNIT (5.5% of ${payslip.grossPay.toFixed(2)})`);
        console.log(`  Expected: GHS ${expectedSsnitEmployee.toFixed(2)}`);
        console.log(`  Actual:   GHS ${payslip.ssnitEmployee.toFixed(2)}`);
        console.log(`  ${employeeMatch ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

        // Check if employer contribution is based on gross pay (THIS IS THE FIX)
        const employerMatch = Math.abs(payslip.ssnitEmployer - expectedSsnitEmployer) < 0.01;
        console.log(`Employer SSNIT (13% of ${payslip.grossPay.toFixed(2)})`);
        console.log(`  Expected: GHS ${expectedSsnitEmployer.toFixed(2)}`);
        console.log(`  Actual:   GHS ${payslip.ssnitEmployer.toFixed(2)}`);
        console.log(`  ${employerMatch ? '✅ CORRECT - Using Gross Pay!' : '❌ INCORRECT - Still using Basic Salary!'}\n`);

        const tier1Match = Math.abs(payslip.ssnitTier1 - expectedTier1) < 0.01;
        console.log(`SSNIT Tier 1 (13.5% of ${expectedApplicableSalary.toFixed(2)})`);
        console.log(`  Expected: GHS ${expectedTier1.toFixed(2)}`);
        console.log(`  Actual:   GHS ${payslip.ssnitTier1.toFixed(2)}`);
        console.log(`  ${tier1Match ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

        const tier2Match = Math.abs(payslip.ssnitTier2 - expectedTier2) < 0.01;
        console.log(`SSNIT Tier 2 (5% of ${expectedApplicableSalary.toFixed(2)})`);
        console.log(`  Expected: GHS ${expectedTier2.toFixed(2)}`);
        console.log(`  Actual:   GHS ${payslip.ssnitTier2.toFixed(2)}`);
        console.log(`  ${tier2Match ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

        // Final summary
        console.log('════════════════════════════════════════');
        if (employeeMatch && employerMatch && tier1Match && tier2Match) {
            console.log('✅ ALL TESTS PASSED!');
            console.log('Employer contributions are now correctly');
            console.log('calculated based on GROSS PAY.');
        } else {
            console.log('❌ SOME TESTS FAILED!');
            console.log('Please check the calculations above.');
        }
        console.log('════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error during test:', error.message);
    }
}

// Run the test
testEmployerContributions();
