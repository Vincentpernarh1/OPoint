// Quick Email Test Script
// Run this to test if email configuration is working
// Usage: node test-email.js

import { sendPasswordResetEmail } from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing Email Configuration...\n');

// Check if environment variables are set
console.log('📧 Email Configuration:');
console.log(`   Host: ${process.env.EMAIL_HOST || 'NOT SET'}`);
console.log(`   Port: ${process.env.EMAIL_PORT || 'NOT SET'}`);
console.log(`   User: ${process.env.EMAIL_USER || 'NOT SET'}`);
console.log(`   Password: ${process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'NOT SET'}`);
console.log('');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email configuration is incomplete!');
    console.log('Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
    process.exit(1);
}

// Test sending email
async function testEmail() {
    try {
        console.log('📤 Sending test email...');
        console.log(`   To: ${process.env.EMAIL_FROM}`);
        console.log('');

        const result = await sendPasswordResetEmail({
            to: process.env.EMAIL_FROM, // Send to the FROM address (vpenatechwizard@gmail.com)
            employeeName: 'Test User',
            tempPassword: 'TestPassword123!',
            resetBy: 'System Test'
        });

        console.log('');
        if (result.success) {
            console.log('✅ SUCCESS! Email sent successfully!');
            console.log(`   Message ID: ${result.messageId}`);
            console.log('');
            console.log('Check your inbox:', process.env.EMAIL_USER);
            console.log('✨ Email configuration is working correctly!');
        } else {
            console.log('❌ FAILED! Email was not sent.');
            console.log(`   Error: ${result.error}`);
            console.log(`   Message: ${result.message}`);
            console.log('');
            console.log('📖 See EMAIL_TROUBLESHOOTING.md for solutions');
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.log('');
        console.log('Common causes:');
        console.log('  1. Wrong App Password (not your regular Gmail password)');
        console.log('  2. 2FA not enabled on Gmail');
        console.log('  3. Old/revoked App Password');
        console.log('  4. Firewall blocking port 587');
        console.log('');
        console.log('📖 See EMAIL_TROUBLESHOOTING.md for detailed solutions');
    }
}

// Run test
testEmail();
