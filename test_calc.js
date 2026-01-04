import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testNewLogic() {
    console.log('Testing new hours calculation logic for Renata\n');
    
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    const { data: clockLogs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id);
    
    const payPeriodStart = new Date('2025-12-04');
    const payPeriodEnd = new Date('2026-01-03');
    
    const periodLogs = clockLogs.filter(entry => {
        if (!entry.clock_in || !entry.clock_out) return false;
        const date = new Date(entry.clock_in);
        return date >= payPeriodStart && date <= payPeriodEnd;
    });
    
    console.log(`Logs in period: ${periodLogs.length}`);
    
    let totalHours = 0;
    const TOLERANCE_MIN = 10;
    const EXPECTED_HOURS = 8;
    
    periodLogs.forEach(entry => {
        const clockIn = new Date(entry.clock_in);
        const clockOut = new Date(entry.clock_out);
        let hours = (clockOut - clockIn) / (1000 * 60 * 60);
        
        // Apply break if >= 7 hours
        if (hours >= 7 && !entry.clock_in_2) {
            hours -= 1; // 60 min break
        }
        
        // Check if approved or OK
        const isApproved = entry.adjustment_applied === true;
        const isOK = hours >= (EXPECTED_HOURS - TOLERANCE_MIN/60) && hours <= (EXPECTED_HOURS + TOLERANCE_MIN/60);
        const isPending = entry.adjustment_status === 'Pending';
        
        const shouldCount = isApproved || (isOK && !isPending);
        
        console.log(`${clockIn.toISOString().split('T')[0]}: ${hours.toFixed(2)}h - ${shouldCount ? 'COUNTED' : 'SKIPPED'} (${entry.adjustment_status || 'Normal'})`);
        
        if (shouldCount) {
            totalHours += hours;
        }
    });
    
    console.log(`\nTotal: ${totalHours.toFixed(2)} hours`);
    const grossPay = (5200 / 176) * totalHours;
    console.log(`Gross Pay: GHS ${grossPay.toFixed(2)}`);
    console.log(`Expected: GHS 1,952.40`);
}

testNewLogic();
