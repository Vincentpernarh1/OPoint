// Simple login test
import fetch from 'node-fetch';

async function testLogin() {
    try {
        console.log('Testing login...');
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'vpernarh@gmail.com',
                password: 'TestPass123!'
            }),
        });

        const data = await response.json();
        console.log('Login Response:', data);

        if (data.success) {
            console.log('✅ Login successful!');

            // Now test session check
            console.log('\nTesting session check...');
            const sessionResponse = await fetch('http://localhost:3001/api/auth/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const sessionData = await sessionResponse.json();
            console.log('Session Response:', sessionData);

            if (sessionData.success && sessionData.authenticated) {
                console.log('✅ Session check successful - user is authenticated!');
            } else {
                console.log('❌ Session check failed - user not authenticated');
            }
        } else {
            console.log('❌ Login failed:', data.error);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLogin();