// Test profile update request API
const API_BASE = 'http://localhost:3001';

async function testProfileUpdateRequest() {
    const requestData = {
        user_id: '80e1d704-c079-4bbb-91a0-37df4de85546', // pernarhv@gmail.com user ID
        field_name: 'mobile_money_number',
        requested_value: '0549681880',
        current_value: ''
    };

    try {
        console.log('Testing profile update request API...');
        const response = await fetch(`${API_BASE}/api/profile-update-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': '529201de-e07b-4dc6-baf3-7182166d565b'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testProfileUpdateRequest();