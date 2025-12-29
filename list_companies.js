import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function listCompanies() {
    const { data, error } = await supabase
        .from('opoint_companies')
        .select('*');
    
    if (error) {
        console.log('❌ Error:', error.message);
        return;
    }
    
    console.log('Available Companies:');
    console.log(data);
    
    // Also check Renata's current data
    const { data: renata } = await supabase
        .from('opoint_users')
        .select('*')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    console.log('\nRenata\'s current data:');
    console.log(renata);
}

listCompanies();
