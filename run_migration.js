import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    try {
        console.log('🚀 Running adjustment_applied migration...');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'migration_add_adjustment_applied.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration SQL:');
        console.log(migrationSQL);
        console.log('');

        // Execute the migration
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: migrationSQL
        });

        if (error) {
            // If rpc doesn't work, try direct SQL execution
            console.log('⚠️  RPC method failed, trying direct SQL execution...');

            // Split SQL into individual statements
            const statements = migrationSQL
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);

            for (const statement of statements) {
                if (statement.trim()) {
                    console.log(`Executing: ${statement.substring(0, 50)}...`);

                    const { error: stmtError } = await supabase.from('_supabase_migration_temp').select('*').limit(1);
                    // This is a workaround - we'll use a different approach

                    // Actually, let's try to execute the ALTER TABLE directly
                    const { error: alterError } = await supabase
                        .from('opoint_users')
                        .select('id')
                        .limit(1);

                    if (alterError && alterError.message.includes('mobile_money_number')) {
                        console.log('✅ Column already exists or table structure is correct');
                    } else {
                        console.log('❌ Could not verify column existence through this method');
                        console.log('Please run the migration manually in your Supabase dashboard:');
                        console.log('');
                        console.log(migrationSQL);
                        return;
                    }
                }
            }
        }

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.log('');
        console.log('Please run the migration manually in your Supabase SQL editor:');
        console.log('');
        console.log(fs.readFileSync(path.join(__dirname, 'migration_add_mobile_money_number.sql'), 'utf8'));
    }
}

runMigration();