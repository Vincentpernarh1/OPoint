import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkRenataTimeEntries() {
    console.log('🔍 CHECKING RENATA\'S TIME ENTRIES (PUNCHES)\n');
    
    // Get Renata's user
    const { data: users } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('email', '%renata%');
    
    const user = users?.[0];
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`👤 User: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Salary: GHS ${user.basic_salary}\n`);
    
    // Get time entries (punches) for January 2026
    const { data: entries } = await supabase
        .from('opoint_time_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true });
    
    console.log(`📋 Total time entries: ${entries?.length || 0}\n`);
    
    // Filter for January 2026
    const januaryEntries = entries?.filter(entry => {
        const date = new Date(entry.timestamp);
        return date.getMonth() === 0 && date.getFullYear() === 2026;
    });
    
    console.log(`📅 January 2026 entries: ${januaryEntries?.length || 0}\n`);
    
    // Group by date
    const byDate = {};
    januaryEntries?.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dateKey = date.toDateString();
        if (!byDate[dateKey]) {
            byDate[dateKey] = [];
        }
        byDate[dateKey].push(entry);
    });
    
    console.log('📊 TIME ENTRIES BY DATE:\n');
    
    let totalHours = 0;
    
    Object.keys(byDate).sort().forEach(dateKey => {
        const dayEntries = byDate[dateKey].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        console.log(`\n${dateKey}:`);
        dayEntries.forEach((entry, i) => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            console.log(`  ${i + 1}. ${time} - ${entry.type}`);
        });
        
        // Calculate hours (pair clock-ins with clock-outs)
        let dayHours = 0;
        let lastClockIn = null;
        
        for (const entry of dayEntries) {
            if (entry.type === 'CLOCK_IN') {
                lastClockIn = new Date(entry.timestamp);
            } else if (entry.type === 'CLOCK_OUT' && lastClockIn) {
                const clockOut = new Date(entry.timestamp);
                const sessionHours = (clockOut.getTime() - lastClockIn.getTime()) / (1000 * 60 * 60);
                dayHours += sessionHours;
                lastClockIn = null;
            }
        }
        
        console.log(`  💼 Day Total: ${dayHours.toFixed(2)} hours`);
        totalHours += dayHours;
    });
    
    console.log(`\n\n📊 TOTAL HOURS FROM TIME ENTRIES: ${totalHours.toFixed(2)}`);
    
    // Calculate expected pay
    const hourlyRate = user.basic_salary / 176;
    const grossPay = hourlyRate * totalHours;
    console.log(`\n💰 Hourly Rate: GHS ${hourlyRate.toFixed(2)}`);
    console.log(`💰 Expected Gross Pay: GHS ${grossPay.toFixed(2)}`);
}

checkRenataTimeEntries().catch(console.error);
