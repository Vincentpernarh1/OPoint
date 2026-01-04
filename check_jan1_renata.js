import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkJan1() {
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('email', '%renata%')
        .single();
    
    const { data: logs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .gte('date', '2026-01-01')
        .lt('date', '2026-01-02')
        .order('date', { ascending: true });
    
    console.log('\n📅 JANUARY 1, 2026 ENTRIES:\n');
    console.log('='.repeat(100));
    
    logs?.forEach((log, i) => {
        console.log(`\nEntry ${i + 1}:`);
        console.log(`  Date: ${log.date}`);
        console.log(`  Clock In: ${log.clock_in}`);
        console.log(`  Clock Out: ${log.clock_out}`);
        console.log(`  Adjustment Applied: ${log.adjustment_applied}`);
        console.log(`  Adjustment Status: ${log.adjustment_status}`);
        console.log(`  Punches: ${log.punches ? JSON.stringify(log.punches, null, 2) : 'NULL'}`);
        
        if (log.punches && log.punches.length > 0) {
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
                        if (hours > 0) {
                            console.log(`    Pair ${p/2 + 1}: ${type1} (${time1.toLocaleTimeString()}) → ${type2} (${time2.toLocaleTimeString()}) = ${hours.toFixed(2)} hours`);
                            totalHours += hours;
                            p++;
                        }
                    }
                }
            }
            console.log(`  Total Hours from Punches: ${totalHours.toFixed(2)}`);
        }
        
        console.log(`  Created At: ${log.created_at}`);
        console.log(`  Updated At: ${log.updated_at}`);
    });
    
    console.log('\n' + '='.repeat(100));
    console.log('\n🤔 QUESTION: Is this a missing days generator entry that should be showing as 0 hours?');
    console.log('Or is it a real clock entry that Renata actually worked?\n');
}

checkJan1().catch(console.error);
