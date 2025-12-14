// =====================================================
// Create Test User in Supabase
// =====================================================
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
    console.log('🔍 Checking for existing user...');
    
    // Check if user already exists
    const { data: existing, error: checkError } = await supabase
        .from('P360-Opoint_User')
        .select('*')
        .eq('email', 'Kofigogoli@gmail.com');
    
    if (checkError) {
        console.error('❌ Error checking for existing user:', checkError.message);
        console.log('\n💡 Make sure you have run the SQL setup script in Supabase first!');
        process.exit(1);
    }
    
    if (existing && existing.length > 0) {
        console.log('✅ User already exists:');
        console.log(JSON.stringify(existing[0], null, 2));
        console.log('\n📧 Email:', existing[0].email);
        console.log('🔑 Temporary Password:', existing[0].temporary_password || 'Not set');
        console.log('🔒 Has Password Hash:', !!existing[0].password_hash);
        process.exit(0);
    }
    
    console.log('📝 Creating new test user...');
    
    const testUser = {
        name: 'Bernard Pernarh',
        email: 'Kofigogoli@gmail.com',
        temporary_password: 'TempPass123!',
        role: 'SuperAdmin',
        basic_salary: 0,
        mobile_money_number: '0240000000',
        hire_date: new Date().toISOString().split('T')[0],
        department: 'Administration',
        position: 'System Administrator',
        status: 'active',
        is_active: true,
        requires_password_change: true
    };
    
    const { data, error } = await supabase
        .from('P360-Opoint_User')
        .insert([testUser])
        .select();
    
    if (error) {
        console.error('❌ Error creating user:', error.message);
        console.log('\nError details:', error);
        process.exit(1);
    }
    
    console.log('✅ Test user created successfully!');
    console.log('\n📧 Email: Kofigogoli@gmail.com');
    console.log('🔑 Temporary Password: TempPass123!');
    console.log('\n✨ You can now login to the application!');
}

createTestUser();
