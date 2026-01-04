import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkRenata() {
    console.log('🔍 CHECKING RENATA\'S HOURS - JANUARY 2026\n');
    console.log('='.repeat(100));
    
    // Get Renata
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('name', '%renata%')
        .single();
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`\n👤 User: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Tenant ID: ${user.tenant_id}\n`);
    
    // Get all January 2026 logs
    const { data: logs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .order('date', { ascending: true });
    
    const januaryLogs = logs?.filter(log => {
        if (log.date) {
            return log.date.startsWith('2026-01');
        } else if (log.clock_in) {
            const date = new Date(log.clock_in);
            return date.getMonth() === 0 && date.getFullYear() === 2026;
        }
        return false;
    }) || [];
    
    console.log(`📋 Found ${januaryLogs.length} January 2026 entries\n`);
    
    // Group by date
    const byDate = {};
    januaryLogs.forEach(log => {
        const dateKey = log.date || (log.clock_in ? new Date(log.clock_in).toISOString().split('T')[0] : 'unknown');
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(log);
    });
    
    // Analyze each day
    Object.keys(byDate).sort().forEach(dateKey => {
        const dayLogs = byDate[dateKey];
        console.log(`\n📅 ${dateKey} (${dayLogs.length} entries):`);
        
        dayLogs.forEach((log, i) => {
            console.log(`\n   Entry ${i + 1}:`);
            console.log(`      ID: ${log.id?.substring(0, 8)}...`);
            console.log(`      Clock In: ${log.clock_in || 'NULL'}`);
            console.log(`      Clock Out: ${log.clock_out || 'NULL'}`);
            console.log(`      Adjustment Applied: ${log.adjustment_applied || 'false'}`);
            console.log(`      Adjustment Status: ${log.adjustment_status || 'none'}`);
            
            if (log.punches && log.punches.length > 0) {
                console.log(`      Punches: ${log.punches.length} items`);
                
                // Calculate hours from punches
                let totalHours = 0;
                for (let p = 0; p < log.punches.length - 1; p++) {
                    const punch1 = log.punches[p];
                    const punch2 = log.punches[p + 1];
                    
                    if (typeof punch1 === 'object' && punch1.time) {
                        const type1 = punch1.type?.toLowerCase();
                        const type2 = punch2.type?.toLowerCase();
                        
                        if (type1 === 'in' && type2 === 'out') {
                            const time1 = new Date(punch1.time);
                            const time2 = new Date(punch2.time);
                            const hours = (time2 - time1) / (1000 * 60 * 60);
                            totalHours += hours;
                            console.log(`         ${type1.toUpperCase()} → ${type2.toUpperCase()}: ${hours.toFixed(2)}h`);
                            p++; // Skip next since we paired it
                        }
                    }
                }
                console.log(`      Punches Total: ${totalHours.toFixed(2)} hours`);
            }
            
            // Calculate from clock_in/clock_out
            if (log.clock_in && log.clock_out) {
                const clockIn = new Date(log.clock_in);
                const clockOut = new Date(log.clock_out);
                let hours = (clockOut - clockIn) / (1000 * 60 * 60);
                
                // Check if break should be applied
                if (hours >= 7 && !log.clock_in_2) {
                    hours = Math.max(0, hours - 1); // 1 hour break
                    console.log(`      Clock In/Out: ${hours.toFixed(2)} hours (with break deduction)`);
                } else {
                    console.log(`      Clock In/Out: ${hours.toFixed(2)} hours`);
                }
                
                if (log.clock_in_2 && log.clock_out_2) {
                    const clockIn2 = new Date(log.clock_in_2);
                    const clockOut2 = new Date(log.clock_out_2);
                    const hours2 = (clockOut2 - clockIn2) / (1000 * 60 * 60);
                    console.log(`      Session 2: ${hours2.toFixed(2)} hours`);
                    console.log(`      Total: ${(hours + hours2).toFixed(2)} hours`);
                }
            }
        });
    });
    
    console.log('\n' + '='.repeat(100));
}

checkRenata().catch(console.error);
