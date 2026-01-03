/**
 * Test script to verify the missing days generator functionality
 * 
 * This script simulates what happens when the cron job runs at midnight:
 * 1. Checks all users
 * 2. For each user, checks if they have punches for the previous weekday
 * 3. Generates placeholder entries for missing days
 */

import { getSupabaseClient } from './services/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMissingDaysGenerator() {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.error('❌ Supabase client not configured');
        return;
    }

    console.log('🧪 Testing Missing Days Generator\n');
    console.log('='.repeat(60));

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const dayOfWeek = yesterday.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    console.log(`📅 Checking date: ${yesterdayStr} (${dayNames[dayOfWeek]})`);
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log('⏭️  This is a weekend day - generator would skip');
        return;
    }
    
    console.log('✅ This is a weekday - generator will process\n');

    // Get all users
    const { data: users, error: usersError } = await supabase
        .from('opoint_users')
        .select('id, name, email, role, company_id')
        .neq('role', 'SuperAdmin');

    if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        return;
    }

    console.log(`👥 Found ${users.length} user(s) to check\n`);
    console.log('='.repeat(60));

    for (const user of users) {
        console.log(`\n👤 Checking: ${user.name} (${user.email})`);
        
        // Check if user has any punches for yesterday
        const { data: existingLog, error: logError } = await supabase
            .from('opoint_clock_logs')
            .select('id, punches, date')
            .eq('employee_id', user.id)
            .eq('date', yesterdayStr)
            .maybeSingle();

        if (logError) {
            console.error(`   ❌ Error checking log:`, logError.message);
            continue;
        }

        if (existingLog) {
            const punchCount = existingLog.punches ? existingLog.punches.length : 0;
            if (punchCount > 0) {
                console.log(`   ✅ Has ${punchCount} punch(es) - SKIP`);
            } else {
                console.log(`   ⚠️  Entry exists but no punches - SKIP (already generated)`);
            }
        } else {
            console.log(`   🆕 No entry found - WOULD GENERATE placeholder`);
            
            // Show what would be created
            const { data: company } = await supabase
                .from('opoint_companies')
                .select('id, name')
                .eq('id', user.company_id)
                .single();

            if (company) {
                console.log(`   📋 Would create:`);
                console.log(`      - Date: ${yesterdayStr}`);
                console.log(`      - Employee: ${user.name}`);
                console.log(`      - Company: ${company.name}`);
                console.log(`      - Punches: [] (empty - can request adjustment)`);
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed!\n');
    console.log('💡 To actually generate missing entries, use:');
    console.log('   POST http://localhost:3001/api/admin/force-missing-days');
    console.log('\n💡 Or wait for midnight when the cron job runs automatically');
}

testMissingDaysGenerator().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
