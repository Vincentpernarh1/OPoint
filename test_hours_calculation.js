import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Replicate the calculateHoursWorked logic from server.js
async function calculateHoursWorked(userId, tenantId, payDate) {
    try {
        const currentMonth = payDate.getMonth();
        const currentYear = payDate.getFullYear();

        // Get company break duration setting
        let breakDurationMinutes = 60; // Default 60 minutes
        const { data: company } = await supabase
            .from('opoint_companies')
            .select('break_duration_minutes')
            .eq('id', tenantId)
            .single();
        if (company && company.break_duration_minutes !== undefined && company.break_duration_minutes !== null) {
            breakDurationMinutes = company.break_duration_minutes;
        }

        // Get clock logs for the user
        const { data: clockLogs, error } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('employee_id', userId)
            .eq('tenant_id', tenantId);

        if (error || !clockLogs || clockLogs.length === 0) {
            console.log(`⚠️ No clock logs found for user ${userId}`);
            return null;
        }
        
        console.log(`📋 Found ${clockLogs.length} total clock logs for user ${userId}`);

        let totalHoursWorked = 0;
        let skippedNoClockOut = 0;
        let skippedWrongMonth = 0;

        const entriesByDate = {};
        const TOLERANCE_MINUTES = 10;
        const EXPECTED_DAILY_HOURS = 8;
        
        clockLogs.forEach(entry => {
            // Skip entries without clock_in AND without punches array
            if (!entry.clock_in && (!entry.punches || entry.punches.length === 0)) {
                skippedNoClockOut++;
                return;
            }
            
            // Determine date from either clock_in or date field (for punches-only entries)
            let clockInDate;
            if (entry.clock_in) {
                clockInDate = new Date(entry.clock_in);
            } else if (entry.date) {
                clockInDate = new Date(entry.date);
            } else if (entry.punches && entry.punches.length > 0) {
                // Get date from first punch
                const firstPunch = entry.punches[0];
                const punchTime = typeof firstPunch === 'object' && firstPunch.time ? firstPunch.time : firstPunch;
                clockInDate = new Date(punchTime);
            } else {
                skippedNoClockOut++;
                return;
            }
            
            // Filter for current month
            if (clockInDate.getMonth() !== currentMonth || clockInDate.getFullYear() !== currentYear) {
                skippedWrongMonth++;
                return;
            }
            
            // Skip if no clock_out AND no punches array
            if (!entry.clock_out && (!entry.punches || entry.punches.length === 0)) {
                skippedNoClockOut++;
                return;
            }
            
            const dateKey = clockInDate.toDateString();
            if (!entriesByDate[dateKey]) {
                entriesByDate[dateKey] = [];
            }
            entriesByDate[dateKey].push(entry);
        });
        
        const validEntries = Object.keys(entriesByDate).length;
        console.log(`⏱️ Filtered results: ${validEntries} days with entries, skipped ${skippedNoClockOut} incomplete, ${skippedWrongMonth} wrong month\n`);

        // Calculate hours for each day
        Object.keys(entriesByDate).forEach(dateKey => {
            const dayEntries = entriesByDate[dateKey];
            
            console.log(`\n📅 Processing ${dateKey} (${dayEntries.length} entries)`);
            
            // Process each entry
            dayEntries.forEach(entry => {
                let dayTotalMs = 0;
                let shouldCountThisEntry = false;
                
                // Check if it's an approved adjustment
                const isApprovedAdjustment = entry.adjustment_applied === true;
                
                // PRIORITY 1: Check if entry has punches array (new architecture)
                if (entry.punches && Array.isArray(entry.punches) && entry.punches.length > 0) {
                    console.log(`   🔍 Processing punches array (${entry.punches.length} punches)`);
                    
                    // Group punches into IN/OUT pairs
                    for (let i = 0; i < entry.punches.length - 1; i++) {
                        const punch1 = entry.punches[i];
                        const punch2 = entry.punches[i + 1];
                        
                        // Handle both object format {type, time} and direct timestamp string
                        let type1, type2, time1, time2;
                        
                        if (typeof punch1 === 'object' && punch1.time) {
                            type1 = punch1.type?.toLowerCase();
                            type2 = punch2.type?.toLowerCase();
                            time1 = new Date(punch1.time);
                            time2 = new Date(punch2.time);
                        } else {
                            // For direct timestamps, pair them sequentially
                            time1 = new Date(punch1);
                            time2 = new Date(punch2);
                            // Assume sequential pairing: odd = in, even = out
                            type1 = i % 2 === 0 ? 'in' : 'out';
                            type2 = (i + 1) % 2 === 0 ? 'in' : 'out';
                        }
                        
                        // Only count IN → OUT pairs
                        if (type1 === 'in' && type2 === 'out') {
                            const pairMs = time2.getTime() - time1.getTime();
                            if (pairMs > 0) {
                                dayTotalMs += pairMs;
                                const pairHours = pairMs / (1000 * 60 * 60);
                                console.log(`      ${type1.toUpperCase()} (${time1.toLocaleTimeString()}) → ${type2.toUpperCase()} (${time2.toLocaleTimeString()}) = ${pairHours.toFixed(2)}h`);
                                i++; // Skip the next punch since we've paired it
                            }
                        } else {
                            console.log(`      Skipping invalid pair: ${type1?.toUpperCase() || '?'} → ${type2?.toUpperCase() || '?'}`);
                        }
                    }
                } else if (entry.clock_in && entry.clock_out) {
                    // Fall back to old clock_in/clock_out fields
                    console.log(`   🔍 Processing clock_in/clock_out fields`);
                    const clockIn = new Date(entry.clock_in);
                    const clockOut = new Date(entry.clock_out);
                    dayTotalMs = clockOut.getTime() - clockIn.getTime();
                    
                    // Apply break deduction for single-session days >= 7 hours
                    const minimumHoursForBreak = 7 * 60 * 60 * 1000;
                    if (dayTotalMs >= minimumHoursForBreak && breakDurationMinutes > 0) {
                        const breakMs = breakDurationMinutes * 60 * 1000;
                        dayTotalMs = Math.max(0, dayTotalMs - breakMs);
                        console.log(`      Applied ${breakDurationMinutes}min break deduction`);
                    }
                }
                
                const dayHours = dayTotalMs / (1000 * 60 * 60);
                
                // Determine if this entry should be counted
                const isPending = entry.adjustment_status === 'Pending';
                const isCancelled = entry.adjustment_status === 'Cancelled';
                
                // Don't count pending or cancelled entries (except approved adjustments)
                if (isPending || isCancelled) {
                    shouldCountThisEntry = false;
                } else if (isApprovedAdjustment) {
                    // Always count approved adjustments
                    shouldCountThisEntry = true;
                } else if (entry.punches && Array.isArray(entry.punches) && entry.punches.length > 0) {
                    // Count ALL entries with valid punches array (new architecture)
                    // as long as they have positive hours and aren't pending/cancelled
                    shouldCountThisEntry = dayHours > 0;
                } else {
                    // For old clock_in/clock_out entries, check if it's an "OK" entry (within tolerance of 8 hours)
                    const toleranceHours = TOLERANCE_MINUTES / 60;
                    const lowerBound = EXPECTED_DAILY_HOURS - toleranceHours;
                    const upperBound = EXPECTED_DAILY_HOURS + toleranceHours;
                    
                    const isOKEntry = dayHours >= lowerBound && dayHours <= upperBound;
                    shouldCountThisEntry = isOKEntry;
                }
                
                if (shouldCountThisEntry) {
                    totalHoursWorked += dayHours;
                    const reason = isApprovedAdjustment ? 'Approved adjustment' : 
                                   (entry.punches && entry.punches.length > 0) ? 'Valid punches' : 
                                   'OK entry';
                    console.log(`   ✅ COUNTED: ${dayHours.toFixed(2)} hours (${reason})`);
                } else {
                    const reason = isPending ? 'Pending' : 
                                   isCancelled ? 'Cancelled' : 
                                   dayHours === 0 ? 'Zero hours' :
                                   'Outside tolerance (not ~8 hours)';
                    console.log(`   ❌ SKIPPED: ${dayHours.toFixed(2)} hours (${reason})`);
                }
            });
        });

        console.log(`\n📊 TOTAL HOURS: ${totalHoursWorked.toFixed(2)}`);
        return totalHoursWorked;

    } catch (error) {
        console.error(`Error calculating hours:`, error);
        return null;
    }
}

