import fetch from 'node-fetch';

async function testProfileUpdateRequest() {
    try {
        console.log('🧪 Testing profile update request API...');

        const response = await fetch('http://localhost:3001/api/profile-update-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'session_token=test_token' // This will likely fail auth, but let's see the error
            },
            body: JSON.stringify({
                field_name: 'mobile_money_number',
                requested_value: '0245556667'
            })
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response:', result);

    } catch (error) {
        console.error('❌ Error testing API:', error.message);
    }
}

testProfileUpdateRequest();