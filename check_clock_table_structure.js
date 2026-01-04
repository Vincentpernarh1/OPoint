import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkTableStructure() {
    console.log('🔍 CHECKING opoint_clock_logs TABLE STRUCTURE\n');
    
    // Get first row to see column names
    const { data, error } = await supabase
        .from('opoint_clock_logs')
        .select('*')
        .limit(1);
    
    if (error) {
        console.log('❌ Error:', error.message);
        return;
    }
    
    if (data && data.length > 0) {
        console.log('Column names in opoint_clock_logs:');
        Object.keys(data[0]).forEach(key => {
            console.log(`   - ${key}: ${typeof data[0][key]} = ${data[0][key]}`);
        });
        
        console.log('\n\nSample record:');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data in table');
    }
    
    // Get count
    const { count } = await supabase
        .from('opoint_clock_logs')
        .select('*', { count: 'exact', head: true });
    
    console.log(`\n\nTotal records: ${count}`);
}

checkTableStructure();
