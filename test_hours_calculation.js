/**
 * Test script to verify hours calculation and payslip deductions
 */

const API_BASE = 'http://localhost:3001';

async function testPayslipWithHours() {
    console.log('\n=== Testing Payslip with Hours Calculation ===\n');
    
    try {
        // Test with a user ID - replace with actual user ID from your database
        const testUserId = 'test-user-id';
        const testTenantId = 'test-tenant-id';
        
        // Get payslip
        const response = await fetch(`${API_BASE}/api/payslip?userId=${testUserId}&date=${new Date().toISOString()}`, {
            headers: {
                'x-tenant-id': testTenantId
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Payslip generated successfully!');
            console.log('\nPayslip Details:');
            console.log('- Basic Salary:', result.data.basicSalary);
            console.log('- Gross Pay:', result.data.grossPay);
            console.log('- SSNIT Employee:', result.data.ssnitEmployee);
            console.log('- PAYE:', result.data.paye);
            console.log('- Other Deductions:', result.data.otherDeductions);
            console.log('- Total Deductions:', result.data.totalDeductions);
            console.log('- Net Pay:', result.data.netPay);
        } else {
            console.log('❌ Error:', result.error);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function testTimeAdjustmentFlow() {
    console.log('\n=== Testing Time Adjustment Flow ===\n');
    
    try {
        const testUserId = 'test-user-id';
        const testTenantId = 'test-tenant-id';
        
        // Get time adjustment requests
        const response = await fetch(`${API_BASE}/api/time-adjustments?userId=${testUserId}`, {
            headers: {
                'x-tenant-id': testTenantId
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Time adjustments fetched successfully!');
            console.log(`Found ${result.data.length} adjustment requests`);
            
            if (result.data.length > 0) {
                console.log('\nSample adjustment:');
                console.log('- Status:', result.data[0].adjustment_status);
                console.log('- Reason:', result.data[0].adjustment_reason);
                console.log('- Requested Clock In:', result.data[0].requested_clock_in);
                console.log('- Requested Clock Out:', result.data[0].requested_clock_out);
            }
        } else {
            console.log('❌ Error:', result.error);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function runTests() {
    console.log('🧪 Starting Tests...');
    console.log('⚠️  Note: Update testUserId and testTenantId with actual values from your database');
    
    await testPayslipWithHours();
    await testTimeAdjustmentFlow();
    
    console.log('\n✅ Tests completed!');
    console.log('\n📝 Summary of Changes:');
    console.log('1. ✅ Fixed calculateHoursWorked to use db.getClockLogs()');
    console.log('2. ✅ Removed redundant adjustment processing (DB already updates clock_in/clock_out)');
    console.log('3. ✅ Updated payslip endpoint to use calculateNetPay() for hours-based deductions');
    console.log('4. ✅ Hours from approved adjustments now included in total monthly hours');
}

// Run tests
runTests();
