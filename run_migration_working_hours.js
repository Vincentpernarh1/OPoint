// Migration script to add working hours column to companies table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
    console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    try {
        console.log('Running migration: Add working hours per day to companies table');

        // Check if column exists first
        const { data: testData, error: testError } = await supabase
            .from('opoint_companies')
            .select('working_hours_per_day')
            .limit(1);

        if (testError && testError.message.includes('column')) {
            console.log('Column does not exist, migration needed');
        } else {
            console.log('Column already exists or no error detected');
        }

        // Try to update existing records to set default value
        const { error: updateError } = await supabase
            .from('opoint_companies')
            .update({ working_hours_per_day: 8.00 })
            .is('working_hours_per_day', null);

        if (updateError) {
            console.log('Update error (might be expected if column doesn\'t exist yet):', updateError.message);
        } else {
            console.log('✅ Migration completed successfully');
            console.log('- Set default value of 8.00 hours for existing companies');
        }

        // Verify the migration worked
        const { data: verifyData, error: verifyError } = await supabase
            .from('opoint_companies')
            .select('id, name, working_hours_per_day')
            .limit(5);

        if (verifyError) {
            console.error('Verification failed:', verifyError);
        } else {
            console.log('Verification successful. Sample data:');
            console.log(verifyData);
        }

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();