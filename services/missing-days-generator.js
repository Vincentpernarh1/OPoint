import cron from 'node-cron';
import { getSupabaseClient } from './database.js';

/**
 * Missing Days Generator: Automatically creates placeholder entries for weekdays
 * where employees have no punches, allowing them to request adjustments
 * Runs daily at midnight (00:00)
 */

export async function generateMissingDayEntries() {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.log('⚠️  Supabase client not available for missing days generator');
        return;
    }

    try {
        const now = new Date();
        // Check yesterday's date (since we run at midnight for the previous day)
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dayOfWeek = yesterday.getDay();
        
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            console.log(`⏭️  Skipping weekend: ${yesterday.toISOString().split('T')[0]}`);
            return;
        }
        
        const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
        
        console.log(`📅 Checking for missing punch entries on ${yesterdayStr}...`);
        
        // Get all active users (employees)
        const { data: users, error: usersError } = await supabase
            .from('opoint_users')
            .select('id, name, email, role, tenant_id')
            .neq('role', 'SuperAdmin'); // Skip super admins
        
        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }
        
        if (!users || users.length === 0) {
            console.log('✅ No users found');
            return;
        }
        
        let generatedCount = 0;
        let skippedCount = 0;
        
        for (const user of users) {
            try {
                // Skip users without a valid tenant_id
                if (!user.tenant_id || user.tenant_id === 'null' || user.tenant_id === null) {
                    skippedCount++;
                    continue;
                }

                // Check if user has any punches for yesterday
                const { data: existingLog, error: logError } = await supabase
                    .from('opoint_clock_logs')
                    .select('id, punches')
                    .eq('employee_id', user.id)
                    .eq('date', yesterdayStr)
                    .maybeSingle();
                
                if (logError) {
                    console.error(`❌ Error checking log for user ${user.name}:`, logError);
                    continue;
                }
                
                // If log exists with punches, skip
                if (existingLog && existingLog.punches && existingLog.punches.length > 0) {
                    skippedCount++;
                    continue;
                }
                
                // If log exists but empty (already generated), skip
                if (existingLog && (!existingLog.punches || existingLog.punches.length === 0)) {
                    skippedCount++;
                    continue;
                }
                
                // Get company info for tenant_id
                const { data: company, error: companyError } = await supabase
                    .from('opoint_companies')
                    .select('id, name')
                    .eq('id', user.tenant_id)
                    .single();
                
                if (companyError || !company) {
                    console.error(`❌ Error fetching company for user ${user.name}:`, companyError);
                    continue;
                }
                
                // Create placeholder entry with artificial punches (clock-out 1 second after clock-in)
                // This ensures the day appears in work history (0 hours) for adjustment requests
                const placeholderClockIn = `${yesterdayStr}T08:00:00.000Z`; // 8:00 AM UTC
                const placeholderClockOut = `${yesterdayStr}T08:00:01.000Z`; // 8:00:01 AM UTC (1 second later)
                
                const { error: insertError } = await supabase
                    .from('opoint_clock_logs')
                    .insert({
                        tenant_id: company.id,
                        employee_id: user.id,
                        employee_name: user.name,
                        company_name: company.name,
                        date: yesterdayStr,
                        punches: [
                            { type: 'in', time: placeholderClockIn, location: 'Auto-generated (no punch)', photo: null },
                            { type: 'out', time: placeholderClockOut, location: 'Auto-generated (no punch)', photo: null }
                        ],
                        clock_in: placeholderClockIn,
                        clock_out: placeholderClockOut,
                        location: 'Auto-generated (no punch)',
                        photo_url: null
                    });
                
                if (insertError) {
                    console.error(`❌ Error creating placeholder for ${user.name}:`, insertError);
                } else {
                    console.log(`✅ Generated missing day entry for ${user.name} (${yesterdayStr})`);
                    generatedCount++;
                }
                
            } catch (userError) {
                console.error(`❌ Error processing user ${user.name}:`, userError);
            }
        }
        
        console.log(`🎉 Missing days generation completed:`);
        console.log(`   - Generated: ${generatedCount} placeholder(s)`);
        console.log(`   - Skipped: ${skippedCount} (had punches or already generated)`);
        
    } catch (error) {
        console.error('❌ Error in missing days generator:', error);
    }
}

/**
 * Force run the missing days generator (for testing or manual execution)
 */
export async function forceGenerateMissingDays() {
    console.log('🔧 Forcing missing days generation...');
    await generateMissingDayEntries();
}

/**
 * Schedule the missing days generator to run daily at midnight
 * Cron expression: '0 0 * * *' = At 00:00 (midnight) every day
 */
export function scheduleMissingDaysGenerator() {
    console.log('⏰ Missing Days Generator scheduler started (runs daily at midnight)');
    
    // Run at midnight every day
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Midnight - Running missing days generator...');
        await generateMissingDayEntries();
    }, {
        timezone: "Africa/Accra" // Ghana timezone (GMT)
    });
    
    // Optional: Run on server startup to catch any missed days
    console.log('🚀 Running initial missing days check...');
    setTimeout(() => {
        generateMissingDayEntries();
    }, 5000); // Wait 5 seconds after server starts
}
