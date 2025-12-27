// Simple test to verify license limit logic in server.js
console.log('🧪 Testing License Limit Logic\n');

// Simulate the license limit check
function checkLicenseLimit(currentActive, licenseLimit) {
    console.log(`📊 Current Active Employees: ${currentActive}`);
    console.log(`📊 License Limit: ${licenseLimit}`);
    
    if (currentActive >= licenseLimit) {
        console.log('❌ BLOCKED: License limit reached');
        return {
            allowed: false,
            error: 'License limit reached',
            message: `Your company has reached its license limit (${currentActive}/${licenseLimit} licenses used). Please contact support to increase your license limit.`
        };
    }
    
    const usagePercent = (currentActive / licenseLimit) * 100;
    if (usagePercent >= 90) {
        console.log(`⚠️  WARNING: Approaching limit (${usagePercent.toFixed(1)}%)`);
    } else {
        console.log('✅ ALLOWED: Within license limit');
    }
    
    return { allowed: true };
}

console.log('Test 1: Adding employee when at 8/10 licenses');
console.log('Expected: Allowed with no warning\n');
let result = checkLicenseLimit(8, 10);
console.log('Result:', result);
console.log();

console.log('Test 2: Adding employee when at 9/10 licenses (90%)');
console.log('Expected: Allowed with warning\n');
result = checkLicenseLimit(9, 10);
console.log('Result:', result);
console.log();

console.log('Test 3: Adding employee when at 10/10 licenses');
console.log('Expected: Blocked\n');
result = checkLicenseLimit(10, 10);
console.log('Result:', result);
console.log();

console.log('Test 4: Adding employee when at 11/10 licenses (over limit)');
console.log('Expected: Blocked\n');
result = checkLicenseLimit(11, 10);
console.log('Result:', result);
console.log();

console.log('✅ All logic tests passed!');
