// Let's reverse-engineer what the payslip SHOULD show based on screenshot

const basicSalary = 5200;
const grossPayScreenshot = 1952.40;
const deductionScreenshot = 3247.60;
const hoursNotWorkedScreenshot = 109.92;

console.log('🔍 REVERSE ENGINEERING FROM SCREENSHOT\n');
console.log('='.repeat(80));

// Calculate what expected hours must be
const hoursWorked = basicSalary - deductionScreenshot;
const expectedHoursFromDeduction = hoursWorked + hoursNotWorkedScreenshot;
const hourlyRateFromScreenshot = basicSalary / expectedHoursFromDeduction;
const actualHoursFromGrossPay = grossPayScreenshot / hourlyRateFromScreenshot;

console.log('\n📊 FROM DEDUCTION CALCULATION:');
console.log(`   Basic Salary: GHS ${basicSalary.toFixed(2)}`);
console.log(`   Deduction: -GHS ${deductionScreenshot.toFixed(2)}`);
console.log(`   Hours worked value: GHS ${hoursWorked.toFixed(2)}`);
console.log(`   Hours not worked: ${hoursNotWorkedScreenshot.toFixed(2)}`);
console.log(`   Total expected hours: ${expectedHoursFromDeduction.toFixed(2)}`);
console.log(`   Hourly rate: GHS ${hourlyRateFromScreenshot.toFixed(2)}`);

console.log('\n📊 FROM GROSS PAY CALCULATION:');
console.log(`   Gross Pay: GHS ${grossPayScreenshot.toFixed(2)}`);
console.log(`   Hourly rate: GHS ${hourlyRateFromScreenshot.toFixed(2)}`);
console.log(`   Hours worked: ${actualHoursFromGrossPay.toFixed(2)}`);

// Check if these match
const expectedFromHoursNotWorked = expectedHoursFromDeduction - hoursNotWorkedScreenshot;
console.log(`\n✓ Verification:`);
console.log(`   Hours worked (from deduction): ${expectedFromHoursNotWorked.toFixed(2)}`);
console.log(`   Hours worked (from gross pay): ${actualHoursFromGrossPay.toFixed(2)}`);
console.log(`   Match: ${Math.abs(expectedFromHoursNotWorked - actualHoursFromGrossPay) < 0.01 ? 'YES ✅' : 'NO ❌'}`);

// Now figure out pay period
console.log('\n\n📅 FIGURING OUT PAY PERIOD:');
console.log(`   Expected hours: ${expectedHoursFromDeduction.toFixed(2)}`);
console.log(`   Assuming 8 hours/day: ${(expectedHoursFromDeduction / 8).toFixed(2)} weekdays`);

const weekdaysNeeded = Math.round(expectedHoursFromDeduction / 8);

// Check different date ranges
const ranges = [
    { start: '2025-12-04', end: '2026-01-03', name: 'Screenshot period' },
    { start: '2025-12-09', end: '2026-01-03', name: 'Dec 9 - Jan 3' },
    { start: '2025-12-16', end: '2026-01-03', name: 'Dec 16 - Jan 3' },
    { start: '2025-12-23', end: '2026-01-03', name: 'Dec 23 - Jan 3' },
];

console.log('\n   Testing different date ranges:');

ranges.forEach(range => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    let weekdays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) weekdays++;
    }
    
    const hours = weekdays * 8;
    const match = Math.abs(hours - expectedHoursFromDeduction) < 0.5;
    
    console.log(`   ${range.name}: ${weekdays} weekdays = ${hours} hours ${match ? '✅ MATCH!' : ''}`);
});

// Calculate what hours were actually worked
console.log('\n\n💰 WHAT THE PAYSLIP SHOULD SHOW:');
console.log('='.repeat(80));
console.log(`   Hours worked: ${actualHoursFromGrossPay.toFixed(2)}`);
console.log(`   Hours not worked: ${hoursNotWorkedScreenshot.toFixed(2)}`);
console.log(`   Expected hours: ${expectedHoursFromDeduction.toFixed(2)}`);

// Now check with actual logged hours
console.log('\n\n📋 ACTUAL LOGGED HOURS (from previous analysis):');
console.log(`   December approved: 37 hours (removing Jan 3)`);
console.log(`   January 3 approved: 0.92 hours`);
console.log(`   Total approved: 37.92 hours`);

console.log(`\n   Screenshot shows worked: ${actualHoursFromGrossPay.toFixed(2)} hours`);
console.log(`   Actual approved hours: 37.92 hours`);
console.log(`   Difference: ${(actualHoursFromGrossPay - 37.92).toFixed(2)} hours`);

if (Math.abs(actualHoursFromGrossPay - 37.92) > 5) {
    console.log('\n   ⚠️  MAJOR DISCREPANCY!');
    console.log(`   The payslip is showing ${actualHoursFromGrossPay.toFixed(2)} hours worked`);
    console.log(`   But only 37.92 hours are approved in the database`);
    console.log(`   Extra hours being counted: ${(actualHoursFromGrossPay - 37.92).toFixed(2)}`);
}

// Check December 30 duplicates
console.log('\n\n🔍 DECEMBER 30 DUPLICATE ANALYSIS:');
console.log(`   4 entries × 4 hours = 16 hours total`);
console.log(`   Should be: 4 hours (1 entry)`);
console.log(`   Overcounted: 12 hours`);
console.log(`\n   If we remove duplicates:`);
console.log(`   37.92 - 12 = 25.92 hours`);
console.log(`   Still ${(actualHoursFromGrossPay - 25.92).toFixed(2)} hours short of payslip`);
