import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAllClockLogs() {
    const userId = 'f6776821-05d3-4c55-8434-9e838ab995aa'; // Renata
    
    console.log('📋 Fetching ALL clock log columns for Renata in January 2026\n');
    
    const { data: logs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', userId);
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    // Filter to January
    const janLogs = logs.filter(log => {
        const date = log.date || log.clock_in;
        if (!date) return false;
        return date.startsWith('2026-01');
    });
    
    console.log(`Found ${janLogs.length} January entries\n`);
    console.log('='.repeat(100));
    
    janLogs.forEach((log, index) => {
        console.log(`\nENTRY ${index + 1}:`);
        console.log('─'.repeat(100));
        console.log(`ID: ${log.id}`);
        console.log(`DATE field: ${log.date}`);
        console.log(`CLOCK_IN: ${log.clock_in}`);
        console.log(`CLOCK_OUT: ${log.clock_out}`);
        console.log(`CLOCK_IN_2: ${log.clock_in_2}`);
        console.log(`CLOCK_OUT_2: ${log.clock_out_2}`);
        console.log(`ADJUSTMENT_STATUS: ${log.adjustment_status}`);
        console.log(`ADJUSTMENT_APPLIED: ${log.adjustment_applied}`);
        console.log(`REQUESTED_CLOCK_IN: ${log.requested_clock_in}`);
        console.log(`REQUESTED_CLOCK_OUT: ${log.requested_clock_out}`);
        console.log(`REQUESTED_CLOCK_IN_2: ${log.requested_clock_in_2}`);
        console.log(`REQUESTED_CLOCK_OUT_2: ${log.requested_clock_out_2}`);
        
        if (log.punches) {
            console.log(`\nPUNCHES ARRAY (${log.punches.length} items):`);
            log.punches.forEach((p, i) => {
                const punchTime = new Date(p.time);
                const date = punchTime.toISOString().split('T')[0];
                const time = punchTime.toLocaleTimeString('en-GB');
                console.log(`  ${i + 1}. ${p.type.toUpperCase().padEnd(3)} - ${date} ${time}`);
            });
        } else {
            console.log('PUNCHES: null');
        }
        
        console.log('='.repeat(100));
    });
    
    console.log('\n\n📊 SUMMARY BY DATE FIELD:\n');
    
    const byDate = {};
    janLogs.forEach(log => {
        const dateKey = log.date || 'NO_DATE';
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(log);
    });
    
    Object.keys(byDate).sort().forEach(dateKey => {
        console.log(`\n${dateKey}:`);
        byDate[dateKey].forEach(log => {
            const hasClockTimes = log.clock_in || log.clock_out;
            const hasPunches = log.punches && log.punches.length > 0;
            const status = log.adjustment_applied ? 'APPROVED' : (log.adjustment_status || 'REGULAR');
            
            console.log(`  - ${log.id.substring(0, 8)}... | ${status.padEnd(10)} | Clock times: ${hasClockTimes ? 'YES' : 'NO'} | Punches: ${hasPunches ? log.punches.length : 0}`);
        });
    });
}

fetchAllClockLogs();
