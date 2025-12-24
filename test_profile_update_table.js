import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfileUpdateRequestsTable() {
    try {
        console.log('🧪 Testing profile update requests table...');

        // Try to insert a test record
        const testData = {
            tenant_id: '6c951ee9-4b49-4b37-b4d6-3b28f54826a3', // Using the tenant ID from logs
            user_id: '00000000-0000-0000-0000-000000000001', // Dummy user ID
            employee_name: 'Test Employee',
            field_name: 'mobile_money_number',
            current_value: '0241234567',
            requested_value: '0249876543',
            requested_by: '00000000-0000-0000-0000-000000000001'
        };

        const { data, error } = await supabase
            .from('opoint_profile_update_requests')
            .insert(testData)
            .select();

        if (error) {
            console.error('❌ Table does not exist or insert failed:', error);
            return false;
        }

        console.log('✅ Table exists and insert successful:', data);

        // Clean up the test record
        await supabase
            .from('opoint_profile_update_requests')
            .delete()
            .eq('employee_name', 'Test Employee');

        return true;

    } catch (error) {
        console.error('❌ Error testing table:', error);
        return false;
    }
}

testProfileUpdateRequestsTable();