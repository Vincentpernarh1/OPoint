import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function findJan1Entry() {
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('email', '%renata%')
        .single();
    
    // Get ALL January logs
    const { data: allLogs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .order('date', { ascending: true });
    
    console.log('\n🔍 SEARCHING FOR THE 6.56 HOUR ENTRY:\n');
    console.log('='.repeat(100));
    
    const januaryLogs = allLogs?.filter(log => {
        if (log.date) {
            return log.date.startsWith('2026-01');
        } else if (log.clock_in) {
            const date = new Date(log.clock_in);
            return date.getMonth() === 0 && date.getFullYear() === 2026;
        } else if (log.punches && log.punches.length > 0) {
            const firstPunch = log.punches[0];
            const punchTime = typeof firstPunch === 'object' && firstPunch.time ? firstPunch.time : firstPunch;
            const date = new Date(punchTime);
            return date.getMonth() === 0 && date.getFullYear() === 2026;
        }
        return false;
    }) || [];
    
    console.log(`\n📋 Found ${januaryLogs.length} January entries total\n`);
    
    januaryLogs.forEach((log, i) => {
        // Determine the effective date
        let effectiveDate;
        if (log.date) {
            effectiveDate = log.date;
        } else if (log.clock_in) {
            effectiveDate = new Date(log.clock_in).toISOString().split('T')[0];
        } else if (log.punches && log.punches.length > 0) {
            const firstPunch = log.punches[0];
            const punchTime = typeof firstPunch === 'object' && firstPunch.time ? firstPunch.time : firstPunch;
            effectiveDate = new Date(punchTime).toISOString().split('T')[0];
        }
        
        console.log(`\n─────────────────────────────────────────────────────────────────────────────`);
        console.log(`Entry ${i + 1}:`);
        console.log(`  Effective Date: ${effectiveDate}`);
        console.log(`  Date Field: ${log.date || 'NULL'}`);
        console.log(`  Clock In: ${log.clock_in || 'NULL'}`);
        console.log(`  Clock Out: ${log.clock_out || 'NULL'}`);
        console.log(`  Adjustment Applied: ${log.adjustment_applied || 'false'}`);
        console.log(`  Adjustment Status: ${log.adjustment_status || 'none'}`);
        console.log(`  Has Punches: ${log.punches?.length || 0}`);
        
        if (log.punches && log.punches.length > 0) {
            let totalHours = 0;
            console.log(`\n  Punches Array:`);
            
            for (let p = 0; p < log.punches.length; p++) {
                const punch = log.punches[p];
                if (typeof punch === 'object' && punch.time) {
                    const time = new Date(punch.time);
                    console.log(`    [${p}] ${punch.type?.toUpperCase()}: ${time.toLocaleString()}`);
                }
            }
            
            // Calculate hours
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
                        if (hours > 0) {
                            console.log(`\n    ✅ IN→OUT Pair: ${hours.toFixed(2)} hours`);
                            totalHours += hours;
                            p++;
                        }
                    }
                }
            }
            
            console.log(`\n  📊 Total Hours: ${totalHours.toFixed(2)}`);
            
            if (Math.abs(totalHours - 6.56) < 0.1) {
                console.log(`  🎯 THIS IS THE 6.56 HOUR ENTRY!`);
            }
        }
    });
    
    console.log('\n' + '='.repeat(100) + '\n');
}

findJan1Entry().catch(console.error);
