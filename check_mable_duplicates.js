import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xvutasfxqfnkqktvacbg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dXRhc2Z4cWZua3FrdHZhY2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MTM1NjEsImV4cCI6MjA0NzA4OTU2MX0.H3FLmMV5Jp-I1IEiQFUbIw-bnv5xq6fgFPMaELCdqas';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMableDuplicates() {
    try {
        console.log('\n=== CHECKING MABLE\'S JANUARY ENTRIES ===\n');
        
        // Use the user ID from the logs
        const userId = '0a60e4ca-4493-4bf9-bdae-5367e68d7019';
        
        // Get user info
        const { data: users } = await supabase
            .from('opoint_users')
            .select('id, name, email')
            .eq('id', userId)
            .single();
        
        if (!users) {
            console.log('❌ User not found');
            return;
        }
        
        console.log(`Found user: ${users.name} (${users.email})`);
        console.log(`User ID: ${userId}\n`);
        
        // Get all clock logs for January 2026
        const { data: logs } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: true });
        
        console.log(`Total clock logs in DB: ${logs.length}\n`);
        
        // Filter for January 2026
        const januaryLogs = logs.filter(log => {
            const date = new Date(log.date || log.clock_in);
            return date.getMonth() === 0 && date.getFullYear() === 2026;
        });
        
        console.log(`January 2026 logs: ${januaryLogs.length}\n`);
        
        // Group by date
        const byDate = {};
        januaryLogs.forEach(log => {
            const date = new Date(log.date || log.clock_in);
            const dateKey = date.toISOString().split('T')[0];
            if (!byDate[dateKey]) {
                byDate[dateKey] = [];
            }
            byDate[dateKey].push(log);
        });
        
        console.log('=== ENTRIES BY DATE ===\n');
        Object.keys(byDate).sort().forEach(dateKey => {
            const entries = byDate[dateKey];
            console.log(`\n📅 ${dateKey} (${entries.length} entries):`);
            
            entries.forEach((entry, idx) => {
                console.log(`\nEntry ${idx + 1}:`);
                console.log(`  ID: ${entry.id}`);
                console.log(`  Date: ${entry.date}`);
                console.log(`  Clock In: ${entry.clock_in}`);
                console.log(`  Clock Out: ${entry.clock_out}`);
                console.log(`  Punches: ${entry.punches ? JSON.stringify(entry.punches) : 'null'}`);
                console.log(`  Adjustment Status: ${entry.adjustment_status || 'null'}`);
                console.log(`  Adjustment Applied: ${entry.adjustment_applied || false}`);
                
                // Calculate hours
                if (entry.punches && Array.isArray(entry.punches) && entry.punches.length > 0) {
                    let totalMs = 0;
                    for (let i = 0; i < entry.punches.length - 1; i++) {
                        const punch1 = entry.punches[i];
                        const punch2 = entry.punches[i + 1];
                        
                        let type1 = punch1.type?.toLowerCase();
                        let type2 = punch2.type?.toLowerCase();
                        let time1 = new Date(punch1.time);
                        let time2 = new Date(punch2.time);
                        
                        if (type1 === 'in' && type2 === 'out') {
                            const pairMs = time2.getTime() - time1.getTime();
                            if (pairMs > 0) {
                                totalMs += pairMs;
                                i++; // Skip next punch
                            }
                        }
                    }
                    const hours = totalMs / (1000 * 60 * 60);
                    console.log(`  Calculated Hours: ${hours.toFixed(2)}`);
                }
            });
            
            // Check for duplicates
            const uniqueKeys = new Set();
            const duplicates = [];
            
            entries.forEach(entry => {
                let key;
                if (entry.punches && Array.isArray(entry.punches) && entry.punches.length > 0) {
                    key = JSON.stringify(entry.punches);
                } else {
                    key = `${entry.clock_in}-${entry.clock_out}`;
                }
                
                if (uniqueKeys.has(key)) {
                    duplicates.push(entry.id);
                } else {
                    uniqueKeys.add(key);
                }
            });
            
            if (duplicates.length > 0) {
                console.log(`\n⚠️  DUPLICATES DETECTED! ${duplicates.length} duplicate(s) found`);
                console.log(`   Duplicate IDs: ${duplicates.join(', ')}`);
            } else {
                console.log(`\n✅ No duplicates (${uniqueKeys.size} unique entries)`);
            }
        });
        
        console.log('\n=== SUMMARY ===');
        console.log(`Total days with entries: ${Object.keys(byDate).length}`);
        console.log(`Total entries: ${januaryLogs.length}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkMableDuplicates();
