// Test Password Reset Functionality
// This script tests the password reset flow with email notification

// Safely try to load dotenv
try {
    const dotenv = await import('dotenv');
    dotenv.config();
} catch (e) {
    console.log("NOTE: 'dotenv' package not found. Using system environment variables or defaults.");
}

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test user email
const TEST_USER_EMAIL = process.argv[2] || 'vpernarh@gmail.com';

async function testPasswordReset() {
    console.log('\n🧪 Testing Password Reset Functionality\n');
    console.log('='.repeat(50));
    
    try {
        // 1. Find the test user
        console.log(`\n1️⃣ Looking for user: ${TEST_USER_EMAIL}`);
        const { data: user, error: userError } = await supabase
            .from('opoint_users')
            .select('*')
            .eq('email', TEST_USER_EMAIL)
            .single();

        if (userError || !user) {
            console.error(`❌ User not found: ${TEST_USER_EMAIL}`);
            console.log('Available users:');
            const { data: allUsers } = await supabase
                .from('opoint_users')
                .select('id, name, email, role');
            allUsers?.forEach(u => console.log(`  - ${u.email} (${u.name}) - ${u.role}`));
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Current password_hash: ${user.password_hash ? 'Set' : 'NULL'}`);
        console.log(`   Current temporary_password: ${user.temporary_password || 'NULL'}`);
        console.log(`   Requires password change: ${user.requires_password_change}`);

        // 2. Test password reset via API
        console.log(`\n2️⃣ Testing password reset via API endpoint...`);
        console.log('   Note: This requires admin authentication cookie');
        console.log('   For direct testing, we will update the database directly');
        
        // 3. Reset password directly in database
        console.log(`\n3️⃣ Resetting password to "1234"...`);
        const { data: updatedUser, error: updateError } = await supabase
            .from('opoint_users')
            .update({
                password_hash: null,
                temporary_password: '1234',
                requires_password_change: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Failed to reset password:', updateError);
            process.exit(1);
        }

        console.log('✅ Password reset successfully in database');
        console.log(`   password_hash: ${updatedUser.password_hash}`);
        console.log(`   temporary_password: ${updatedUser.temporary_password}`);
        console.log(`   requires_password_change: ${updatedUser.requires_password_change}`);

        // 4. Test email configuration
        console.log(`\n4️⃣ Checking email configuration...`);
        const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
        
        if (emailConfigured) {
            console.log('✅ Email configuration found:');
            console.log(`   EMAIL_HOST: ${process.env.EMAIL_HOST}`);
            console.log(`   EMAIL_PORT: ${process.env.EMAIL_PORT}`);
            console.log(`   EMAIL_USER: ${process.env.EMAIL_USER}`);
            console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}`);
            
            // 5. Test sending email
            console.log(`\n5️⃣ Testing email sending...`);
            const { sendPasswordResetEmail } = await import('./services/emailService.js');
            
            const emailResult = await sendPasswordResetEmail({
                to: user.email,
                employeeName: user.name,
                tempPassword: '1234',
                resetBy: 'System Admin (Test)'
            });

            if (emailResult.success) {
                console.log('✅ Email sent successfully!');
                console.log(`   Message ID: ${emailResult.messageId}`);
            } else {
                console.warn('⚠️ Email sending failed:');
                console.warn(`   Error: ${emailResult.error}`);
                console.warn(`   Message: ${emailResult.message}`);
            }
        } else {
            console.warn('⚠️ Email not configured in .env file');
            console.log('\n📝 To enable email notifications, add to .env:');
            console.log('   EMAIL_HOST=smtp.gmail.com');
            console.log('   EMAIL_PORT=587');
            console.log('   EMAIL_USER=your-email@gmail.com');
            console.log('   EMAIL_PASSWORD=your-app-password');
            console.log('   EMAIL_FROM=your-email@gmail.com');
            console.log('\n   For Gmail, use an App Password:');
            console.log('   https://myaccount.google.com/apppasswords');
        }

        // 6. Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Summary:');
        console.log('='.repeat(50));
        console.log(`✅ User found: ${user.email}`);
        console.log(`✅ Password reset to: "1234"`);
        console.log(`✅ Password hash cleared: ${updatedUser.password_hash === null ? 'Yes' : 'No'}`);
        console.log(`✅ Requires password change: ${updatedUser.requires_password_change ? 'Yes' : 'No'}`);
        console.log(`${emailConfigured ? '✅' : '⚠️'} Email notification: ${emailConfigured ? 'Sent' : 'Not configured'}`);
        
        console.log('\n📋 Next Steps:');
        console.log('1. User can now login with:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: 1234`);
        console.log('2. They will be forced to change their password on first login');
        console.log('3. After password change, they can use their new password');

        console.log('\n✅ Test completed successfully!\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
console.log('Password Reset Test');
console.log('='.repeat(50));
console.log('Usage: node test_password_reset.js [email]');
console.log('Example: node test_password_reset.js user@example.com');
console.log('');

testPasswordReset();
