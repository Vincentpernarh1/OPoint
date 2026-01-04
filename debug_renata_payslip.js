import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function debugRenataPayslip() {
    console.log('🔍 DEBUGGING RENATA PAYSLIP CALCULATION\n');
    console.log('='.repeat(100));
    
    // Get Renata
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('email', '%renata%')
        .single();
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`\n👤 User: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Tenant ID: ${user.tenant_id}`);
    console.log(`   Basic Salary: GHS ${user.basic_salary}\n`);
    
    // Get January 2026 logs
    const { data: allLogs } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .eq('employee_id', user.id)
        .order('date', { ascending: true });
    
    const januaryLogs = allLogs?.filter(log => {
        if (log.date) {
            return log.date.startsWith('2026-01');
        } else if (log.clock_in) {
            const date = new Date(log.clock_in);
            return date.getMonth() === 0 && date.getFullYear() === 2026;
        }
        return false;
    }) || [];
    
    console.log(`📋 Found ${januaryLogs.length} January 2026 entries\n`);
    
    // Simulate backend calculation
    const entriesByDate = {};
    
    januaryLogs.forEach(entry => {
        // Determine date
        let clockInDate;
        if (entry.clock_in) {
            clockInDate = new Date(entry.clock_in);
        } else if (entry.date) {
            clockInDate = new Date(entry.date);
        } else if (entry.punches && entry.punches.length > 0) {
            const firstPunch = entry.punches[0];
            const punchTime = typeof firstPunch === 'object' && firstPunch.time ? firstPunch.time : firstPunch;
            clockInDate = new Date(punchTime);
        } else {
            return;
        }
        
        // Use ISO date to avoid timezone issues
        const dateKey = clockInDate.toISOString().split('T')[0];
        if (!entriesByDate[dateKey]) entriesByDate[dateKey] = [];
        entriesByDate[dateKey].push(entry);
    });
    
    console.log('📊 BACKEND CALCULATION SIMULATION:\n');
    
    let totalHours = 0;
    
    Object.keys(entriesByDate).sort().forEach(dateKey => {
        const dayEntries = entriesByDate[dateKey];
        console.log(`\n📅 ${dateKey} (${dayEntries.length} entries):`);
        
        // Check for approved adjustment
        const approvedAdjustment = dayEntries.find(e => e.adjustment_applied === true);
        
        if (approvedAdjustment) {
            console.log(`   ✅ Found approved adjustment - should ONLY count this one`);
            
            // Calculate hours
            const hasMultiSession = approvedAdjustment.clock_in_2 || approvedAdjustment.clock_out_2;
            let dayHours = 0;
            
            if (hasMultiSession) {
                if (approvedAdjustment.clock_in && approvedAdjustment.clock_out) {
                    const diff = new Date(approvedAdjustment.clock_out) - new Date(approvedAdjustment.clock_in);
                    dayHours += diff / (1000 * 60 * 60);
                }
                if (approvedAdjustment.clock_in_2 && approvedAdjustment.clock_out_2) {
                    const diff = new Date(approvedAdjustment.clock_out_2) - new Date(approvedAdjustment.clock_in_2);
                    dayHours += diff / (1000 * 60 * 60);
                }
            } else if (approvedAdjustment.clock_in && approvedAdjustment.clock_out) {
                const diff = new Date(approvedAdjustment.clock_out) - new Date(approvedAdjustment.clock_in);
                dayHours = diff / (1000 * 60 * 60);
                
                if (dayHours >= 7) {
                    dayHours = Math.max(0, dayHours - 1); // Break deduction
                }
            }
            
            console.log(`   ⏱️  Hours from approved adjustment: ${dayHours.toFixed(2)}`);
            console.log(`   🚫 Skipping ${dayEntries.length - 1} other entries for this day`);
            totalHours += dayHours;
        } else {
            console.log(`   ⚠️  No approved adjustment found`);
            
            dayEntries.forEach((entry, i) => {
                console.log(`\n   Entry ${i + 1}:`);
                console.log(`      Adjustment Applied: ${entry.adjustment_applied || 'false'}`);
                console.log(`      Adjustment Status: ${entry.adjustment_status || 'none'}`);
                console.log(`      Has Punches: ${entry.punches?.length || 0}`);
                console.log(`      Clock In: ${entry.clock_in || 'NULL'}`);
                console.log(`      Clock Out: ${entry.clock_out || 'NULL'}`);
                
                // Check if this would be counted
                const isPending = entry.adjustment_status === 'Pending';
                const isCancelled = entry.adjustment_status === 'Cancelled';
                
                if (isPending || isCancelled) {
                    console.log(`      ❌ Would be SKIPPED (${isPending ? 'Pending' : 'Cancelled'})`);
                } else if (entry.punches && entry.punches.length > 0) {
                    let dayHours = 0;
                    for (let p = 0; p < entry.punches.length - 1; p++) {
                        const punch1 = entry.punches[p];
                        const punch2 = entry.punches[p + 1];
                        
                        if (typeof punch1 === 'object' && punch1.time) {
                            const type1 = punch1.type?.toLowerCase();
                            const type2 = punch2.type?.toLowerCase();
                            
                            if (type1 === 'in' && type2 === 'out') {
                                const time1 = new Date(punch1.time);
                                const time2 = new Date(punch2.time);
                                const hours = (time2 - time1) / (1000 * 60 * 60);
                                if (hours > 0) {
                                    dayHours += hours;
                                    p++;
                                }
                            }
                        }
                    }
                    
                    if (dayHours > 0) {
                        console.log(`      ✅ Would be COUNTED: ${dayHours.toFixed(2)} hours (Valid punches)`);
                        totalHours += dayHours;
                    } else {
                        console.log(`      ❌ Would be SKIPPED (0 hours)`);
                    }
                } else if (entry.clock_in && entry.clock_out) {
                    const diff = new Date(entry.clock_out) - new Date(entry.clock_in);
                    let dayHours = diff / (1000 * 60 * 60);
                    
                    if (dayHours >= 7 && !entry.clock_in_2) {
                        dayHours = Math.max(0, dayHours - 1);
                    }
                    
                    if (dayHours > 0) {
                        console.log(`      ✅ Would be COUNTED: ${dayHours.toFixed(2)} hours (Valid entry)`);
                        totalHours += dayHours;
                    }
                } else {
                    console.log(`      ❌ Would be SKIPPED (incomplete)`);
                }
            });
        }
    });
    
    console.log('\n' + '='.repeat(100));
    console.log(`\n📊 TOTAL CALCULATED HOURS: ${totalHours.toFixed(2)} hours\n`);
    
    // Expected calculation
    const expectedHours = 176; // 22 working days × 8h
    const hoursNotWorked = expectedHours - totalHours;
    const hourlyRate = user.basic_salary / expectedHours;
    const grossPay = totalHours * hourlyRate;
    
    console.log('💰 PAYSLIP BREAKDOWN:');
    console.log(`   Expected Hours: ${expectedHours} hours`);
    console.log(`   Calculated Hours: ${totalHours.toFixed(2)} hours`);
    console.log(`   Hours Not Worked: ${hoursNotWorked.toFixed(2)} hours`);
    console.log(`   Hourly Rate: GHS ${hourlyRate.toFixed(2)}/hour`);
    console.log(`   Gross Pay: GHS ${grossPay.toFixed(2)}`);
    console.log(`\n   Payslip shows: GHS 666.59`);
    console.log(`   Expected (16h): GHS 472.73\n`);
    
    if (Math.abs(grossPay - 666.59) < 1) {
        console.log('❌ PROBLEM: Backend is calculating ~22.56 hours instead of 16 hours!');
    } else if (Math.abs(grossPay - 472.73) < 1) {
        console.log('✅ CORRECT: Backend is calculating 16 hours!');
    }
    
    console.log('='.repeat(100));
}

debugRenataPayslip().catch(console.error);
