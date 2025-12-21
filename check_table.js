import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase credentials not found');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTable() {
    try {
        // Try to execute DDL using raw query - this might not work
        const { data, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_name', 'opoint_leave_balances');

        if (error) {
            console.error('Error checking table:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Table already exists');
            return;
        }

        console.log('Table does not exist. Please create it manually in Supabase SQL Editor with:');
        console.log(`
CREATE TABLE IF NOT EXISTS opoint_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    employee_id UUID,
    leave_type VARCHAR(50) NOT NULL,
    total_days DECIMAL(5,2) DEFAULT 0,
    used_days DECIMAL(5,2) DEFAULT 0,
    remaining_days DECIMAL(5,2) DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, leave_type, year)
);

CREATE INDEX IF NOT EXISTS idx_opoint_leave_balances_tenant_employee ON opoint_leave_balances(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_opoint_leave_balances_year ON opoint_leave_balances(year);
        `);

    } catch (err) {
        console.error('Error:', err);
    }
}

createTable();