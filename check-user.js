// Check user's company assignment
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkUser() {
    const email = process.argv[2] || 'vpernarh@gmail.com';
    
    const { data: user, error } = await supabase
        .from('P360-Opoint_User')
        .select('id, name, email, role, company_id, is_active')
        .eq('email', email)
        .single();
    
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    
    console.log('\n📊 User Details:');
    console.log('================');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Company ID:', user.company_id || '❌ NOT ASSIGNED');
    console.log('Active:', user.is_active);
    
    if (!user.company_id) {
        console.log('\n⚠️  Problem: User has no company_id assigned!');
        console.log('This is why the menu is not showing.');
        console.log('\nSolution: Run fix-user-role.sql in Supabase to assign a company.');
    }
}

checkUser();
