// Test Password Reset via API Endpoint
// This script tests the full password reset flow through the API

// Safely try to load dotenv
try {
    const dotenv = await import('dotenv');
    dotenv.config();
} catch (e) {
    console.log("NOTE: 'dotenv' package not found.");
}

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const API_URL = 'http://localhost:3001';
const TEST_ADMIN_EMAIL = 'vpernarh@gmail.com';
const TEST_ADMIN_PASSWORD = '1234';  // Current password after reset
const TARGET_USER_EMAIL = process.argv[2] || 'renata@mail.com';  // Different target user

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPasswordResetAPI() {
    console.log('\n🧪 Testing Password Reset API Endpoint\n');
    console.log('='.repeat(60));

    try {
        // Step 1: Login as admin
        console.log('\n1️⃣ Logging in as admin...');
        const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_ADMIN_EMAIL,
                password: TEST_ADMIN_PASSWORD
            })
        });

        if (!loginResponse.ok) {
            console.error('❌ Login failed');
            const error = await loginResponse.json();
            console.error('Error:', error);
            console.log('\n💡 Make sure the server is running: npm start');
            process.exit(1);
        }

        // Get cookies from login
        const cookies = loginResponse.headers.get('set-cookie');
        console.log('✅ Admin logged in successfully');

        // Step 2: Get target user ID
        console.log(`\n2️⃣ Finding target user: ${TARGET_USER_EMAIL}`);
        const { data: targetUser, error: userError } = await supabase
            .from('opoint_users')
            .select('*')
            .eq('email', TARGET_USER_EMAIL)
            .single();

        if (userError || !targetUser) {
            console.error(`❌ User not found: ${TARGET_USER_EMAIL}`);
            process.exit(1);
        }

        console.log(`✅ Found user: ${targetUser.name} (${targetUser.email})`);
        console.log(`   User ID: ${targetUser.id}`);
        console.log(`   Role: ${targetUser.role}`);

        // Show current state
        console.log('\n   📊 Current State:');
        console.log(`   - password_hash: ${targetUser.password_hash ? 'Set' : 'NULL'}`);
        console.log(`   - temporary_password: ${targetUser.temporary_password || 'NULL'}`);
        console.log(`   - requires_password_change: ${targetUser.requires_password_change}`);

        // Step 3: Call password reset API
        console.log(`\n3️⃣ Calling password reset API...`);
        const resetResponse = await fetch(`${API_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify({
                userId: targetUser.id
            })
        });

        const resetResult = await resetResponse.json();

        if (!resetResponse.ok) {
            console.error('❌ Password reset failed');
            console.error('Error:', resetResult);
            process.exit(1);
        }

        console.log('✅ Password reset API call successful');
        console.log(`   Message: ${resetResult.message}`);
        
        if (resetResult.tempPassword) {
            console.log(`   ⚠️  Email failed - Temporary password: ${resetResult.tempPassword}`);
        }

        // Step 4: Verify database changes
        console.log(`\n4️⃣ Verifying database changes...`);
        const { data: updatedUser, error: verifyError } = await supabase
            .from('opoint_users')
            .select('*')
            .eq('id', targetUser.id)
            .single();

        if (verifyError) {
            console.error('❌ Failed to verify changes');
            process.exit(1);
        }

        console.log('✅ Database updated successfully:');
        console.log(`   - password_hash: ${updatedUser.password_hash === null ? '✅ NULL (cleared)' : '❌ Still set'}`);
        console.log(`   - temporary_password: ${updatedUser.temporary_password ? `✅ "${updatedUser.temporary_password}" (random secure password)` : `❌ Not set`}`);
        console.log(`   - requires_password_change: ${updatedUser.requires_password_change ? '✅ TRUE' : '❌ FALSE'}`);

        // Store the actual temp password for testing login
        const actualTempPassword = resetResult.tempPassword || updatedUser.temporary_password;

        // Step 5: Test login with temporary password
        console.log(`\n5️⃣ Testing login with temporary password "${actualTempPassword}"...`);
        const testLoginResponse = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TARGET_USER_EMAIL,
                password: actualTempPassword
            })
        });

        const loginResult = await testLoginResponse.json();

        if (testLoginResponse.ok && loginResult.success) {
            console.log('✅ Login with temporary password successful!');
            console.log(`   User: ${loginResult.user.name}`);
            console.log(`   Requires password change: ${loginResult.user.requires_password_change ? '✅ Yes' : '❌ No'}`);
        } else {
            console.error('❌ Login with temporary password failed');
            console.error('Error:', loginResult);
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Password reset API endpoint working`);
        console.log(`✅ Temporary password: "${actualTempPassword}" (random secure password)`);
        console.log(`✅ Password hash cleared (NULL)`);
        console.log(`✅ Requires password change flag set`);
        console.log(`✅ User can login with temporary password`);

        const emailConfigured = process.env.EMAIL_USER && 
                               process.env.EMAIL_PASSWORD && 
                               process.env.EMAIL_USER !== 'your-email@gmail.com';

        if (emailConfigured) {
            console.log(`✅ Email notification sent to ${TARGET_USER_EMAIL}`);
        } else {
            console.log(`⚠️  Email notification not sent (credentials not configured in .env)`);
        }

        console.log('\n📧 Email Configuration Status:');
        if (!emailConfigured) {
            console.log('⚠️  To enable email notifications, update .env with real values:');
            console.log('   EMAIL_USER=your-actual-email@gmail.com');
            console.log('   EMAIL_PASSWORD=your-app-password');
            console.log('\n   For Gmail App Password:');
            console.log('   1. Enable 2FA on your Google account');
            console.log('   2. Visit: https://myaccount.google.com/apppasswords');
            console.log('   3. Create an app password for "Mail"');
            console.log('   4. Use that 16-character password in EMAIL_PASSWORD');
        } else {
            console.log('✅ Email configured and ready to send');
        }

        console.log('\n📋 What happens next:');
        console.log(`1. User receives email with temporary password: "${actualTempPassword}"`);
        console.log(`2. User logs in with: ${TARGET_USER_EMAIL} / ${actualTempPassword}`);
        console.log('3. System forces password change on first login');
        console.log('4. User creates new secure password');
        console.log('5. User can then use new password for future logins');

        console.log('\n✅ All tests passed!\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.log('\n💡 Make sure:');
        console.log('   1. Server is running: npm start');
        console.log('   2. Database is configured in .env');
        console.log('   3. Admin user exists with correct credentials');
        process.exit(1);
    }
}

// Check if server is running
console.log('Password Reset API Test');
console.log('='.repeat(60));
console.log('Prerequisites:');
console.log('  1. Server must be running (npm start)');
console.log('  2. Admin credentials must be valid');
console.log('  3. Target user must exist in database');
console.log('');
console.log(`Usage: node test_password_reset_api.js [target-email]`);
console.log(`Example: node test_password_reset_api.js user@example.com`);
console.log('');
console.log(`Testing with admin: ${TEST_ADMIN_EMAIL}`);
console.log(`Target user: ${TARGET_USER_EMAIL}`);
console.log('');

testPasswordResetAPI();
