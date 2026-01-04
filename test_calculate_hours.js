import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCalculateHoursWorked() {
    const userId = 'f6776821-05d3-4c55-8434-9e838ab995aa'; // Renata
    const tenantId = '6c951ee9-4b49-4b37-b4d6-3b28f54826a3';
    const payDate = new Date('2026-01-31'); // End of January

    console.log('🧪 Testing calculateHoursWorked for Renata in January 2026\n');

    // Get clock logs
    const { data: clockLogs, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', userId);

    if (error) {
        console.error('Error fetching clock logs:', error);
        return;
    }

    console.log(`Found ${clockLogs.length} total clock logs`);

    // Filter for January 2026
    const januaryLogs = clockLogs.filter(entry => {
        let entryDate;
        if (entry.date) {
            entryDate = new Date(entry.date);
        } else if (entry.clock_in) {
            entryDate = new Date(entry.clock_in);
        } else if (entry.punches && Array.isArray(entry.punches) && entry.punches.length > 0) {
            const firstPunch = entry.punches[0];
            entryDate = new Date(typeof firstPunch === 'object' ? firstPunch.time : firstPunch);
        }

        if (!entryDate || isNaN(entryDate.getTime())) return false;

        return entryDate.getMonth() === 0 && entryDate.getFullYear() === 2026; // January is 0
    });

    console.log(`Found ${januaryLogs.length} January entries`);

    // Group by date
    const entriesByDate = {};
    januaryLogs.forEach(entry => {
        let entryDate;
        if (entry.date) {
            entryDate = new Date(entry.date);
        } else if (entry.clock_in) {
            entryDate = new Date(entry.clock_in);
        } else if (entry.punches && Array.isArray(entry.punches) && entry.punches.length > 0) {
            const firstPunch = entry.punches[0];
            entryDate = new Date(typeof firstPunch === 'object' ? firstPunch.time : firstPunch);
        }

        if (!entryDate || isNaN(entryDate.getTime())) return;

        const dateKey = entryDate.toDateString();
        if (!entriesByDate[dateKey]) {
            entriesByDate[dateKey] = [];
        }
        entriesByDate[dateKey].push(entry);
    });

    console.log(`Grouped into ${Object.keys(entriesByDate).length} days`);

    let totalHours = 0;

    Object.keys(entriesByDate).forEach(dateKey => {
        const dayEntries = entriesByDate[dateKey];

        // Find approved adjustment
        const approvedAdj = dayEntries.find(e => e.adjustment_applied === true);

        if (approvedAdj) {
            let dayHours = 0;

            if (approvedAdj.clock_in && approvedAdj.clock_out) {
                dayHours += (new Date(approvedAdj.clock_out) - new Date(approvedAdj.clock_in)) / (1000 * 60 * 60);
            }

            if (approvedAdj.clock_in_2 && approvedAdj.clock_out_2) {
                dayHours += (new Date(approvedAdj.clock_out_2) - new Date(approvedAdj.clock_in_2)) / (1000 * 60 * 60);
            }

            totalHours += dayHours;
            console.log(`${dateKey}: ${dayHours.toFixed(2)}h (Approved adjustment)`);
        } else {
            const validEntry = dayEntries.find(e =>
                (e.clock_in && e.clock_out) ||
                (e.punches && Array.isArray(e.punches) && e.punches.length >= 2)
            );

            if (!validEntry) {
                console.log(`${dateKey}: 0h (no valid data)`);
                return;
            }

            let dayHours = 0;

            if (validEntry.punches && Array.isArray(validEntry.punches) && validEntry.punches.length >= 2) {
                for (let i = 0; i < validEntry.punches.length - 1; i += 2) {
                    const punchIn = validEntry.punches[i];
                    const punchOut = validEntry.punches[i + 1];

                    const inType = typeof punchIn === 'object' ? punchIn.type : 'in';
                    const outType = typeof punchOut === 'object' ? punchOut.type : 'out';

                    if (inType !== 'in' || outType !== 'out') {
                        continue;
                    }

                    const timeIn = new Date(typeof punchIn === 'object' ? punchIn.time : punchIn);
                    const timeOut = new Date(typeof punchOut === 'object' ? punchOut.time : punchOut);

                    if (!isNaN(timeIn.getTime()) && !isNaN(timeOut.getTime())) {
                        dayHours += (timeOut - timeIn) / (1000 * 60 * 60);
                    }
                }
            } else {
                if (validEntry.clock_in && validEntry.clock_out) {
                    dayHours += (new Date(validEntry.clock_out) - new Date(validEntry.clock_in)) / (1000 * 60 * 60);
                }

                if (validEntry.clock_in_2 && validEntry.clock_out_2) {
                    dayHours += (new Date(validEntry.clock_out_2) - new Date(validEntry.clock_in_2)) / (1000 * 60 * 60);
                }

                if (dayHours >= 7) {
                    dayHours = Math.max(0, dayHours - 1); // 1 hour break
                }
            }

            totalHours += dayHours;
            console.log(`${dateKey}: ${dayHours.toFixed(2)}h`);
        }
    });

    console.log(`\nTotal hours: ${totalHours.toFixed(2)}`);
}

testCalculateHoursWorked().catch(console.error);