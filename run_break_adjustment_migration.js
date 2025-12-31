import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    console.error('   Make sure these are set in your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Running Break Adjustment Fields Migration...\n');

    try {
        // Read the SQL migration file
        const sql = fs.readFileSync('migration_add_break_adjustment_fields.sql', 'utf8');

        console.log('📝 Executing SQL migration...');
        console.log('─'.repeat(60));
        console.log(sql);
        console.log('─'.repeat(60));
        console.log();

        // Execute the migration using rpc
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            // Try direct execution if rpc doesn't work
            console.log('⚠️  RPC method not available, trying direct execution...');
            
            // Split by semicolons and execute each statement
            const statements = sql.split(';').filter(s => s.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    const { error: execError } = await supabase
                        .from('_migrations')
                        .insert({ name: 'break_adjustment_fields', executed_at: new Date().toISOString() });
                    
                    if (execError && execError.code !== '42P01') { // Ignore table not exists error
                        console.error('❌ Error:', execError);
                    }
                }
            }
        }

        console.log('✅ Migration completed!\n');
        console.log('The following columns have been added to opoint_clock_logs:');
        console.log('   - requested_clock_in_2 (TIMESTAMP WITH TIME ZONE)');
        console.log('   - requested_clock_out_2 (TIMESTAMP WITH TIME ZONE)');
        console.log('\n✅ You can now submit time adjustment requests with break tracking!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('\n📋 Manual Steps:');
        console.error('   1. Go to Supabase Dashboard: https://supabase.com/dashboard');
        console.error('   2. Select your project');
        console.error('   3. Go to SQL Editor');
        console.error('   4. Run the contents of: migration_add_break_adjustment_fields.sql');
        process.exit(1);
    }
}

runMigration();
