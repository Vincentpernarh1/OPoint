// =====================================================
// Script to Initialize Test User Password
// =====================================================
// Run this script to set up the test user password
// Usage: node initialize-test-user.js
// =====================================================

const API_URL = 'http://localhost:3001';

async function initializeTestUser() {
    console.log('🔐 Initializing test user password...');
    
    try {
        const response = await fetch(`${API_URL}/api/auth/initialize-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'vpernarh@gmail.com',
                password: 'Vpernarh@20'
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Test user password initialized successfully!');
            console.log('📧 Email: vpernarh@gmail.com');
            console.log('🔑 Password: Vpernarh@20');
            console.log('\n✨ You can now login to the application!');
        } else {
            console.error('❌ Failed to initialize password:', data.error);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        console.log('\n⚠️  Make sure the server is running on port 3001');
        console.log('   Run: npm run dev (or node server.js)');
    }
}

initializeTestUser();
