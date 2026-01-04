import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncTimeEntries() {
    console.log('🔄 Starting time entries sync...\n');
    
    try {
        // Get all clock logs with punches arrays
        const { data: clockLogs, error: logsError } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .not('punches', 'is', null);
        
        if (logsError) throw logsError;
        
        console.log(`📋 Found ${clockLogs.length} clock logs with punches\n`);
        
        let syncedCount = 0;
        let skippedCount = 0;
        
        for (const log of clockLogs) {
            const punches = log.punches;
            
            // Skip if punches is empty or not an array
            if (!Array.isArray(punches) || punches.length === 0) {
                continue;
            }
            
            // Get the date from the log
            let logDate;
            if (log.date) {
                logDate = new Date(log.date);
            } else if (log.clock_in) {
                logDate = new Date(log.clock_in);
            } else if (punches[0]?.time) {
                logDate = new Date(punches[0].time);
            } else {
                console.log(`⚠️  Skipping log ${log.id} - no valid date found`);
                skippedCount++;
                continue;
            }
            
            const dateStr = logDate.toISOString().split('T')[0];
            
            // Check if time entries already exist for this date/employee
            const { data: existingEntries } = await supabase
                .from('opoint_time_entries')
                .select('id')
                .eq('employee_id', log.employee_id)
                .gte('timestamp', `${dateStr}T00:00:00`)
                .lt('timestamp', `${dateStr}T23:59:59`);
            
            if (existingEntries && existingEntries.length > 0) {
                console.log(`✅ Entries already exist for ${log.employee_id} on ${dateStr}`);
                skippedCount++;
                continue;
            }
            
            // Create time entries from punches
            const timeEntriesToCreate = [];
            
            for (const punch of punches) {
                if (!punch.time) continue;
                
                const punchTime = new Date(punch.time);
                const type = punch.type === 'in' ? 'CLOCK_IN' : 
                           punch.type === 'out' ? 'CLOCK_OUT' : null;
                
                if (!type) continue;
                
                timeEntriesToCreate.push({
                    employee_id: log.employee_id,
                    tenant_id: log.tenant_id,
                    timestamp: punchTime.toISOString(),
                    type: type,
                    photo: punch.photo || null,
                    location: punch.location || null,
                    created_at: new Date().toISOString()
                });
            }
            
            if (timeEntriesToCreate.length > 0) {
                const { error: insertError } = await supabase
                    .from('opoint_time_entries')
                    .insert(timeEntriesToCreate);
                
                if (insertError) {
                    console.error(`❌ Error creating entries for ${log.employee_id} on ${dateStr}:`, insertError);
                } else {
                    console.log(`✨ Created ${timeEntriesToCreate.length} time entries for ${log.employee_id} on ${dateStr}`);
                    syncedCount++;
                }
            }
        }
        
        console.log(`\n📊 Sync Summary:`);
        console.log(`   ✨ Synced: ${syncedCount} days`);
        console.log(`   ⏭️  Skipped: ${skippedCount} days (already had entries)`);
        console.log(`   ✅ Total processed: ${clockLogs.length} clock logs\n`);
        
    } catch (error) {
        console.error('❌ Sync failed:', error);
    }
}

syncTimeEntries();
