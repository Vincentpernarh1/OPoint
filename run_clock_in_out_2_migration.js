import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function runMigration() {
    console.log('=== RUNNING MIGRATION: Add clock_in_2 and clock_out_2 columns ===\n');

    // Read the SQL migration file
    const sql = fs.readFileSync('migration_add_clock_in_out_2.sql', 'utf8');
    
    console.log('Executing SQL:');
    console.log(sql);
    console.log('\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        // If RPC doesn't exist, try using the admin client or direct SQL
        console.error('RPC method not available. Please run this SQL directly in Supabase SQL Editor:');
        console.error(sql);
        console.log('\nOr use the Supabase Admin API...');
        return;
    }

    console.log('✓ Migration completed successfully');
}

runMigration().catch(console.error);
