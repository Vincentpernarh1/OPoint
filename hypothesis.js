// What if the system is calculating January as a full month?

const basicSalary = 5200;
const januaryWeekdays = 22;  // Jan 2026 has 22 weekdays
const expectedHoursJanuary = januaryWeekdays * 8; // 176 hours

console.log('Hypothesis: Payslip is for January 2026 full month\n');
console.log(`Expected hours in January: ${expectedHoursJanuary}`);
console.log(`Hours not worked (from screenshot): 109.92`);
console.log(`Hours worked: ${expectedHoursJanuary} - 109.92 = ${(expectedHoursJanuary - 109.92).toFixed(2)}`);

// This gives us 66.08 hours! ✓

console.log('\n✅ This matches! The payslip is for January 2026 only');
console.log('\nBut Renata only has approved hours in January:');
console.log('- Jan 3: 0.92 hours');
console.log('- Jan 2: 6.56 hours (PENDING)');
console.log('Total: 0.92 approved');

console.log('\n🤔 So where are the other 65.16 hours coming from?');
console.log('\nPossibilities:');
console.log('1. December hours are being counted into January payslip');
console.log('2. There are other "OK" entries we haven\'t found');
console.log('3. The screenshot is from a different calculation/test data');
console.log('4. Expense claims are adding value');

console.log('\n--- Testing if December hours are counted ---');
const decHours = 11 + 8 + 4; // Dec 23, 28, 30 (removing duplicates and breaks)
const janHours = 0.92;
const total = decHours + janHours;
console.log(`Dec hours: ${decHours}`);
console.log(`Jan hours: ${janHours}`);
console.log(`Total: ${total.toFixed(2)}`);
console.log(`Still need: ${(66.08 - total).toFixed(2)} hours`);
