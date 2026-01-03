import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteBrokenEntries() {
    try {
        console.log('🔍 Finding entries with null clock_in/clock_out for 2026-01-02...');
        
        // Delete entries for 2026-01-02 that have null clock_in and clock_out
        const { data, error } = await supabase
            .from('opoint_clock_logs')
            .delete()
            .eq('date', '2026-01-02')
            .is('clock_in', null)
            .is('clock_out', null);
        
        if (error) {
            console.error('❌ Error deleting entries:', error.message);
            return;
        }
        
        console.log('✅ Deleted broken entries for 2026-01-02');
        console.log('📊 Now run missing-days-generator.js to recreate with correct data');
        
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

deleteBrokenEntries();
