import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function verifyRenataPayslip() {
    console.log('=== VERIFYING RENATA PAYSLIP CALCULATION ===\n');

    // Get Renata's user data
    const { data: user, error: userError } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();

    if (userError) {
        console.error('Error fetching user:', userError);
        return;
    }

    console.log('User:', user.full_name);
    console.log('Email:', user.email);
    console.log('Basic Salary:', user.basic_salary);
    console.log('Company ID:', user.company_id);

    // Get company data for working hours (if company_id exists)
    let company = null;
    if (user.company_id) {
        const { data: companyData, error: companyError } = await supabase
            .from('opoint_companies')
            .select('*')
            .eq('id', user.company_id)
            .single();

        if (companyError) {
            console.error('Error fetching company:', companyError);
        } else {
            company = companyData;
        }
    }

    if (company) {
        console.log('\nCompany:', company.company_name);
        console.log('Working Hours per Day:', company.working_hours_per_day || 8);
        console.log('Working Days per Week:', company.working_days_per_week || 5);
    } else {
        console.log('\nNo company assigned - using default settings');
    }

    // Calculate expected monthly hours for January 2026
    const workingDaysInJan2026 = 22; // Already calculated
    const workingHoursPerDay = company ? (company.working_hours_per_day || 8) : 8;
    const expectedMonthlyHours = workingDaysInJan2026 * workingHoursPerDay;
    console.log('\nExpected Hours for January 2026:', expectedMonthlyHours);

    // Get ALL clock logs for January 2026
    const { data: logs, error: logsError } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .gte('clock_in', '2026-01-01T00:00:00')
        .lt('clock_in', '2026-02-01T00:00:00')
        .order('clock_in', { ascending: true });

    if (logsError) {
        console.error('Error fetching logs:', logsError);
        return;
    }

    console.log('\n=== ALL JANUARY 2026 CLOCK LOGS ===');
    console.log(`Total logs found: ${logs.length}\n`);

    let totalHours = 0;
    const seenEntries = new Set();

    logs.forEach((log, index) => {
        const date = log.clock_in ? new Date(log.clock_in).toISOString().split('T')[0] : 'No clock_in';
        const duplicateKey = `${log.clock_in}-${log.clock_out}`;
        const isDuplicate = seenEntries.has(duplicateKey);
        seenEntries.add(duplicateKey);

        console.log(`\n--- Entry ${index + 1} ---`);
        console.log(`Date: ${date}`);
        console.log(`ID: ${log.id}`);
        console.log(`Status: ${log.adjustment_status || 'None'}`);
        console.log(`Applied: ${log.adjustment_applied || false}`);
        console.log(`Duplicate: ${isDuplicate ? 'YES ❌' : 'No'}`);
        
        // Session 1
        console.log(`Session 1:`);
        console.log(`  clock_in: ${log.clock_in}`);
        console.log(`  clock_out: ${log.clock_out}`);
        
        // Session 2
        if (log.clock_in_2 || log.requested_clock_in_2) {
            console.log(`Session 2:`);
            console.log(`  clock_in_2: ${log.clock_in_2 || 'undefined'}`);
            console.log(`  clock_out_2: ${log.clock_out_2 || 'undefined'}`);
            console.log(`  requested_clock_in_2: ${log.requested_clock_in_2 || 'null'}`);
            console.log(`  requested_clock_out_2: ${log.requested_clock_out_2 || 'null'}`);
        }

        // Calculate hours for this entry
        let entryHours = 0;
        
        // Skip duplicates
        if (isDuplicate) {
            console.log(`Hours: 0 (duplicate skipped)`);
            return;
        }

        // Check if this is approved or an OK entry
        const isApproved = log.adjustment_applied === true && log.adjustment_status === 'Approved';
        const isPendingOrCancelled = log.adjustment_status === 'Pending' || log.adjustment_status === 'Cancelled';
        
        // Calculate session 1 hours
        if (log.clock_in && log.clock_out) {
            const clockIn = new Date(log.clock_in);
            const clockOut = new Date(log.clock_out);
            const session1Hours = (clockOut - clockIn) / (1000 * 60 * 60);
            
            // Calculate session 2 hours (check both actual and requested fields)
            let session2Hours = 0;
            const clockIn2 = log.clock_in_2 || log.requested_clock_in_2;
            const clockOut2 = log.clock_out_2 || log.requested_clock_out_2;
            
            if (clockIn2 && clockOut2) {
                const clockIn2Date = new Date(clockIn2);
                const clockOut2Date = new Date(clockOut2);
                session2Hours = (clockOut2Date - clockIn2Date) / (1000 * 60 * 60);
            }
            
            const totalSessionHours = session1Hours + session2Hours;
            
            // Check if it's an "OK entry" (8 hours ± 10 minutes tolerance)
            const isOKEntry = totalSessionHours >= 7.833 && totalSessionHours <= 8.167;
            
            if (isApproved) {
                entryHours = totalSessionHours;
                console.log(`Hours: ${entryHours.toFixed(2)} (APPROVED ✓)`);
            } else if (isOKEntry && !isPendingOrCancelled) {
                entryHours = totalSessionHours;
                console.log(`Hours: ${entryHours.toFixed(2)} (OK ENTRY ✓)`);
            } else {
                console.log(`Hours: 0 (Not approved or OK: ${log.adjustment_status || 'No status'})`);
            }
            
            console.log(`  Session 1: ${session1Hours.toFixed(2)}h`);
            if (session2Hours > 0) {
                console.log(`  Session 2: ${session2Hours.toFixed(2)}h`);
            }
        }

        totalHours += entryHours;
    });

    console.log('\n=== SUMMARY ===');
    console.log(`Total Hours Worked: ${totalHours.toFixed(2)}`);
    console.log(`Expected Hours: ${expectedMonthlyHours}`);
    console.log(`Difference: ${(totalHours - expectedMonthlyHours).toFixed(2)}`);
    
    // Calculate payslip
    const hourlyRate = user.basic_salary / expectedMonthlyHours;
    const grossSalary = totalHours * hourlyRate;
    
    console.log('\n=== PAYSLIP CALCULATION ===');
    console.log(`Hourly Rate: GHS ${hourlyRate.toFixed(2)}`);
    console.log(`Gross Salary: GHS ${grossSalary.toFixed(2)}`);
    
    // Ghana PAYE Tax (2024 rates)
    let tax = 0;
    const annualGross = grossSalary * 12;
    
    if (annualGross > 600) {
        if (annualGross <= 5000) {
            tax = (Math.min(annualGross, 5000) - 600) * 0.05;
        } else {
            tax = (5000 - 600) * 0.05;
            if (annualGross <= 10000) {
                tax += (Math.min(annualGross, 10000) - 5000) * 0.10;
            } else {
                tax += (10000 - 5000) * 0.10;
                if (annualGross <= 35000) {
                    tax += (Math.min(annualGross, 35000) - 10000) * 0.175;
                } else {
                    tax += (35000 - 10000) * 0.175;
                    if (annualGross <= 100000) {
                        tax += (Math.min(annualGross, 100000) - 35000) * 0.25;
                    } else {
                        tax += (100000 - 35000) * 0.25;
                        tax += (annualGross - 100000) * 0.30;
                    }
                }
            }
        }
    }
    const monthlyTax = tax / 12;
    
    // SSNIT (5.5% employee contribution)
    const ssnit = grossSalary * 0.055;
    
    // Net salary
    const netSalary = grossSalary - monthlyTax - ssnit;
    
    console.log(`PAYE Tax: GHS ${monthlyTax.toFixed(2)}`);
    console.log(`SSNIT (5.5%): GHS ${ssnit.toFixed(2)}`);
    console.log(`Net Salary: GHS ${netSalary.toFixed(2)}`);
}

verifyRenataPayslip().catch(console.error);
