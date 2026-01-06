/**
 * Validate VAPID keys and test FCM compatibility
 * Run: node validate-vapid-keys.js
 */

import 'dotenv/config';
import webPush from 'web-push';

console.log('🔍 Validating VAPID Keys for FCM...\n');

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
    console.log('❌ VAPID keys not found in .env file');
    console.log('Run: node generate-vapid-keys.js\n');
    process.exit(1);
}

console.log('✅ Keys found in environment');
console.log('📌 Public Key:', publicKey.substring(0, 30) + '...');
console.log('📌 Private Key:', privateKey.substring(0, 30) + '...\n');

// Test key format
console.log('🔧 Testing key format...');

try {
    webPush.setVapidDetails(
        'mailto:vpenatechwizard@gmail.com',
        publicKey,
        privateKey
    );
    console.log('✅ VAPID details set successfully\n');
} catch (error) {
    console.log('❌ Invalid VAPID key format:', error.message);
    console.log('💡 Generate new keys: node generate-vapid-keys.js\n');
    process.exit(1);
}

// Verify key lengths
console.log('📏 Checking key lengths...');
console.log('   Public key length:', publicKey.length, publicKey.length === 88 ? '✅' : '⚠️ (expected 88)');
console.log('   Private key length:', privateKey.length, privateKey.length === 43 ? '✅' : '⚠️ (expected 43)');

// Check if keys start with correct prefixes
console.log('\n🔤 Checking key prefixes...');
console.log('   Public key starts with "B":', publicKey.startsWith('B') ? '✅' : '❌');
console.log('   Private key (base64):', privateKey.length > 40 ? '✅' : '❌');

console.log('\n━'.repeat(60));
console.log('📊 Summary\n');

if (publicKey.length === 88 && privateKey.length === 43 && publicKey.startsWith('B')) {
    console.log('✅ Keys appear valid!');
    console.log('\n💡 If you still get FCM errors, try:');
    console.log('   1. Generate NEW keys: node generate-vapid-keys.js');
    console.log('   2. Update production environment variables');
    console.log('   3. Restart your server');
    console.log('   4. Have users re-subscribe to notifications\n');
} else {
    console.log('⚠️ Keys may be invalid or corrupted');
    console.log('\n📝 Action required:');
    console.log('   1. Run: node generate-vapid-keys.js');
    console.log('   2. Copy new keys to .env');
    console.log('   3. Update production environment');
    console.log('   4. Restart server\n');
}
