// Quick calculation to understand Mabel's payslip

const basicSalary = 9050;
const deduction = 8056.26;
const hoursNotWorked = 156.67;

// Calculate hourly rate from deduction
const hourlyRate = deduction / hoursNotWorked;
console.log('Hourly rate:', hourlyRate.toFixed(2), 'GH₵/hour');

// Calculate expected monthly hours
const expectedHours = basicSalary / hourlyRate;
console.log('Expected monthly hours:', expectedHours.toFixed(2));

// Calculate actual hours worked
const actualHours = expectedHours - hoursNotWorked;
console.log('Actual hours worked:', actualHours.toFixed(2));

// Verify gross pay
const grossPay = actualHours * hourlyRate;
console.log('Gross pay (calculated):', grossPay.toFixed(2));
console.log('Gross pay (from payslip):', 993.74);

console.log('\nPay Period: Dec 5, 2025 - Jan 4, 2026');
console.log('Working days (estimate): ~22 days');
console.log('Expected hours (22 days × 8h):', 22 * 8);
console.log('Actual worked (from backend):', 6.44);
console.log('\nPROBLEM: Backend only counts January hours, but payslip expects Dec 5 - Jan 4!');
