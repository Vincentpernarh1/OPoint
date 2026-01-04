import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkJanuaryOnly() {
    console.log('🔍 JANUARY 2026 HOURS ANALYSIS\n');
    console.log('='.repeat(80));
    
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    console.log(`\n👤 User: ${user.name}`);
    
    // Get ALL clock logs for January 2026
    const { data: allLogs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: true });
    
    // Filter for January 2026 only
    const januaryLogs = allLogs.filter(log => {
        const clockInTime = log.clock_in || log.requested_clock_in;
        if (!clockInTime) return false;
        
        const date = new Date(clockInTime);
        return date.getFullYear() === 2026 && date.getMonth() === 0; // January
    });
    
    console.log(`\n📅 JANUARY 2026 ENTRIES: ${januaryLogs.length}`);
    console.log('='.repeat(80));
    
    let totalApprovedHours = 0;
    let totalAllHours = 0;
    let totalMinutes = 0;
    let totalSeconds = 0;
    
    januaryLogs.forEach((log, idx) => {
        const clockInTime = log.clock_in || log.requested_clock_in;
        const clockOutTime = log.clock_out || log.requested_clock_out;
        
        if (!clockInTime || !clockOutTime) {
            console.log(`\n${idx + 1}. INCOMPLETE ENTRY`);
            console.log(`   ID: ${log.id}`);
            console.log(`   Clock In: ${clockInTime}`);
            console.log(`   Clock Out: ${clockOutTime}`);
            return;
        }
        
        const clockIn = new Date(clockInTime);
        const clockOut = new Date(clockOutTime);
        const date = clockIn.toISOString().split('T')[0];
        
        const diffMs = clockOut - clockIn;
        const hours = diffMs / (1000 * 60 * 60);
        const mins = Math.floor((diffMs / (1000 * 60)) % 60);
        const secs = Math.floor((diffMs / 1000) % 60);
        
        console.log(`\n${idx + 1}. ${date} (ID: ${log.id.substring(0, 8)}...)`);
        console.log(`   Clock In: ${clockIn.toTimeString().split(' ')[0]}`);
        console.log(`   Clock Out: ${clockOut.toTimeString().split(' ')[0]}`);
        console.log(`   Duration: ${Math.floor(hours)}h ${mins}m ${secs}s (${hours.toFixed(4)} hours)`);
        console.log(`   Status: ${log.adjustment_status || 'Normal'}`);
        console.log(`   Applied: ${log.adjustment_applied}`);
        
        const isApproved = log.adjustment_applied === true || 
                          (!log.adjustment_status && log.clock_in && log.clock_out);
        
        if (isApproved) {
            totalApprovedHours += hours;
            console.log(`   ✅ COUNTED (Approved/Applied)`);
        } else if (log.adjustment_status === 'Pending') {
            console.log(`   ⏳ PENDING (Not counted in payslip)`);
        } else {
            console.log(`   ❓ Status unclear`);
        }
        
        totalAllHours += hours;
        totalMinutes += Math.floor(diffMs / (1000 * 60));
        totalSeconds += Math.floor(diffMs / 1000);
        
        // Check for session 2
        if (log.requested_clock_in_2 && log.requested_clock_out_2) {
            const clockIn2 = new Date(log.requested_clock_in_2);
            const clockOut2 = new Date(log.requested_clock_out_2);
            const diffMs2 = clockOut2 - clockIn2;
            const hours2 = diffMs2 / (1000 * 60 * 60);
            const mins2 = Math.floor((diffMs2 / (1000 * 60)) % 60);
            const secs2 = Math.floor((diffMs2 / 1000) % 60);
            
            console.log(`\n   Session 2:`);
            console.log(`   Clock In 2: ${clockIn2.toTimeString().split(' ')[0]}`);
            console.log(`   Clock Out 2: ${clockOut2.toTimeString().split(' ')[0]}`);
            console.log(`   Duration: ${Math.floor(hours2)}h ${mins2}m ${secs2}s (${hours2.toFixed(4)} hours)`);
            
            if (isApproved) {
                totalApprovedHours += hours2;
            }
            totalAllHours += hours2;
            totalMinutes += Math.floor(diffMs2 / (1000 * 60));
            totalSeconds += Math.floor(diffMs2 / 1000);
        }
    });
    
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMins = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 JANUARY TOTALS:');
    console.log(`\n   All entries (including pending):`);
    console.log(`   ${totalHours}:${String(totalMins).padStart(2, '0')}:${String(totalSecs).padStart(2, '0')}`);
    console.log(`   = ${totalAllHours.toFixed(2)} hours`);
    
    const approvedHours = Math.floor(totalApprovedHours);
    const approvedMins = Math.floor((totalApprovedHours % 1) * 60);
    const approvedSecs = Math.floor(((totalApprovedHours % 1) * 60 % 1) * 60);
    
    console.log(`\n   Approved/Applied entries only:`);
    console.log(`   ${approvedHours}:${String(approvedMins).padStart(2, '0')}:${String(approvedSecs).padStart(2, '0')}`);
    console.log(`   = ${totalApprovedHours.toFixed(2)} hours`);
    
    console.log(`\n   📱 UI Shows: 07:05:43 (7.095 hours)`);
    console.log(`   💻 Server Should Calculate With: ${totalApprovedHours.toFixed(2)} hours`);
    
    if (Math.abs(totalAllHours - 7.095) < 0.1) {
        console.log(`\n   ⚠️  UI is counting ALL entries including PENDING!`);
    } else if (Math.abs(totalApprovedHours - 7.095) < 0.1) {
        console.log(`\n   ✅ UI correctly showing approved entries only`);
    } else {
        console.log(`\n   ❌ MISMATCH! Neither total matches UI display`);
    }
    
    // Now calculate the payslip for the full pay period (Dec 4 - Jan 3)
    console.log('\n\n' + '='.repeat(80));
    console.log('💰 PAYSLIP CALCULATION (Full Pay Period: Dec 4, 2025 - Jan 3, 2026)');
    console.log('='.repeat(80));
    
    // Get all approved logs for full period
    const payPeriodStart = '2025-12-04';
    const payPeriodEnd = '2026-01-03';
    
    const periodLogs = allLogs.filter(log => {
        const clockInTime = log.clock_in || log.requested_clock_in;
        if (!clockInTime) return false;
        
        const date = new Date(clockInTime).toISOString().split('T')[0];
        const isApproved = log.adjustment_applied === true || 
                          (!log.adjustment_status && log.clock_in && log.clock_out);
        
        return date >= payPeriodStart && date <= payPeriodEnd && isApproved;
    });
    
    let totalPeriodHours = 0;
    periodLogs.forEach(log => {
        const clockInTime = log.clock_in || log.requested_clock_in;
        const clockOutTime = log.clock_out || log.requested_clock_out;
        
        if (clockInTime && clockOutTime) {
            const hours = (new Date(clockOutTime) - new Date(clockInTime)) / (1000 * 60 * 60);
            totalPeriodHours += hours;
        }
        
        if (log.requested_clock_in_2 && log.requested_clock_out_2) {
            const hours2 = (new Date(log.requested_clock_out_2) - new Date(log.requested_clock_in_2)) / (1000 * 60 * 60);
            totalPeriodHours += hours2;
        }
    });
    
    // Calculate expected hours for the period
    const start = new Date(payPeriodStart);
    const end = new Date(payPeriodEnd);
    let weekdays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) weekdays++;
    }
    
    const expectedHours = weekdays * 8;
    const hoursNotWorked = expectedHours - totalPeriodHours;
    const hourlyRate = user.basic_salary / expectedHours;
    const grossPay = hourlyRate * totalPeriodHours;
    const deduction = user.basic_salary - grossPay;
    const ssnit = grossPay * 0.055;
    
    console.log(`\n   Pay Period: ${payPeriodStart} to ${payPeriodEnd}`);
    console.log(`   Expected Hours (${weekdays} weekdays × 8): ${expectedHours} hours`);
    console.log(`   Approved Hours Worked: ${totalPeriodHours.toFixed(2)} hours`);
    console.log(`   Hours Not Worked: ${hoursNotWorked.toFixed(2)} hours`);
    console.log(`\n   Basic Salary: GHS ${user.basic_salary.toFixed(2)}`);
    console.log(`   Hourly Rate: GHS ${hourlyRate.toFixed(2)}/hour`);
    console.log(`   Deduction: -GHS ${deduction.toFixed(2)}`);
    console.log(`   Gross Pay: GHS ${grossPay.toFixed(2)}`);
    console.log(`   SSNIT (5.5%): -GHS ${ssnit.toFixed(2)}`);
    console.log(`   NET PAY: GHS ${(grossPay - ssnit).toFixed(2)}`);
    
    console.log(`\n   📋 Screenshot shows:`);
    console.log(`   Gross Pay: GHS 1,952.40`);
    console.log(`   Deduction: -GHS 3,247.60`);
    console.log(`   Hours Not Worked: 109.92`);
    console.log(`   SSNIT: GHS 107.38`);
    console.log(`   Net Pay: GHS 1,845.01`);
    
    console.log(`\n   🔍 Difference:`);
    console.log(`   Gross: ${(1952.40 - grossPay).toFixed(2)}`);
    console.log(`   Hours not worked: ${(109.92 - hoursNotWorked).toFixed(2)}`);
}

checkJanuaryOnly();
