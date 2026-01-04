import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function detailedAnalysis() {
    console.log('🔍 DETAILED PUNCH DATA ANALYSIS\n');
    console.log('='.repeat(80));
    
    const users = [
        { email: 'mablepernarh@gmail.com', name: 'Mabel Pernarh' },
        { email: 'Renata@gmail.com', name: 'Renata Pinheiro' }
    ];
    
    for (const userInfo of users) {
        console.log(`\n\n🧑 ${userInfo.name.toUpperCase()}`);
        console.log('='.repeat(80));
        
        // Get user
        const { data: user } = await supabase
            .from('opoint_users')
            .select('*')
            .eq('email', userInfo.email)
            .single();
        
        if (!user) continue;
        
        console.log(`Basic Salary: GHS ${user.basic_salary || 'NOT SET'}`);
        console.log(`Employee ID: ${user.employee_id || 'NOT SET ❌'}`);
        
        // Get January logs with full details
        const { data: janLogs } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('employee_name', user.name)
            .gte('date', '2026-01-01')
            .lte('date', '2026-01-31')
            .order('date', { ascending: true });
        
        console.log(`\n⏰ JANUARY 2026 DETAILED DATA:`);
        console.log(`   Total Records: ${janLogs?.length || 0}\n`);
        
        if (janLogs && janLogs.length > 0) {
            let totalCalculatedHours = 0;
            
            janLogs.forEach((log, i) => {
                console.log(`   📅 Record ${i + 1} - ${log.date || 'NO DATE'}`);
                console.log(`      Employee ID in log: ${log.employee_id || 'NOT SET'}`);
                console.log(`      Clock In: ${log.clock_in || 'NOT SET'}`);
                console.log(`      Clock Out: ${log.clock_out || 'NOT SET'}`);
                console.log(`      Clock In 2: ${log.clock_in_2 || 'N/A'}`);
                console.log(`      Clock Out 2: ${log.clock_out_2 || 'N/A'}`);
                console.log(`      Punches (JSON): ${JSON.stringify(log.punches) || 'NULL'}`);
                
                // Calculate hours from punches
                if (log.punches && Array.isArray(log.punches)) {
                    let dayHours = 0;
                    for (let p = 0; p < log.punches.length; p += 2) {
                        if (log.punches[p] && log.punches[p + 1]) {
                            const inTime = new Date(log.punches[p]);
                            const outTime = new Date(log.punches[p + 1]);
                            const hours = (outTime - inTime) / (1000 * 60 * 60);
                            dayHours += hours;
                            console.log(`      Punch ${Math.floor(p/2) + 1}: ${inTime.toLocaleTimeString()} - ${outTime.toLocaleTimeString()} = ${hours.toFixed(2)}h`);
                        }
                    }
                    // Subtract break (assuming 1 hour)
                    dayHours = Math.max(0, dayHours - 1);
                    totalCalculatedHours += dayHours;
                    console.log(`      Day Total (after break): ${dayHours.toFixed(2)}h`);
                } else {
                    console.log(`      ⚠️ No punches array found`);
                }
                console.log();
            });
            
            console.log(`   📊 TOTAL CALCULATED HOURS: ${totalCalculatedHours.toFixed(2)} hours\n`);
        }
        
        // Check all logs with punches
        const { data: logsWithPunches } = await supabase
            .from('opoint_clock_logs')
            .select('date, punches, clock_in, clock_out')
            .eq('employee_name', user.name)
            .not('punches', 'is', null)
            .order('date', { ascending: false })
            .limit(5);
        
        console.log(`\n📋 RECENT LOGS WITH PUNCHES DATA (last 5):`);
        if (logsWithPunches && logsWithPunches.length > 0) {
            logsWithPunches.forEach((log, i) => {
                console.log(`   ${i + 1}. ${log.date || 'NO DATE'}: ${log.punches?.length || 0} punches`);
                if (log.punches && log.punches.length > 0) {
                    console.log(`      Punches: ${log.punches.map(p => new Date(p).toLocaleTimeString()).join(', ')}`);
                }
            });
        } else {
            console.log(`   ⚠️ No logs with punches found`);
        }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('🎯 FINDINGS:\n');
    console.log('Issue 1: employee_id NOT SET in opoint_users table');
    console.log('Issue 2: Clock logs show incomplete data for January 2026');
    console.log('Issue 3: Need to check if payslip calculation uses punches array');
    console.log('='.repeat(80));
}

detailedAnalysis().catch(console.error);
