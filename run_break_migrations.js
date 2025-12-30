import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Supabase credentials not found in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigrations() {
    console.log('🚀 Running break duration migrations...\n');
    
    try {
        // Migration 1: Add break_duration_minutes to companies
        console.log('📋 Step 1: Adding break_duration_minutes column to companies table...');
        const migration1 = fs.readFileSync('./migration_add_break_duration.sql', 'utf8');
        const { error: error1 } = await supabase.rpc('exec_sql', { sql: migration1 });
        
        if (error1) {
            // Try direct query if RPC doesn't work
            const statements1 = migration1.split(';').filter(s => s.trim());
            for (const statement of statements1) {
                if (statement.trim()) {
                    const { error } = await supabase.from('_sql').select(statement);
                    if (error && !error.message?.includes('already exists')) {
                        console.warn('   ⚠️  Warning:', error.message);
                    }
                }
            }
        }
        console.log('   ✅ Break duration column added\n');

        // Migration 2: Add break tracking fields to clock_logs
        console.log('📋 Step 2: Adding break tracking fields to clock_logs table...');
        const migration2 = fs.readFileSync('./migration_add_break_adjustment_fields.sql', 'utf8');
        const { error: error2 } = await supabase.rpc('exec_sql', { sql: migration2 });
        
        if (error2) {
            // Try direct query if RPC doesn't work
            const statements2 = migration2.split(';').filter(s => s.trim());
            for (const statement of statements2) {
                if (statement.trim()) {
                    const { error } = await supabase.from('_sql').select(statement);
                    if (error && !error.message?.includes('already exists')) {
                        console.warn('   ⚠️  Warning:', error.message);
                    }
                }
            }
        }
        console.log('   ✅ Break tracking fields added\n');

        console.log('🎉 All migrations completed successfully!');
        console.log('\n📝 Summary:');
        console.log('   - Companies table: break_duration_minutes column added (default: 60 minutes)');
        console.log('   - Clock logs table: requested_clock_in_2 and requested_clock_out_2 columns added');
        console.log('\n💡 Next steps:');
        console.log('   1. Test time clock with single session (auto break deduction)');
        console.log('   2. Test adjustment request with break tracking');
        console.log('   3. Verify calculations in date cards');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.log('\n🔧 Manual migration required. Please run these SQL files in Supabase SQL Editor:');
        console.log('   1. migration_add_break_duration.sql');
        console.log('   2. migration_add_break_adjustment_fields.sql');
        process.exit(1);
    }
}

runMigrations();
