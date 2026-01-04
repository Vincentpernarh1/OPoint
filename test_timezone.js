// Test timezone grouping issue
const entry1Date = new Date('2026-01-02'); // From date field
const entry5Date = new Date('2026-01-02T11:00:00+00:00'); // From clock_in

console.log('Entry 1 (date field):');
console.log('  Input: 2026-01-02');
console.log('  Date object:', entry1Date);
console.log('  toDateString():', entry1Date.toDateString());

console.log('\nEntry 5 (clock_in):');
console.log('  Input: 2026-01-02T11:00:00+00:00');
console.log('  Date object:', entry5Date);
console.log('  toDateString():', entry5Date.toDateString());

console.log('\nAre they the same key?', entry1Date.toDateString() === entry5Date.toDateString());
console.log('\n❌ PROBLEM: They create DIFFERENT keys, so they appear as different days!');
console.log('This is why the approved adjustment (Entry 5) does not skip Entry 1.\n');

console.log('✅ SOLUTION: Use ISO date string (YYYY-MM-DD) instead of toDateString()');

const entry1Key = entry1Date.toISOString().split('T')[0];
const entry5Key = entry5Date.toISOString().split('T')[0];

console.log('\nUsing toISOString().split("T")[0]:');
console.log('  Entry 1 key:', entry1Key);
console.log('  Entry 5 key:', entry5Key);
console.log('  Same key?', entry1Key === entry5Key);
