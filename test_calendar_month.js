// Test calendar month calculation

const payDate = new Date('2026-01-04'); // January 4, 2026

const year = payDate.getFullYear();
const month = payDate.getMonth();
const payPeriodStart = new Date(year, month, 1); // First day of month
const payPeriodEnd = new Date(year, month + 1, 0); // Last day of month

console.log('Pay Date:', payDate.toISOString().split('T')[0]);
console.log('Calendar Month Start:', payPeriodStart.toISOString().split('T')[0]);
console.log('Calendar Month End:', payPeriodEnd.toISOString().split('T')[0]);
console.log('\nMonth Display:', payPeriodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

// Calculate expected working days (Mon-Fri)
let workingDays = 0;
const current = new Date(payPeriodStart);
while (current <= payPeriodEnd) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        workingDays++;
    }
    current.setDate(current.getDate() + 1);
}

console.log(`\nWorking days in ${payPeriodStart.toLocaleDateString('en-US', { month: 'long' })}: ${workingDays}`);
console.log(`Expected hours (${workingDays} days × 8h): ${workingDays * 8} hours`);
