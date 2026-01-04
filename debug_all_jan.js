import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAllJanuary() {
    const userId = 'f6776821-05d3-4c55-8434-9e838ab995aa'; // Renata
    
    console.log('🔍 Checking ALL clock logs for January 2026\n');
    
    const { data: logs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', userId)
        .or('date.gte.2026-01-01,date.lte.2026-01-31,clock_in.gte.2026-01-01,clock_in.lte.2026-01-31');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    // Filter to January entries
    const janEntries = logs.filter(log => {
        const date = log.date || log.clock_in;
        if (!date) return false;
        return date.startsWith('2026-01');
    });
    
    console.log(`Found ${janEntries.length} January entries\n`);
    
    janEntries.sort((a, b) => {
        const dateA = a.date || a.clock_in;
        const dateB = b.date || b.clock_in;
        return dateA.localeCompare(dateB);
    });
    
    janEntries.forEach((log) => {
        const date = new Date(log.date || log.clock_in);
        const dateStr = date.toISOString().split('T')[0];
        
        console.log(`\n━━━ ${dateStr} (ID: ${log.id.substring(0, 8)}...) ━━━`);
        console.log(`  Clock In: ${log.clock_in || 'NULL'}`);
        console.log(`  Clock Out: ${log.clock_out || 'NULL'}`);
        console.log(`  Clock In 2: ${log.clock_in_2 || 'NULL'}`);
        console.log(`  Clock Out 2: ${log.clock_out_2 || 'NULL'}`);
        console.log(`  Adjustment: ${log.adjustment_status || 'none'} ${log.adjustment_applied ? '(applied)' : ''}`);
        
        if (log.punches && log.punches.length > 0) {
            console.log(`  Punches: ${log.punches.length} entries`);
            log.punches.forEach((p, i) => {
                const pTime = new Date(p.time);
                console.log(`    ${i + 1}. ${p.type.toUpperCase()} at ${pTime.toLocaleTimeString('en-GB')}`);
            });
        }
    });
}

debugAllJanuary();
