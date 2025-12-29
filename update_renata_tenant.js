import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function updateRenata() {
    const tenantId = 'be711ae5-984f-42a8-a290-a7232d05e7ea'; // Vpena Teck company
    
    console.log('Updating Renata\'s company_id to:', tenantId);
    
    const { data, error } = await supabase
        .from('opoint_users')
        .update({ company_id: tenantId, tenant_id: tenantId })
        .eq('email', 'Renata@gmail.com')
        .select();
    
    if (error) {
        console.log('❌ Error:', error.message);
        return;
    }
    
    console.log('✅ Updated successfully:');
    console.log(data);
}

updateRenata();
