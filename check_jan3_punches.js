import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkJan3Punches() {
    console.log('🔍 CHECKING JANUARY 3RD PUNCHES DATA\n');
    
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'mablepernarh@gmail.com')
        .single();
    
    const { data: jan3 } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('employee_name', user.name)
        .eq('date', '2026-01-03')
        .single();
    
    if (!jan3) {
        console.log('❌ No record found for January 3rd');
        return;
    }
    
    console.log('📋 FULL RECORD FOR JANUARY 3, 2026:\n');
    console.log('Date:', jan3.date);
    console.log('Clock In:', jan3.clock_in);
    console.log('Clock Out:', jan3.clock_out);
    console.log('Clock In 2:', jan3.clock_in_2);
    console.log('Clock Out 2:', jan3.clock_out_2);
    console.log('Requested Clock In:', jan3.requested_clock_in);
    console.log('Requested Clock Out:', jan3.requested_clock_out);
    console.log('Requested Clock In 2:', jan3.requested_clock_in_2);
    console.log('Requested Clock Out 2:', jan3.requested_clock_out_2);
    console.log('Adjustment Status:', jan3.adjustment_status);
    console.log('Adjustment Applied:', jan3.adjustment_applied);
    console.log('\n📦 PUNCHES ARRAY:');
    
    if (jan3.punches && Array.isArray(jan3.punches)) {
        console.log(`   Total punches: ${jan3.punches.length}`);
        jan3.punches.forEach((punch, i) => {
            if (typeof punch === 'string') {
                const punchTime = new Date(punch);
                console.log(`   ${i + 1}. ${punchTime.toLocaleString()}`);
            } else if (typeof punch === 'object' && punch.time) {
                console.log(`   ${i + 1}. ${punch.time} (${punch.type})`);
            } else {
                console.log(`   ${i + 1}. ${JSON.stringify(punch).substring(0, 100)}`);
            }
        });
        
        // Calculate hours from punches
        console.log('\n⏱️ CALCULATING HOURS FROM PUNCHES:');
        let totalMs = 0;
        for (let i = 0; i < jan3.punches.length; i += 2) {
            if (jan3.punches[i] && jan3.punches[i + 1]) {
                let inTime, outTime;
                
                if (typeof jan3.punches[i] === 'string') {
                    inTime = new Date(jan3.punches[i]);
                    outTime = new Date(jan3.punches[i + 1]);
                } else if (jan3.punches[i].time) {
                    inTime = new Date(jan3.punches[i].time);
                    outTime = new Date(jan3.punches[i + 1].time);
                }
                
                if (inTime && outTime) {
                    const sessionMs = outTime - inTime;
                    const sessionHours = sessionMs / (1000 * 60 * 60);
                    totalMs += sessionMs;
                    console.log(`   Session ${Math.floor(i / 2) + 1}: ${inTime.toLocaleTimeString()} to ${outTime.toLocaleTimeString()} = ${sessionHours.toFixed(2)}h`);
                }
            }
        }
        
        const totalHours = totalMs / (1000 * 60 * 60);
        const hours = Math.floor(totalHours);
        const minutes = Math.floor((totalHours - hours) * 60);
        const seconds = Math.floor(((totalHours - hours) * 60 - minutes) * 60);
        
        console.log(`\n   📊 TOTAL: ${totalHours.toFixed(2)} hours = ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    } else {
        console.log('   ⚠️ No punches array or not an array');
        console.log('   Type:', typeof jan3.punches);
        console.log('   Value:', jan3.punches);
    }
}

checkJan3Punches().catch(console.error);
