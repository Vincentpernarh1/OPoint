/**
 * Test script for one-row-per-day clock log architecture
 * Tests the new punches array implementation and auto-close feature
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE = 'http://localhost:3001';
const TEST_TENANT_ID = 'test-tenant';
const TEST_USER_ID = 'test-user';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testClockInOut() {
    console.log('\n📝 TEST 1: Clock In/Out Flow');
    console.log('=' .repeat(60));
    
    try {
        // Create test user and company if they don't exist
        const { data: existingUser } = await supabase
            .from('opoint_users')
            .select('*')
            .eq('id', TEST_USER_ID)
            .maybeSingle();
        
        if (!existingUser) {
            console.log('Creating test user...');
            await supabase
                .from('opoint_users')
                .insert({
                    id: TEST_USER_ID,
                    tenant_id: TEST_TENANT_ID,
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'Employee'
                });
        }
        
        const { data: existingCompany } = await supabase
            .from('opoint_tenants')
            .select('*')
            .eq('id', TEST_TENANT_ID)
            .maybeSingle();
        
        if (!existingCompany) {
            console.log('Creating test company...');
            await supabase
                .from('opoint_tenants')
                .insert({
                    id: TEST_TENANT_ID,
                    name: 'Test Company',
                    code: 'TEST'
                });
        }
        
        // Clock in
        console.log('\\n1️⃣ Clock In...');
        const clockInResponse = await fetch(`${API_BASE}/api/time-punches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TEST_TENANT_ID
            },
            body: JSON.stringify({
                userId: TEST_USER_ID,
                companyId: TEST_TENANT_ID,
                type: 'clock_in',
                timestamp: new Date().toISOString(),
                location: 'Test Location',
                photoUrl: null
            })
        });
        
        const clockInResult = await clockInResponse.json();
        console.log('✅ Clock in result:', clockInResult);
        
        await delay(2000);
        
        // Clock out
        console.log('\\n2️⃣ Clock Out...');
        const clockOutResponse = await fetch(`${API_BASE}/api/time-punches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TEST_TENANT_ID
            },
            body: JSON.stringify({
                userId: TEST_USER_ID,
                companyId: TEST_TENANT_ID,
                type: 'clock_out',
                timestamp: new Date().toISOString(),
                location: 'Test Location',
                photoUrl: null
            })
        });
        
        const clockOutResult = await clockOutResponse.json();
        console.log('✅ Clock out result:', clockOutResult);
        
        // Verify database structure
        console.log('\\n3️⃣ Verifying database...');
        const today = new Date().toISOString().split('T')[0];
        const { data: logs } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('employee_id', TEST_USER_ID)
            .eq('date', today);
        
        console.log(`✅ Found ${logs.length} log entry for today`);
        if (logs.length > 0) {
            console.log('   Punches:', JSON.stringify(logs[0].punches, null, 2));
        }
        
        return true;
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

async function testMultiplePunchesPerDay() {
    console.log('\n📝 TEST 2: Multiple Punches Per Day');
    console.log('='.repeat(60));
    
    try {
        // Clock in again
        console.log('\\n1️⃣ Second Clock In...');
        await fetch(`${API_BASE}/api/time-punches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TEST_TENANT_ID
            },
            body: JSON.stringify({
                userId: TEST_USER_ID,
                companyId: TEST_TENANT_ID,
                type: 'clock_in',
                timestamp: new Date().toISOString(),
                location: 'Test Location 2',
                photoUrl: null
            })
        });
        
        await delay(2000);
        
        // Clock out again
        console.log('\\n2️⃣ Second Clock Out...');
        await fetch(`${API_BASE}/api/time-punches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TEST_TENANT_ID
            },
            body: JSON.stringify({
                userId: TEST_USER_ID,
                companyId: TEST_TENANT_ID,
                type: 'clock_out',
                timestamp: new Date().toISOString(),
                location: 'Test Location 2',
                photoUrl: null
            })
        });
        
        // Verify only one row exists with multiple punches
        const today = new Date().toISOString().split('T')[0];
        const { data: logs } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('employee_id', TEST_USER_ID)
            .eq('date', today);
        
        console.log(`\\n3️⃣ Database check: ${logs.length} row(s) for today`);
        if (logs.length === 1) {
            console.log('✅ PASS: Only one row per day');
            console.log(`   Total punches: ${logs[0].punches.length}`);
            console.log('   Punches:', JSON.stringify(logs[0].punches, null, 2));
        } else {
            console.log('❌ FAIL: Expected 1 row, got', logs.length);
        }
        
        return logs.length === 1;
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

async function testAutoClose() {
    console.log('\n📝 TEST 3: Auto-Close Feature');
    console.log('='.repeat(60));
    
    try {
        // Create an open shift (clock in without clock out)
        console.log('\\n1️⃣ Creating open shift...');
        const { data: newLog } = await supabase
            .from('opoint_clock_logs')
            .insert({
                tenant_id: TEST_TENANT_ID,
                employee_id: 'auto-close-test-user',
                employee_name: 'Auto Close Test User',
                company_name: 'Test Company',
                date: new Date().toISOString().split('T')[0],
                punches: [{
                    type: 'in',
                    time: new Date().toISOString(),
                    location: 'Test Location',
                    photo: null
                }],
                clock_in: new Date().toISOString()
            })
            .select()
            .single();
        
        console.log('✅ Open shift created:', newLog.id);
        
        // Trigger force auto-close
        console.log('\\n2️⃣ Triggering force auto-close...');
        const response = await fetch(`${API_BASE}/api/admin/force-auto-close`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TEST_TENANT_ID
            }
        });
        
        const result = await response.json();
        console.log('✅ Auto-close result:', result);
        
        // Verify shift was closed
        console.log('\\n3️⃣ Verifying shift was closed...');
        const { data: closedLog } = await supabase
            .from('opoint_clock_logs')
            .select('*')
            .eq('id', newLog.id)
            .single();
        
        const lastPunch = closedLog.punches[closedLog.punches.length - 1];
        if (lastPunch.type === 'out' && lastPunch.auto_closed) {
            console.log('✅ PASS: Shift auto-closed successfully');
            console.log('   Punches:', JSON.stringify(closedLog.punches, null, 2));
            return true;
        } else {
            console.log('❌ FAIL: Shift was not auto-closed');
            return false;
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

async function testGetTimeEntries() {
    console.log('\n📝 TEST 4: Get Time Entries (Backwards Compatibility)');
    console.log('='.repeat(60));
    
    try {
        const response = await fetch(`${API_BASE}/api/time-entries?userId=${TEST_USER_ID}`, {
            headers: {
                'x-tenant-id': TEST_TENANT_ID
            }
        });
        
        const result = await response.json();
        console.log('✅ Time entries result:', result);
        
        if (result.success && result.data.length > 0) {
            console.log(`   Found ${result.data.length} time entries`);
            console.log('   Sample entry:', JSON.stringify(result.data[0], null, 2));
            return true;
        } else {
            console.log('⚠️  No time entries found');
            return false;
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

async function runAllTests() {
    console.log('\n🧪 TESTING ONE-ROW-PER-DAY CLOCK LOG ARCHITECTURE');
    console.log('='.repeat(60));
    console.log('Server:', API_BASE);
    console.log('Test User:', TEST_USER_ID);
    console.log('Test Tenant:', TEST_TENANT_ID);
    
    const results = {
        clockInOut: await testClockInOut(),
        multiplePunches: await testMultiplePunchesPerDay(),
        autoClose: await testAutoClose(),
        getTimeEntries: await testGetTimeEntries()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('Clock In/Out:', results.clockInOut ? '✅ PASS' : '❌ FAIL');
    console.log('Multiple Punches:', results.multiplePunches ? '✅ PASS' : '❌ FAIL');
    console.log('Auto-Close:', results.autoClose ? '✅ PASS' : '❌ FAIL');
    console.log('Get Time Entries:', results.getTimeEntries ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = Object.values(results).every(r => r);
    console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
    console.log('='.repeat(60) + '\n');
    
    process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests();
