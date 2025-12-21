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

async function checkBalances() {
    try {
        const { data, error } = await supabase
            .from('opoint_leave_balances')
            .select('*')
            .limit(20);

        if (error) {
            console.error('Error:', error);
            return;
        }

        console.log('Current leave balances:');
        data.forEach(row => {
            console.log(`${row.leave_type}: total=${row.total_days}, used=${row.used_days}, remaining=${row.remaining_days}`);
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

checkBalances();