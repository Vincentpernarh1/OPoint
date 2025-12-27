// Test license limit functionality
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://vldedsnfbvyfbpigvhzl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZGVkc25mYnZ5ZmJwaWd2aHpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTM0MTMwMSwiZXhwIjoyMDQ2OTE3MzAxfQ.OBg1W3KUXO19yrLd9GC6U9xB7GtIVp69QkPZRCTuNso';

const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE = 'http://localhost:3001';

async function testLicenseLimit() {
    console.log('🧪 Testing License Limit Functionality\n');

    try {
        // 1. Get a test company
        const { data: companies, error: companiesError } = await supabase
            .from('opoint_companies')
            .select('*')
            .limit(1);

        if (companiesError || !companies || companies.length === 0) {
            console.error('❌ No companies found');
            return;
        }

        const testCompany = companies[0];
        console.log('📊 Test Company:', testCompany.name);
        console.log('   ID:', testCompany.id);
        console.log('   License Count:', testCompany.license_count);
        console.log('   Used Licenses:', testCompany.used_licenses);
        console.log();

        // 2. Count active employees
        const { count: activeCount } = await supabase
            .from('opoint_users')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', testCompany.id)
            .eq('is_active', true);

        console.log('👥 Active Employees:', activeCount);
        console.log();

        // 3. Set license limit to test (set to current count + 2 for testing)
        const testLicenseLimit = (activeCount || 0) + 2;
        console.log(`🔧 Setting license limit to ${testLicenseLimit} for testing...`);
        
        const { error: updateError } = await supabase
            .from('opoint_companies')
            .update({ 
                license_count: testLicenseLimit,
                used_licenses: activeCount || 0
            })
            .eq('id', testCompany.id);

        if (updateError) {
            console.error('❌ Failed to update company:', updateError.message);
            return;
        }
        console.log('✅ License limit set to:', testLicenseLimit);
        console.log();

        // 4. Test API endpoint - should succeed
        console.log('📝 Test 1: Adding employee (should succeed)...');
        const response1 = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': testCompany.id
            },
            body: JSON.stringify({
                name: 'Test Employee 1',
                email: `test.employee.${Date.now()}@test.com`,
                role: 'Employee',
                basic_salary: 1000,
                is_active: true
            })
        });

        const result1 = await response1.json();
        if (result1.success) {
            console.log('✅ Employee 1 added successfully');
            console.log('   Employee ID:', result1.data.id);
        } else {
            console.log('❌ Failed to add employee 1:', result1.error);
        }
        console.log();

        // 5. Check updated used_licenses
        const { data: updatedCompany1 } = await supabase
            .from('opoint_companies')
            .select('used_licenses')
            .eq('id', testCompany.id)
            .single();

        console.log('📊 Used licenses after addition:', updatedCompany1?.used_licenses);
        console.log();

        // 6. Add another employee (should succeed)
        console.log('📝 Test 2: Adding employee (should succeed)...');
        const response2 = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': testCompany.id
            },
            body: JSON.stringify({
                name: 'Test Employee 2',
                email: `test.employee.${Date.now() + 1}@test.com`,
                role: 'Employee',
                basic_salary: 1000,
                is_active: true
            })
        });

        const result2 = await response2.json();
        if (result2.success) {
            console.log('✅ Employee 2 added successfully');
            console.log('   Employee ID:', result2.data.id);
        } else {
            console.log('❌ Failed to add employee 2:', result2.error);
        }
        console.log();

        // 7. Check updated used_licenses again
        const { data: updatedCompany2 } = await supabase
            .from('opoint_companies')
            .select('used_licenses')
            .eq('id', testCompany.id)
            .single();

        console.log('📊 Used licenses after second addition:', updatedCompany2?.used_licenses);
        console.log();

        // 8. Try adding one more (should fail - at limit)
        console.log('📝 Test 3: Adding employee (should FAIL - at limit)...');
        const response3 = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': testCompany.id
            },
            body: JSON.stringify({
                name: 'Test Employee 3',
                email: `test.employee.${Date.now() + 2}@test.com`,
                role: 'Employee',
                basic_salary: 1000,
                is_active: true
            })
        });

        const result3 = await response3.json();
        if (!result3.success && result3.error === 'License limit reached') {
            console.log('✅ Correctly blocked at license limit!');
            console.log('   Error message:', result3.licenseInfo?.message);
        } else if (result3.success) {
            console.log('❌ ERROR: Employee was added despite being at limit!');
        } else {
            console.log('⚠️  Failed with different error:', result3.error);
        }
        console.log();

        // 9. Test with inactive employee (shouldn't count towards limit)
        console.log('📝 Test 4: Adding inactive employee (should succeed - doesn\'t count)...');
        const response4 = await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': testCompany.id
            },
            body: JSON.stringify({
                name: 'Inactive Test Employee',
                email: `test.inactive.${Date.now()}@test.com`,
                role: 'Employee',
                basic_salary: 1000,
                is_active: false
            })
        });

        const result4 = await response4.json();
        if (result4.success) {
            console.log('✅ Inactive employee added (doesn\'t count towards license)');
        } else {
            console.log('❌ Failed to add inactive employee:', result4.error);
        }
        console.log();

        // 10. Final status
        const { data: finalCompany } = await supabase
            .from('opoint_companies')
            .select('license_count, used_licenses')
            .eq('id', testCompany.id)
            .single();

        const { count: finalActiveCount } = await supabase
            .from('opoint_users')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', testCompany.id)
            .eq('is_active', true);

        console.log('📊 Final Status:');
        console.log('   License Limit:', finalCompany?.license_count);
        console.log('   Used Licenses (DB):', finalCompany?.used_licenses);
        console.log('   Active Employees (Actual):', finalActiveCount);
        console.log();

        if (finalCompany?.used_licenses === finalActiveCount) {
            console.log('✅ License count is accurate!');
        } else {
            console.log('⚠️  License count mismatch!');
        }

        console.log('\n🎉 License limit testing complete!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

testLicenseLimit();
