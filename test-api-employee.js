// Test employee creation through API

const API_BASE = 'http://localhost:3001';

async function testEmployeeCreation() {
    const tenantId = 'be711ae5-984f-42a8-a290-a7232d05e7ea'; // Vpena Teck company

    const employeeData = {
        name: 'Test Employee',
        email: 'test.employee@vpena.com',
        role: 'Employee',
        basic_salary: 2000
    };

    try {
        console.log('Making API request...');
        const response = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId
            },
            body: JSON.stringify(employeeData)
        });

        const result = await response.json();
        console.log('API Response:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('✅ Employee created successfully!');
            console.log('Employee ID:', result.data.id);
            console.log('Company Name:', result.data.company_name);
        } else {
            console.log('❌ Failed to create employee:', result.error);
            if (result.details) {
                console.log('Details:', result.details);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testEmployeeCreation();