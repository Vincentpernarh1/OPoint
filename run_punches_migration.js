import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🔄 Starting migration: Add punches column...');
    
    try {
        // Read the migration SQL file
        const sqlPath = join(__dirname, 'migration_add_punches_column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split SQL into individual statements (basic split on semicolon)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.includes('DO $$')) {
                // Special handling for DO blocks
                const fullBlock = statements.slice(i).join(';');
                const endIndex = fullBlock.indexOf('END $$');
                if (endIndex !== -1) {
                    const doBlock = fullBlock.substring(0, endIndex + 6);
                    console.log(`\\n⚙️  Executing consolidation block...`);
                    const { error } = await supabase.rpc('exec_sql', { sql_query: doBlock });
                    if (error) {
                        console.error('❌ Error executing DO block:', error);
                        throw error;
                    }
                    console.log('✅ Consolidation completed');
                    break;
                }
            } else {
                console.log(`\\n⚙️  Executing statement ${i + 1}/${statements.length}...`);
                const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
                if (error) {
                    console.error(`❌ Error executing statement:`, error);
                    console.error(`Statement was: ${statement.substring(0, 100)}...`);
                    // Continue with next statement if error is "already exists"
                    if (!error.message?.includes('already exists')) {
                        throw error;
                    } else {
                        console.log('⚠️  Column/index already exists, skipping...');
                    }
                }
            }
        }
        
        console.log('\\n✅ Migration completed successfully!');
        console.log('\\n📊 Verifying migration...');
        
        // Verify the migration
        const { data, error } = await supabase
            .from('opoint_clock_logs')
            .select('id, date, punches')
            .limit(5);
        
        if (error) {
            console.error('❌ Error verifying migration:', error);
        } else {
            console.log('Sample data after migration:');
            console.log(JSON.stringify(data, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Alternative: Direct execution using raw SQL
async function runMigrationDirect() {
    console.log('🔄 Starting direct migration...');
    
    try {
        // Step 1: Add columns using ALTER TABLE
        console.log('\n1️⃣ Adding date and punches columns...');
        const { error: alterError } = await supabase.rpc('exec', {
            sql: `
                ALTER TABLE opoint_clock_logs 
                ADD COLUMN IF NOT EXISTS date DATE,
                ADD COLUMN IF NOT EXISTS punches JSONB DEFAULT '[]'::jsonb;
            `
        });
        
        // If RPC doesn't work, we need to use Supabase Admin API or manual SQL
        // For now, let's just verify the columns exist
        console.log('⚠️  Note: Cannot execute DDL through Supabase client');
        console.log('   Please run the following SQL manually in Supabase dashboard:');
        console.log('\n   ----------------------------------------');
        console.log('   ALTER TABLE opoint_clock_logs');
        console.log('   ADD COLUMN IF NOT EXISTS date DATE,');
        console.log('   ADD COLUMN IF NOT EXISTS punches JSONB DEFAULT \'[]\'::jsonb;');
        console.log('   ');
        console.log('   CREATE INDEX IF NOT EXISTS idx_clock_logs_date');
        console.log('   ON opoint_clock_logs(employee_id, tenant_id, date);');
        console.log('   ----------------------------------------\n');
        
        // Step 2: Migrate data (this we can do through update operations)
        console.log('\n2️⃣ Migrating existing data...');
        
        // Fetch all clock logs without punches data
        const { data: logs, error: fetchError } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .or('punches.is.null,punches.eq.[]')
            .limit(1000); // Process in batches
        
        if (fetchError) {
            console.error('❌ Error fetching logs:', fetchError);
            return;
        }
        
        console.log(`   Found ${logs?.length || 0} logs to migrate`);
        
        let migratedCount = 0;
        let errorCount = 0;
        
        for (const log of logs || []) {
            try {
                // Extract date from clock_in or clock_out
                const date = log.clock_in 
                    ? new Date(log.clock_in).toISOString().split('T')[0]
                    : log.clock_out
                        ? new Date(log.clock_out).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0];
                
                // Build punches array
                const punches = [];
                if (log.clock_in) {
                    punches.push({
                        type: 'in',
                        time: log.clock_in,
                        location: log.location,
                        photo: log.photo_url
                    });
                }
                if (log.clock_out) {
                    punches.push({
                        type: 'out',
                        time: log.clock_out,
                        location: log.location,
                        photo: log.photo_url
                    });
                }
                
                // Update the log
                const { error: updateError } = await supabase
                    .from('opoint_clock_logs')
                    .update({
                        date: date,
                        punches: punches
                    })
                    .eq('id', log.id);
                
                if (updateError) {
                    console.error(`   ❌ Error updating log ${log.id}:`, updateError.message);
                    errorCount++;
                } else {
                    migratedCount++;
                    if (migratedCount % 100 === 0) {
                        console.log(`   ✅ Migrated ${migratedCount} logs...`);
                    }
                }
            } catch (err) {
                console.error(`   ❌ Error processing log ${log.id}:`, err.message);
                errorCount++;
            }
        }
        
        console.log(`\n✅ Migration completed!`);
        console.log(`   Migrated: ${migratedCount}`);
        console.log(`   Errors: ${errorCount}`);
        
        // Note about consolidation
        console.log('\n⚠️  IMPORTANT: Manual consolidation required');
        console.log('   Multiple rows for the same day should be consolidated manually.');
        console.log('   The system will now append punches to existing day rows automatically.\n');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
console.log('Choose migration method:');
console.log('Using direct execution (safer for production)...');
runMigrationDirect().then(() => {
    console.log('\\n🎉 All done!');
    process.exit(0);
});
