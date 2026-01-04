// Simple calculation check
const basicSalary = 9050;
const expectedMonthlyHours = 176; // 22 days * 8 hours
const hourlyRate = basicSalary / expectedMonthlyHours;

console.log('Basic Salary: GHS', basicSalary);
console.log('Expected Monthly Hours:', expectedMonthlyHours);
console.log('Hourly Rate: GHS', hourlyRate.toFixed(2));
console.log('');

// Test with different hour scenarios
const scenarios = [
    { hours: 6.44, label: '06:26:30 (6h 26m 30s)' },
    { hours: 7.5, label: '7.5 hours (1 day)' },
    { hours: 15, label: '15 hours (2 days @ 7.5h)' },
    { hours: 22.5, label: '22.5 hours (3 days @ 7.5h)' }
];

scenarios.forEach(s => {
    const grossPay = hourlyRate * s.hours;
    const ssnit = grossPay * 0.055;
    const netPay = grossPay - ssnit;
    console.log(`${s.label}:`);
    console.log(`  Gross Pay: GHS ${grossPay.toFixed(2)}`);
    console.log(`  SSNIT (5.5%): GHS ${ssnit.toFixed(2)}`);
    console.log(`  Net Pay: GHS ${netPay.toFixed(2)}`);
    console.log('');
});

// What hours would give us GHS 771.27?
const actualGrossPay = 771.2660531881314;
const calculatedHours = actualGrossPay / hourlyRate;
console.log(`For GHS ${actualGrossPay.toFixed(2)}, hours worked = ${calculatedHours.toFixed(2)} hours`);
