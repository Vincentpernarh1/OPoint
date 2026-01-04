// Correct reverse engineering

const basicSalary = 5200;
const grossPayScreenshot = 1952.40;
const hoursNotWorkedScreenshot = 109.92;
const deductionScreenshot = 3247.60;

console.log('🔍 CORRECT REVERSE ENGINEERING\n');
console.log('='.repeat(80));

// The formula is:
// deduction = hourlyRate × hoursNotWorked
// grossPay = basicSalary - deduction
// OR: grossPay = hourlyRate × hoursWorked

console.log('\n📐 METHOD 1: From deduction amount');
console.log(`   Deduction: GHS ${deductionScreenshot.toFixed(2)}`);
console.log(`   Hours not worked: ${hoursNotWorkedScreenshot.toFixed(2)}`);
const hourlyRateFromDeduction = deductionScreenshot / hoursNotWorkedScreenshot;
console.log(`   Hourly rate: ${deductionScreenshot.toFixed(2)} ÷ ${hoursNotWorkedScreenshot.toFixed(2)} = GHS ${hourlyRateFromDeduction.toFixed(2)}`);

const expectedHoursMethod1 = basicSalary / hourlyRateFromDeduction;
console.log(`   Expected hours: ${basicSalary.toFixed(2)} ÷ ${hourlyRateFromDeduction.toFixed(2)} = ${expectedHoursMethod1.toFixed(2)}`);

const hoursWorkedMethod1 = expectedHoursMethod1 - hoursNotWorkedScreenshot;
console.log(`   Hours worked: ${expectedHoursMethod1.toFixed(2)} - ${hoursNotWorkedScreenshot.toFixed(2)} = ${hoursWorkedMethod1.toFixed(2)}`);

const calculatedGrossPay = hoursWorkedMethod1 * hourlyRateFromDeduction;
console.log(`   Calculated gross pay: ${hoursWorkedMethod1.toFixed(2)} × ${hourlyRateFromDeduction.toFixed(2)} = GHS ${calculatedGrossPay.toFixed(2)}`);
console.log(`   Screenshot gross pay: GHS ${grossPayScreenshot.toFixed(2)}`);
console.log(`   Match: ${Math.abs(calculatedGrossPay - grossPayScreenshot) < 0.1 ? 'YES ✅' : 'NO ❌'}`);

console.log('\n📅 PAY PERIOD ANALYSIS:');
console.log(`   Expected hours: ${expectedHoursMethod1.toFixed(2)}`);
console.log(`   Weekdays needed (÷8): ${(expectedHoursMethod1 / 8).toFixed(2)}`);

const weekdaysNeeded = Math.round(expectedHoursMethod1 / 8);
console.log(`   Rounded: ~${weekdaysNeeded} weekdays`);

// Test different date ranges
const ranges = [
    { start: '2025-12-04', end: '2026-01-03', days: 31 },
    { start: '2025-12-09', end: '2026-01-03', days: 26 },
    { start: '2025-12-02', end: '2026-01-03', days: 33 },
    { start: '2025-11-27', end: '2026-01-03', days: 38 },
];

console.log('\n   Checking possible pay periods:');
ranges.forEach(range => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    let weekdays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) weekdays++;
    }
    
    const hours = weekdays * 8;
    const diff = Math.abs(hours - expectedHoursMethod1);
    const match = diff < 1;
    
    console.log(`   ${range.start} to ${range.end}: ${weekdays} weekdays = ${hours} hours ${match ? '✅ MATCH!' : `(off by ${diff.toFixed(1)})`}`);
});

console.log('\n\n💡 COMPARING TO ACTUAL DATA:');
console.log('='.repeat(80));
console.log(`   Payslip shows hours worked: ${hoursWorkedMethod1.toFixed(2)}`);
console.log(`   Database has approved hours: 37.92`);
console.log(`   Difference: ${(hoursWorkedMethod1 - 37.92).toFixed(2)} hours`);

console.log('\n   Possible explanations:');
console.log(`   1. There are ${(hoursWorkedMethod1 - 37.92).toFixed(0)} more approved hours in the database`);
console.log(`   2. The payslip is using a different calculation method`);
console.log(`   3. There's a bug in the hours calculation function`);

// Check what the correct payslip should be with 37.92 hours
console.log('\n\n✅ CORRECT PAYSLIP WITH 37.92 HOURS:');
console.log('='.repeat(80));
const correctHourlyRate = basicSalary / expectedHoursMethod1;
const correctGrossPay = 37.92 * correctHourlyRate;
const correctDeduction = basicSalary - correctGrossPay;
const correctHoursNotWorked = expectedHoursMethod1 - 37.92;
const correctSsnit = correctGrossPay * 0.055;
const correctNetPay = correctGrossPay - correctSsnit;

console.log(`   Expected hours: ${expectedHoursMethod1.toFixed(2)}`);
console.log(`   Hours worked: 37.92`);
console.log(`   Hours not worked: ${correctHoursNotWorked.toFixed(2)}`);
console.log(`   Hourly rate: GHS ${correctHourlyRate.toFixed(2)}`);
console.log(`   Gross pay: GHS ${correctGrossPay.toFixed(2)}`);
console.log(`   Deduction: -GHS ${correctDeduction.toFixed(2)}`);
console.log(`   SSNIT: -GHS ${correctSsnit.toFixed(2)}`);
console.log(`   Net pay: GHS ${correctNetPay.toFixed(2)}`);
