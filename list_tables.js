import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function listTables() {
    const { data, error } = await supabase.rpc('list_tables');
    
    if (error) {
        console.log('Trying alternative method...');
        
        // Try to query information schema
        const { data: tables, error: err } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
        
        if (err) {
            console.log('Error:', err.message);
            
            // List known tables
            console.log('\nTrying known table patterns...\n');
            const knownTables = [
                'opoint_users',
                'opoint_companies', 
                'opoint_attendance',
                'opoint_payslips',
                'attendance',
                'payslips',
                'users',
                'time_records',
                'time_entries'
            ];
            
            for (const table of knownTables) {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });
                
                if (!error) {
                    console.log(`✅ ${table} (${count} records)`);
                }
            }
        } else {
            console.log('Tables:', tables);
        }
    } else {
        console.log('Tables:', data);
    }
}

listTables();
