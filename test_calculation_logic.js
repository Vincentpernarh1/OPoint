import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Calculate like the server does
async function testCalculation() {
    const userId = 'f6776821-05d3-4c55-8434-9e838ab995aa';
    const payDate = new Date('2026-01-04');
    const currentMonth = payDate.getMonth(); // 0 = January
    const currentYear = payDate.getFullYear(); // 2026
    
    const { data: clockLogs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', userId);
    
    console.log(`Total logs: ${clockLogs.length}`);
    
    // Group by date
    const entriesByDate = {};
    
    clockLogs.forEach(entry => {
        let entryDate;
        if (entry.date) {
            entryDate = new Date(entry.date);
        } else if (entry.clock_in) {
            entryDate = new Date(entry.clock_in);
        }
        
        if (!entryDate || isNaN(entryDate.getTime())) {
            return;
        }
        
        // Filter for January 2026
        if (entryDate.getMonth() !== currentMonth || entryDate.getFullYear() !== currentYear) {
            return;
        }
        
        const dateKey = entryDate.toDateString();
        if (!entriesByDate[dateKey]) {
            entriesByDate[dateKey] = [];
        }
        entriesByDate[dateKey].push(entry);
    });
    
    console.log(`\nDays in January: ${Object.keys(entriesByDate).length}`);
    console.log(`Dates: ${Object.keys(entriesByDate).sort().join(', ')}\n`);
    
    let total = 0;
    
    Object.keys(entriesByDate).sort().forEach(dateKey => {
        const dayEntries = entriesByDate[dateKey];
        console.log(`\n${dateKey} (${dayEntries.length} entries):`);
        
        const approvedAdj = dayEntries.find(e => e.adjustment_applied === true);
        
        if (approvedAdj) {
            let dayHours = 0;
            
            if (approvedAdj.clock_in && approvedAdj.clock_out) {
                const h1 = (new Date(approvedAdj.clock_out) - new Date(approvedAdj.clock_in)) / (1000 * 60 * 60);
                console.log(`  Session 1: ${h1.toFixed(2)}h`);
                dayHours += h1;
            }
            
            if (approvedAdj.clock_in_2 && approvedAdj.clock_out_2) {
                const h2 = (new Date(approvedAdj.clock_out_2) - new Date(approvedAdj.clock_in_2)) / (1000 * 60 * 60);
                console.log(`  Session 2: ${h2.toFixed(2)}h`);
                dayHours += h2;
            }
            
            console.log(`  ✅ Total: ${dayHours.toFixed(2)}h`);
            total += dayHours;
        } else {
            console.log(`  ⏭️ No approved adjustment`);
        }
    });
    
    console.log(`\n📊 TOTAL: ${total.toFixed(2)} hours`);
    console.log(`💰 Gross Pay: GHS ${((5200 / 176) * total).toFixed(2)}`);
    console.log(`   Expected: GHS 472.73`);
}

testCalculation().catch(console.error);
