/**
 * Generate VAPID keys for Web Push Notifications
 * Run this once: node generate-vapid-keys.js
 * Then add the keys to your .env file
 */

import webPush from 'web-push';

console.log('🔐 Generating VAPID keys for push notifications...\n');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('✅ VAPID Keys Generated!\n');
console.log('Add these to your .env file:\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);

// Validation
console.log('\n📏 Key Validation:');
console.log('   Public key length:', vapidKeys.publicKey.length, vapidKeys.publicKey.length === 88 ? '✅' : '⚠️');
console.log('   Private key length:', vapidKeys.privateKey.length, vapidKeys.privateKey.length === 43 ? '✅' : '⚠️');

console.log('\n📧 Contact email for VAPID: mailto:vpenatechwizard@gmail.com');
console.log('\n⚠️  Keep these keys secure! Do not commit them to Git.');

if (vapidKeys.publicKey.length !== 88) {
    console.log('\n⚠️  WARNING: Public key should be 88 characters!');
    console.log('   Run this script again to generate new keys.');
}
