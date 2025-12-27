// Test Reports API with userId filtering

const API_BASE = 'http://localhost:3001';

async function testReportsAPI() {
    const tenantId = 'be711ae5-984f-42a8-a290-a7232d05e7ea'; // Vpena Teck company

    console.log('Testing Reports API with userId filtering...\n');

    // Test 1: Get all employees' SSNIT report (no userId)
    console.log('1. Testing SSNIT report for all employees:');
    try {
        const response1 = await fetch(`${API_BASE}/api/reports?type=ssnit`, {
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId
            }
        });
        const result1 = await response1.json();
        console.log(`   Status: ${response1.status}`);
        console.log(`   Success: ${result1.success}`);
        console.log(`   Records returned: ${result1.data ? result1.data.length : 0}`);
        if (result1.data && result1.data.length > 0) {
            console.log(`   Sample record: ${JSON.stringify(result1.data[0], null, 2)}`);
        }
    } catch (error) {
        console.error('   Error:', error.message);
    }

    console.log('\n2. Testing SSNIT report for specific employee (userId):');
    // First, let's get a user ID from the users endpoint
    try {
        const usersResponse = await fetch(`${API_BASE}/api/users`, {
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId
            }
        });
        const usersResult = await usersResponse.json();

        if (usersResult.success && usersResult.data && usersResult.data.length > 0) {
            const testUserId = usersResult.data[0].id;
            console.log(`   Using user ID: ${testUserId} (${usersResult.data[0].name})`);

            // Test 2: Get SSNIT report for specific employee
            const response2 = await fetch(`${API_BASE}/api/reports?type=ssnit&userId=${testUserId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                }
            });
            const result2 = await response2.json();
            console.log(`   Status: ${response2.status}`);
            console.log(`   Success: ${result2.success}`);
            console.log(`   Records returned: ${result2.data ? result2.data.length : 0}`);
            if (result2.data && result2.data.length > 0) {
                console.log(`   Sample record: ${JSON.stringify(result2.data[0], null, 2)}`);
            } else {
                console.log('   No records found for this specific employee (this is expected if they have no SSNIT data)');
            }
        } else {
            console.log('   No users found to test with');
        }
    } catch (error) {
        console.error('   Error:', error.message);
    }

    console.log('\n3. Testing PAYE report for all employees:');
    try {
        const response3 = await fetch(`${API_BASE}/api/reports?type=paye`, {
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId
            }
        });
        const result3 = await response3.json();
        console.log(`   Status: ${response3.status}`);
        console.log(`   Success: ${result3.success}`);
        console.log(`   Records returned: ${result3.data ? result3.data.length : 0}`);
    } catch (error) {
        console.error('   Error:', error.message);
    }

    console.log('\n✅ Reports API test completed!');
}

testReportsAPI();