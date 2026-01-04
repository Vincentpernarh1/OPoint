import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listTables() {
    console.log('📋 Listing all tables...\n');
    
    try {
        // Get all tables from public schema
        const { data, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
        
        if (error) {
            console.log('Using alternative method...\n');
            
            // Try alternative: query pg_catalog
            const { data: pgData, error: pgError } = await supabase.rpc('get_tables');
            
            if (pgError) {
                console.error('Error:', pgError);
                
                // Last resort: try querying known tables
                console.log('\nTrying to query known tables:\n');
                
                const tablesToCheck = [
                    'opoint_time_entries',
                    'time_entries',
                    'opoint_punches',
                    'punches',
                    'opoint_clock_logs',
                    'clock_logs'
                ];
                
                for (const table of tablesToCheck) {
                    const { data, error } = await supabase
                        .from(table)
                        .select('*')
                        .limit(1);
                    
                    if (!error) {
                        console.log(`✅ ${table} - EXISTS`);
                        if (data) {
                            console.log(`   Columns:`, Object.keys(data[0] || {}));
                        }
                    } else {
                        console.log(`❌ ${table} - NOT FOUND (${error.message})`);
                    }
                }
            }
        } else {
            console.log('Tables found:', data?.map(t => t.table_name));
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

listTables();
