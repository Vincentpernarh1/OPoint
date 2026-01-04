// Test calculateHoursWorked directly by importing server logic
// This will show us exactly what it's calculating

const userId = 'f6776821-05d3-4c55-8434-9e838ab995aa'; // Renata
const tenantId = '6c951ee9-4b49-4b37-b4d6-3b28f54826a3';
const payDate = new Date('2026-01-04');

console.log('Expected result: 16 hours (2 days × 8 hours with 2 sessions each)');
console.log('Jan 2: 11:00-15:00 (4h) + 16:00-20:00 (4h) = 8h');
console.log('Jan 3: 11:00-15:00 (4h) + 16:00-20:00 (4h) = 8h');
console.log('\nIf we\'re getting 22.56 hours, that means:');
console.log('- Extra 6.56 hours being counted');
console.log('- Could be: duplicate entries, wrong date filtering, or entries from other dates');
