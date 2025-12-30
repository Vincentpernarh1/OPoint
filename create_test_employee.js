// Create a test employee for password reset testing

try {
    const dotenv = await import('dotenv');
    dotenv.config();
} catch (e) {
    console.log("NOTE: 'dotenv' package not found.");
}

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestEmployee() {
    console.log('\n📝 Creating Test Employee for Password Reset\n');

    try {
        // Get admin/first tenant
        const { data: admin } = await supabase
            .from('opoint_users')
            .select('tenant_id')
            .eq('role', 'Admin')
            .limit(1)
            .single();

        const tenantId = admin?.tenant_id || '1';

        // Check if test user exists
        const { data: existing } = await supabase
            .from('opoint_users')
            .select('*')
            .eq('email', 'testemployee@vpena.com')
            .single();

        if (existing) {
            console.log('✅ Test employee already exists:');
            console.log(`   Name: ${existing.name}`);
            console.log(`   Email: ${existing.email}`);
            console.log(`   Role: ${existing.role}`);
            return existing;
        }

        // Create test employee
        const passwordHash = await bcrypt.hash('password123', 10);

        const { data: newUser, error } = await supabase
            .from('opoint_users')
            .insert({
                name: 'Test Employee',
                email: 'testemployee@vpena.com',
                role: 'Employee',
                tenant_id: tenantId,
                password_hash: passwordHash,
                basic_salary: 500000,
                hire_date: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Failed to create test employee:', error);
            process.exit(1);
        }

        console.log('✅ Test employee created successfully:');
        console.log(`   Name: ${newUser.name}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Role: ${newUser.role}`);
        console.log(`   Initial Password: password123`);

        return newUser;

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createTestEmployee();
