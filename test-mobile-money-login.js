// Test mobile money number retrieval from login API

const API_BASE = 'http://localhost:3001';

async function testMobileMoneyRetrieval() {
    const loginData = {
        email: 'pernarhv@gmail.com', // Use the user that has mobile money set
        password: 'password123' // Use the correct password
    };

    try {
        console.log('Testing login API for mobile money number retrieval...');
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();
        console.log('Login Response Status:', response.status);
        console.log('Login Response:', JSON.stringify(result, null, 2));

        if (result.success && result.user) {
            console.log('\n✅ Login successful!');
            console.log('User ID:', result.user.id);
            console.log('User Name:', result.user.name);
            console.log('User Email:', result.user.email);
            console.log('Mobile Money Number:', result.user.mobileMoneyNumber || '❌ NOT FOUND');
            console.log('Mobile Money Number (snake_case):', result.user.mobile_money_number || '❌ NOT FOUND');

            if (result.user.mobileMoneyNumber) {
                console.log('✅ Mobile money number is present in camelCase format!');
            } else if (result.user.mobile_money_number) {
                console.log('✅ Mobile money number is present in snake_case format!');
            } else {
                console.log('❌ Mobile money number is missing from user data!');
            }
        } else {
            console.log('❌ Login failed:', result.error);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMobileMoneyRetrieval();