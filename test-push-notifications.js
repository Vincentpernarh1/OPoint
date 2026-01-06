/**
 * Test script to verify push notification setup
 * Run: node test-push-notifications.js
 */

import 'dotenv/config';

console.log('🔍 Testing Push Notification Setup...\n');

// Check 1: VAPID Keys
console.log('1️⃣ Checking VAPID Keys...');
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
    console.log('   ❌ VAPID keys not found in environment');
    console.log('   📝 Run: node generate-vapid-keys.js');
    console.log('   💡 Then add the keys to your .env file\n');
} else if (publicKey.startsWith('BDefault') || privateKey.startsWith('Default')) {
    console.log('   ⚠️  Using default/test VAPID keys');
    console.log('   📝 Generate real keys with: node generate-vapid-keys.js\n');
} else {
    console.log('   ✅ VAPID keys configured');
    console.log('   📌 Public key: ' + publicKey.substring(0, 20) + '...');
    console.log('   📌 Private key: ' + privateKey.substring(0, 20) + '...\n');
}

// Check 2: Web Push Module
console.log('2️⃣ Checking web-push module...');
try {
    const webPush = await import('web-push');
    console.log('   ✅ web-push module installed\n');
    
    // Check 3: Validate keys format
    console.log('3️⃣ Validating VAPID keys format...');
    if (publicKey && privateKey && 
        !publicKey.startsWith('BDefault') && 
        !privateKey.startsWith('Default')) {
        try {
            webPush.default.setVapidDetails(
                'mailto:vpenatechwizard@gmail.com',
                publicKey,
                privateKey
            );
            console.log('   ✅ VAPID keys are valid\n');
        } catch (error) {
            console.log('   ❌ Invalid VAPID keys:', error.message);
            console.log('   📝 Generate new keys with: node generate-vapid-keys.js\n');
        }
    } else {
        console.log('   ⚠️  Skipped (no valid keys to validate)\n');
    }
} catch (error) {
    console.log('   ❌ web-push module not installed');
    console.log('   📝 Run: npm install web-push\n');
}

// Check 4: Service Worker
console.log('4️⃣ Checking Service Worker file...');
try {
    const fs = await import('fs');
    if (fs.default.existsSync('./public/sw.js')) {
        console.log('   ✅ Service worker file exists at /public/sw.js\n');
    } else {
        console.log('   ⚠️  Service worker not found at /public/sw.js');
        console.log('   📝 Service worker should be in the public folder\n');
    }
} catch (error) {
    console.log('   ⚠️  Could not check service worker file\n');
}

// Check 5: Database table (requires connection - skip for now)
console.log('5️⃣ Database table check...');
console.log('   💡 Run this SQL in Supabase to create the table:');
console.log('   📄 See: create_push_subscriptions_table.sql\n');

// Summary
console.log('━'.repeat(60));
console.log('📊 Setup Summary\n');

if (publicKey && privateKey && !publicKey.startsWith('BDefault')) {
    console.log('✅ Your push notification setup is ready!');
    console.log('\n📝 Next steps:');
    console.log('   1. Ensure database table exists (run SQL script)');
    console.log('   2. Start your server: npm start');
    console.log('   3. Log in to your app');
    console.log('   4. Allow notifications when prompted');
    console.log('   5. Post an announcement to test!\n');
} else {
    console.log('⚠️  Setup incomplete. Follow these steps:\n');
    console.log('   1. Run: node generate-vapid-keys.js');
    console.log('   2. Add keys to your .env file');
    console.log('   3. Run: node test-push-notifications.js (to verify)');
    console.log('   4. Create database table (run SQL script)');
    console.log('   5. Start your server and test!\n');
}

console.log('━'.repeat(60));
console.log('📖 Full guide: See PUSH_NOTIFICATIONS_SETUP.md\n');
