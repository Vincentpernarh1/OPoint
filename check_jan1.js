import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkJan1() {
    const { data } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', 'f6776821-05d3-4c55-8434-9e838ab995aa');
    
    const jan1 = data.filter(e => {
        const d = new Date(e.date || e.clock_in);
        return d.getDate() === 1 && d.getMonth() === 0 && d.getFullYear() === 2026;
    });
    
    console.log(`JAN 1 ENTRIES: ${jan1.length}\n`);
    jan1.forEach(e => {
        console.log('Clock In:', e.clock_in);
        console.log('Clock Out:', e.clock_out);
        console.log('Status:', e.adjustment_status);
        console.log('Applied:', e.adjustment_applied);
        console.log('Punches:', e.punches);
        
        if (e.clock_in && e.clock_out) {
            const hours = (new Date(e.clock_out) - new Date(e.clock_in)) / (1000 * 60 * 60);
            console.log('Hours:', hours.toFixed(2));
        }
        console.log('');
    });
    
    // Check time entries for Jan 1
    const { data: timeEntries } = await supabase
        .from('opoint_time_entries')
        .select('*')
        .eq('user_id', 'f6776821-05d3-4c55-8434-9e838ab995aa');
    
    const jan1Entries = timeEntries?.filter(e => {
        const d = new Date(e.timestamp);
        return d.getDate() === 1 && d.getMonth() === 0 && d.getFullYear() === 2026;
    }) || [];
    
    console.log(`TIME ENTRIES for Jan 1: ${jan1Entries.length}`);
    jan1Entries.forEach(e => {
        console.log(new Date(e.timestamp).toLocaleString(), '-', e.type);
    });
}

checkJan1().catch(console.error);
