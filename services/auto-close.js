import { getSupabaseClient } from './database.js';

/**
 * Auto-close feature: Automatically clocks out users at 10 PM if they're still clocked in
 * This prevents unclosed shifts from carrying over to the next day
 */

export async function autoCloseOpenShifts() {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.log('⚠️  Supabase client not available for auto-close');
        return;
    }

    try {
        const now = new Date();
        const currentHour = now.getHours();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Only run at or after 10 PM local time (22:00)
        if (currentHour < 22) {
            return;
        }
        
        // Prevent running multiple times on the same day
        if (!global.lastAutoCloseDate) {
            global.lastAutoCloseDate = {};
        }
        if (global.lastAutoCloseDate[today]) {
            return; // Already ran today
        }
        global.lastAutoCloseDate[today] = true;
        const closeTime = new Date();
        closeTime.setHours(22, 0, 0, 0); // Set to 10 PM
        
        console.log(`🕚 Running auto-close for ${today} at 10 PM...`);
        
        // Find all log entries for today where the last punch is "in" (unclosed)
        const { data: openLogs, error: fetchError } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('date', today);
        
        if (fetchError) {
            console.error('❌ Error fetching logs for auto-close:', fetchError);
            return;
        }
        
        if (!openLogs || openLogs.length === 0) {
            console.log('✅ No logs found for today');
            return;
        }
        
        let closedCount = 0;
        
        for (const log of openLogs) {
            const punches = log.punches || [];
            
            if (punches.length === 0) continue;
            
            const lastPunch = punches[punches.length - 1];
            
            // Only auto-close if last punch is "in" (no clock out)
            if (lastPunch.type === 'in') {
                const autoPunch = {
                    type: 'out',
                    time: closeTime.toISOString(),
                    location: 'Auto-closed at 10 PM',
                    photo: null,
                    auto_closed: true
                };
                
                const updatedPunches = [...punches, autoPunch];
                
                const { error: updateError } = await supabase
                    .from('opoint_clock_logs')
                    .update({
                        punches: updatedPunches,
                        clock_out: closeTime.toISOString()
                    })
                    .eq('id', log.id);
                
                if (updateError) {
                    console.error(`❌ Error auto-closing log ${log.id}:`, updateError);
                } else {
                    console.log(`✅ Auto-closed shift for employee ${log.employee_name} (${log.employee_id})`);
                    closedCount++;
                }
            }
        }
        
        console.log(`🎉 Auto-close completed: ${closedCount} shift(s) closed`);
        
    } catch (error) {
        console.error('❌ Error in auto-close job:', error);
    }
}

/**
 * Schedule auto-close to run every hour
 * It will only execute the close at 10 PM, but checks every hour
 */
export function scheduleAutoClose() {
    console.log('⏰ Auto-close scheduler started (runs every hour, closes at 10 PM)');
    
    // Run every hour
    const oneHour = 60 * 60 * 1000;
    setInterval(autoCloseOpenShifts, oneHour);
    
    // Also run immediately on startup (in case we missed 10 PM)
    autoCloseOpenShifts();
}

/**
 * Manual trigger for testing
 * Forces auto-close regardless of time
 */
export async function forceAutoClose() {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.log('⚠️  Supabase client not available');
        return { success: false, error: 'Database not configured' };
    }

    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const closeTime = new Date();
        closeTime.setHours(22, 0, 0, 0); // Set to 10 PM
        
        console.log(`🕚 FORCE auto-close for ${today}...`);
        
        const { data: openLogs, error: fetchError } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('date', today);
        
        if (fetchError) {
            return { success: false, error: fetchError.message };
        }
        
        let closedCount = 0;
        
        for (const log of openLogs) {
            const punches = log.punches || [];
            if (punches.length === 0) continue;
            
            const lastPunch = punches[punches.length - 1];
            
            // Only auto-close if last punch is "in" (no clock out)
            if (lastPunch.type === 'in') {
                const autoPunch = {
                    type: 'out',
                    time: closeTime.toISOString(),
                    location: 'Force auto-closed for testing',
                    photo: null,
                    auto_closed: true
                };
                
                const updatedPunches = [...punches, autoPunch];
                
                await supabase
                    .from('opoint_clock_logs')
                    .update({
                        punches: updatedPunches,
                        clock_out: closeTime.toISOString()
                    })
                    .eq('id', log.id);
                
                closedCount++;
            }
        }
        
        return { 
            success: true, 
            message: `Closed ${closedCount} shift(s)`,
            closedCount 
        };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}
