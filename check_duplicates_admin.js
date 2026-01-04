import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xvutasfxqfnkqktvacbg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dXRhc2Z4cWZua3FrdHZhY2JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTUxMzU2MSwiZXhwIjoyMDQ3MDg5NTYxfQ.V7SFIsFJ80E2uCJp5oqAQ4DqmZO_Cv-oTd-pbbKZDow';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicates() {
    try {
        const userId = '0a60e4ca-4493-4bf9-bdae-5367e68d7019';
        
        console.log('\n=== CHECKING JANUARY 2026 ENTRIES ===\n');
        console.log(`User ID: ${userId}\n`);
        
        // Get all clock logs for this user
        const { data: logs, error } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: true });
        
        if (error) {
            console.error('Error fetching logs:', error);
            return;
        }
        
        console.log(`Total logs in DB: ${logs.length}\n`);
        
        // Filter for January 2026
        const januaryLogs = logs.filter(log => {
            const dateStr = log.date || log.clock_in;
            if (!dateStr) return false;
            const date = new Date(dateStr);
            return date.getMonth() === 0 && date.getFullYear() === 2026;
        });
        
        console.log(`January 2026 logs: ${januaryLogs.length}\n`);
        
        // Group by date
        const byDate = {};
        januaryLogs.forEach(log => {
            const dateStr = log.date || log.clock_in;
            const date = new Date(dateStr);
            const dateKey = date.toISOString().split('T')[0];
            if (!byDate[dateKey]) {
                byDate[dateKey] = [];
            }
            byDate[dateKey].push(log);
        });
        
        Object.keys(byDate).sort().forEach(dateKey => {
            const entries = byDate[dateKey];
            console.log(`\n📅 ${dateKey} - ${entries.length} entries`);
            
            // Check for duplicates
            const seen = new Set();
            const duplicates = [];
            
            entries.forEach((entry, idx) => {
                let key;
                if (entry.punches && Array.isArray(entry.punches) && entry.punches.length > 0) {
                    key = JSON.stringify(entry.punches);
                } else {
                    key = `${entry.clock_in}-${entry.clock_out}`;
                }
                
                if (seen.has(key)) {
                    duplicates.push(idx + 1);
                    console.log(`   Entry ${idx + 1}: DUPLICATE - ID ${entry.id}`);
                } else {
                    seen.add(key);
                    console.log(`   Entry ${idx + 1}: Unique - ID ${entry.id}`);
                }
                
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
                                i++;
                            }
                        }
                    }
                    const hours = totalMs / (1000 * 60 * 60);
                    console.log(`              Hours: ${hours.toFixed(2)}, Status: ${entry.adjustment_status || 'OK'}`);
                }
            });
            
            if (duplicates.length > 0) {
                console.log(`   ⚠️  ${duplicates.length} duplicate(s) found!`);
            } else {
                console.log(`   ✅ No duplicates`);
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkDuplicates();
