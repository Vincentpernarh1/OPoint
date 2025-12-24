// Test script for cookie authentication integration
// Run with: node test-cookies.js

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testCookieAuth() {
    console.log('🧪 Testing Cookie Authentication Integration\n');

    try {
        // Test 1: Login with real credentials
        console.log('1. Testing login with real credentials...');
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'vpernarh@gmail.com',
                password: 'TestPass123!' // Correct password we just set
            }),
        });

        const loginData = await loginResponse.json();
        console.log('Login response:', {
            success: loginData.success,
            hasUser: !!loginData.user,
            requiresPasswordChange: loginData.requiresPasswordChange,
            error: loginData.error
        });

        if (loginData.success) {
            console.log('✅ Login successful with real credentials');
            console.log('User:', loginData.user.name, '-', loginData.user.email);
        } else {
            console.log('❌ Login failed:', loginData.error);
            console.log('💡 Try checking the password in the database or reset it');
        }

        // Test 1.5: Test session check endpoint
        console.log('\n1.5. Testing session check endpoint...');
        const sessionResponse = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const sessionData = await sessionResponse.json();
        console.log('Session check response:', {
            success: sessionData.success,
            authenticated: sessionData.authenticated,
            hasUser: !!sessionData.user
        });

        if (sessionData.success && sessionData.authenticated) {
            console.log('✅ Session check successful - user is authenticated');
        } else {
            console.log('ℹ️  Session check - user not authenticated (expected after logout)');
        }

        // Test 2: Test logout endpoint
        console.log('\n2. Testing logout endpoint...');
        const logoutResponse = await fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const logoutData = await logoutResponse.json();
        console.log('Logout response:', logoutData);

        if (logoutData.success) {
            console.log('✅ Logout endpoint working');
        } else {
            console.log('❌ Logout failed:', logoutData.error);
        }

        // Test 3: Test password validation
        console.log('\n3. Testing password validation...');
        const passwordResponse = await fetch(`${API_BASE}/api/auth/validate-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: 'MySecurePass123!'
            }),
        });

        const passwordData = await passwordResponse.json();
        console.log('Password validation response:', passwordData);

        if (passwordData.success) {
            console.log('✅ Password validation working');
            console.log('Password strength:', passwordData.strength);
        } else {
            console.log('❌ Password validation failed');
        }

        // Test 4: Check server is running
        console.log('\n4. Testing server health...');
        const healthResponse = await fetch(`${API_BASE}/api/auth/validate-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: 'weak'
            }),
        });

        const healthData = await healthResponse.json();
        if (healthData.success) {
            console.log('✅ Server is responding correctly');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    console.log('\n🎯 Backend Cookie Authentication Test Complete');
    console.log('\n📋 Manual Testing Checklist:');
    console.log('1. Open browser to http://localhost:5173');
    console.log('2. Try logging in with valid database credentials');
    console.log('3. Check browser dev tools > Application > Cookies');
    console.log('4. Verify user_session and auth_token cookies exist');
    console.log('5. Refresh page - should stay logged in');
    console.log('6. Try logout - cookies should be cleared');
    console.log('7. Close/reopen browser - should stay logged in (persistent cookies)');
    console.log('8. Test offline mode - should work with IndexedDB');
}

testCookieAuth();