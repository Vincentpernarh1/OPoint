// Check what would give us 66.08 hours

const expectedHours = 176; // 22 weekdays × 8
const hoursWorked = 66.08;
const hoursNotWorked = expectedHours - hoursWorked;

console.log(`If hours worked = 66.08:`);
console.log(`Hours not worked: ${hoursNotWorked.toFixed(2)}`);
console.log(`Screenshot shows: 109.92`);
console.log(`Difference: ${(hoursNotWorked - 109.92).toFixed(2)}`);

// So the screenshot is correct about 109.92 hours not worked
// Which means 176 - 109.92 = 66.08 hours worked ✓

// Now let's figure out what would make 66.08 hours
console.log('\n---');
console.log('Current approved hours: 35 (with duplicates)');
console.log('Removing 3 duplicates: 35 - 12 = 23');
console.log('Need to reach: 66.08');
console.log('Missing: 66.08 - 23 = 43.08 hours');

// Maybe there are more days/entries we haven't seen?
// Or maybe the tolerance logic should count more entries as "OK"?
