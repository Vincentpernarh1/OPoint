// One-time migration script to add adjustment_applied column
import { config } from 'dotenv';
config(); // Load environment variables

import { getSupabaseClient } from './services/database.js';

async function runMigration() {
    try {
        const client = getSupabaseClient();
        if (!client) {
            console.error('Database not configured');
            return;
        }

        console.log('Running migration to add adjustment_applied column...');

        // Since we can't use raw SQL easily, let's check if the column exists by trying to select it
        // If it fails, we assume it doesn't exist and skip, but since the error is schema cache,
        // we need to add it manually in Supabase dashboard or use a different approach.

        // For now, let's try to update a dummy record to see if the column exists
        const { error: testError } = await client
            .from('opoint_clock_logs')
            .select('adjustment_applied')
            .limit(1);

        if (testError && testError.message.includes('adjustment_applied')) {
            console.log('Column does not exist, please run the migration manually in Supabase SQL editor:');
            console.log(`
ALTER TABLE opoint_clock_logs
ADD COLUMN IF NOT EXISTS adjustment_applied BOOLEAN DEFAULT FALSE;

UPDATE opoint_clock_logs
SET adjustment_applied = TRUE
WHERE adjustment_status = 'Approved';
            `);
            return;
        }

        console.log('Column already exists or migration not needed.');
    } catch (error) {
        console.error('Migration check failed:', error);
    }
}

runMigration();