// PAYE Calculation Verification for Ghana Tax 2024
// Testing with Renata's salary: GHS 5200/month

const basicSalary = 5200;
const annualGross = basicSalary * 12;

console.log('🔍 GHANA PAYE TAX CALCULATION VERIFICATION\n');
console.log('='.repeat(60));
console.log(`Monthly Salary: GHS ${basicSalary.toFixed(2)}`);
console.log(`Annual Gross: GHS ${annualGross.toFixed(2)}`);
console.log('\n2024 Ghana Tax Brackets:');
console.log('  0 - 4,380: 0%');
console.log('  4,381 - 6,240: 5%');
console.log('  6,241 - 34,380: 10%');
console.log('  34,381 - 50,760: 17.5%');
console.log('  50,761 - 393,360: 25%');
console.log('  393,361+: 30%');

console.log('\n' + '='.repeat(60));
console.log('STEP-BY-STEP CALCULATION:\n');

let paye = 0;
let breakdown = [];

if (annualGross <= 4380) {
    console.log(`Annual gross ${annualGross} ≤ 4,380: No tax`);
    paye = 0;
} else if (annualGross <= 6240) {
    const taxableAmount = annualGross - 4380;
    const tax = taxableAmount * 0.05;
    paye = tax;
    breakdown.push(`Band 2 (${taxableAmount.toFixed(2)} @ 5%): GHS ${tax.toFixed(2)}`);
} else if (annualGross <= 34380) {
    const band2 = (6240 - 4380) * 0.05;
    const band3Amount = annualGross - 6240;
    const band3 = band3Amount * 0.10;
    paye = band2 + band3;
    breakdown.push(`Band 2 (1,860 @ 5%): GHS ${band2.toFixed(2)}`);
    breakdown.push(`Band 3 (${band3Amount.toFixed(2)} @ 10%): GHS ${band3.toFixed(2)}`);
} else if (annualGross <= 50760) {
    const band2 = (6240 - 4380) * 0.05;
    const band3 = (34380 - 6240) * 0.10;
    const band4Amount = annualGross - 34380;
    const band4 = band4Amount * 0.175;
    paye = band2 + band3 + band4;
    breakdown.push(`Band 2 (1,860 @ 5%): GHS ${band2.toFixed(2)}`);
    breakdown.push(`Band 3 (28,140 @ 10%): GHS ${band3.toFixed(2)}`);
    breakdown.push(`Band 4 (${band4Amount.toFixed(2)} @ 17.5%): GHS ${band4.toFixed(2)}`);
} else if (annualGross <= 393360) {
    const band2 = (6240 - 4380) * 0.05;
    const band3 = (34380 - 6240) * 0.10;
    const band4 = (50760 - 34380) * 0.175;
    const band5Amount = annualGross - 50760;
    const band5 = band5Amount * 0.25;
    paye = band2 + band3 + band4 + band5;
    breakdown.push(`Band 2 (1,860 @ 5%): GHS ${band2.toFixed(2)}`);
    breakdown.push(`Band 3 (28,140 @ 10%): GHS ${band3.toFixed(2)}`);
    breakdown.push(`Band 4 (16,380 @ 17.5%): GHS ${band4.toFixed(2)}`);
    breakdown.push(`Band 5 (${band5Amount.toFixed(2)} @ 25%): GHS ${band5.toFixed(2)}`);
}

console.log('Tax Breakdown:');
breakdown.forEach(line => console.log(`  ${line}`));
console.log(`\nTotal Annual PAYE: GHS ${paye.toFixed(2)}`);
console.log(`Monthly PAYE: GHS ${(paye / 12).toFixed(2)}`);

console.log('\n' + '='.repeat(60));
console.log('FINAL PAYSLIP CALCULATION:\n');

const monthlyPaye = paye / 12;
const ssnit = basicSalary * 0.055;
const totalDeductions = ssnit + monthlyPaye;
const netPay = basicSalary - totalDeductions;

console.log(`Basic Salary: GHS ${basicSalary.toFixed(2)}`);
console.log(`SSNIT (5.5%): -GHS ${ssnit.toFixed(2)}`);
console.log(`PAYE: -GHS ${monthlyPaye.toFixed(2)}`);
console.log(`Total Deductions: -GHS ${totalDeductions.toFixed(2)}`);
console.log(`═══════════════════════════════`);
console.log(`NET PAY: GHS ${netPay.toFixed(2)}`);

// Verify percentage
const takeHomePercentage = (netPay / basicSalary) * 100;
console.log(`\nTake-home: ${takeHomePercentage.toFixed(2)}%`);
console.log(`Total deductions: ${((totalDeductions / basicSalary) * 100).toFixed(2)}%`);
