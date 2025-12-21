// =====================================================
// Create Test User in New Schema
// =====================================================
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase credentials not found in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
    console.log('🔍 Checking for existing user...');

    // Check if user already exists
    const { data: existing, error: checkError } = await supabase
        .from('opoint_users')
        .select('*')
        .ilike('email', 'vpernarh@gmail.com');

    if (checkError) {
        console.error('❌ Error checking for existing user:', checkError.message);
        process.exit(1);
    }

    if (existing && existing.length > 0) {
        console.log('✅ User already exists:');
        console.log(JSON.stringify(existing[0], null, 2));
        console.log('\n📧 Email:', existing[0].email);
        console.log('🔑 Has Temporary Password:', !!existing[0].temporary_password);
        console.log('🔒 Has Password Hash:', !!existing[0].password_hash);
        console.log('🏢 Has Tenant ID:', !!existing[0].tenant_id);
        
        // Update user if tenant_id is missing
        if (!existing[0].tenant_id && tenant) {
            console.log('🔄 Updating user with tenant_id...');
            const { error: updateError } = await supabase
                .from('opoint_users')
                .update({ tenant_id: tenant.id })
                .eq('id', existing[0].id);
            
            if (updateError) {
                console.error('❌ Failed to update tenant_id:', updateError.message);
            } else {
                console.log('✅ User updated with tenant_id:', tenant.id);
            }
        }
        
        return;
    }

    console.log('📝 Creating new test user...');

    // First, get or create a test tenant
    const { data: tenant, error: tenantError } = await supabase
        .from('opoint_companies')
        .select('id, name')
        .ilike('name', 'Vpena Teck')
        .single();

    if (tenantError || !tenant) {
        console.error('❌ Could not find Vpena Teck company. Please run insert_companies.js first');
        process.exit(1);
    }

    console.log('🏢 Using tenant:', tenant.name, '(ID:', tenant.id + ')');

    // Hash the password for testing
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('Vpernarh@20', saltRounds);

    const testUser = {
        name: 'Vincent Pernarh',
        email: 'vpernarh@gmail.com',
        password_hash: passwordHash, // Start with hashed password for testing
        // temporary_password: 'TempPass123!', // Uncomment to test first-time login
        // requires_password_change: true, // Uncomment to test first-time login
        role: 'Admin',
        basic_salary: 5000,
        mobile_money_number: '0240123456',
        hire_date: new Date().toISOString().split('T')[0],
        department: 'IT',
        position: 'Developer',
        status: 'Active',
        is_active: true,
        tenant_id: tenant.id
    };

    const { data, error } = await supabase
        .from('opoint_users')
        .insert([testUser])
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating user:', error.message);
        process.exit(1);
    }

    console.log('✅ Test user created successfully!');
    console.log('📧 Email:', data.email);
    console.log('🔑 Password: Vpernarh@20');
    console.log('🏢 Tenant:', tenant.name);
    console.log('🔄 Requires Password Change:', data.requires_password_change || false);
}

createTestUser();