async function testCalculation() {
    console.log('🧪 TESTING HOURS CALCULATION FOR MABLE - JANUARY 2026\n');
    console.log('='.repeat(100));
    
    const { data: user } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'mablepernarh@gmail.com')
        .single();
    
    if (!user) {
        console.log('❌ User not found');
        return;
    }
    
    console.log(`\n👤 User: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Tenant ID: ${user.tenant_id}\n`);
    
    const payDate = new Date('2026-01-15'); // Mid-January to capture all days
    const hours = await calculateHoursWorked(user.id, user.tenant_id, payDate);
    
    console.log('\n' + '='.repeat(100));
    console.log('\n📊 FINAL RESULT:\n');
    console.log(`   Total Hours Worked: ${hours?.toFixed(2) || '0.00'} hours`);
    
    if (hours && hours > 0) {
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        const s = Math.floor(((hours - h) * 60 - m) * 60);
        console.log(`   Time Format: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        
        console.log('\n✅ SUCCESS! Hours are now being calculated from punches array!');
        console.log(`   Frontend shows: 06:26:30`);
        console.log(`   Backend calculated: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    } else {
        console.log('\n❌ Still showing 0 hours - check the logic above');
    }
    
    console.log('\n' + '='.repeat(100));
}

testCalculation().catch(console.error);
