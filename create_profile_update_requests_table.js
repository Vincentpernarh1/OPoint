import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createProfileUpdateRequestsTable() {
    try {
        console.log('🚀 Creating profile update requests table...');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'create_profile_update_requests_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration SQL:');
        console.log(migrationSQL);
        console.log('');

        // Try RPC method first
        try {
            const { data, error } = await supabase.rpc('exec_sql', {
                sql: migrationSQL
            });

            if (error) {
                throw error;
            }

            console.log('✅ Table created successfully via RPC');
            return;
        } catch (rpcError) {
            console.log('⚠️  RPC method failed, trying direct SQL execution...');
        }

        // Split SQL into individual statements and execute them
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);

                const { error } = await supabase.from('_supabase_migration_temp').select('*').limit(1);

                // For DDL statements, we need to use a different approach
                // Let's try using the REST API directly
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey
                    },
                    body: JSON.stringify({
                        sql: statement
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ Failed to execute statement: ${errorText}`);
                    continue;
                }

                console.log('✅ Statement executed successfully');
            }
        }

        console.log('✅ Profile update requests table creation completed');

    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
}

createProfileUpdateRequestsTable();