import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function listTables() {
    console.log('📋 Listing all tables in the database...\n');
    
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
    
    if (error) {
        console.log('Error:', error.message);
        // Try alternative method
        console.log('\nTrying to list tables by querying each known table...\n');
        
        const tables = [
            'opoint_users',
            'opoint_payslips',
            'opoint_time_entries',
            'opoint_clock_logs',
            'opoint_attendance',
            'opoint_companies'
        ];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (!error) {
                console.log(`✅ ${table} exists`);
            } else {
                console.log(`❌ ${table} - ${error.message}`);
            }
        }
    } else {
        console.log('Tables found:');
        data.forEach(t => console.log(`  - ${t.table_name}`));
    }
}

listTables().catch(console.error);
