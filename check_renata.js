import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkRenata() {
    const { data, error } = await supabase
        .from('opoint_users')
        .select('id, name, email, basic_salary, company_id')
        .eq('email', 'Renata@gmail.com')
        .single();
    
    if (error) {
        console.log('Error:', error.message);
        return;
    }
    
    console.log('Renata User Data:');
    console.log(data);
    
    // Get company info
    if (data.company_id) {
        const { data: company } = await supabase
            .from('opoint_companies')
            .select('*')
            .eq('id', data.company_id)
            .single();
        console.log('\nCompany Data:');
        console.log(company);
    } else {
        console.log('\n⚠️  No company_id assigned');
        
        // Check companies
        const { data: companies } = await supabase
            .from('opoint_companies')
            .select('id, company_name')
            .limit(5);
        console.log('\nAvailable Companies:');
        console.log(companies);
    }
}

checkRenata();
