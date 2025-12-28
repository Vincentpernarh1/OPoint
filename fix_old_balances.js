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

async function migrateAndFixBalances() {
    try {
        // Get all users
        const { data: users, error: usersError } = await supabase
            .from('opoint_users')
            .select('*');

        if (usersError) {
            // console.error('Error fetching users:', usersError);
            return;
        }

        console.log(`Processing ${users.length} users`);

        for (const user of users) {
            if (!user.tenant_id) continue;

            // Check for old "Maternity Leave" entries
            const { data: oldEntry } = await supabase
                .from('opoint_leave_balances')
                .select('*')
                .eq('tenant_id', user.tenant_id)
                .eq('employee_id', user.id)
                .eq('leave_type', 'Maternity Leave')
                .eq('year', new Date().getFullYear())
                .single();

            if (oldEntry) {
                const usedDays = oldEntry.used_days;

                // Delete the old entry
                await supabase
                    .from('opoint_leave_balances')
                    .delete()
                    .eq('id', oldEntry.id);

                // Update or create the correct maternity entry with migrated used_days
                const { data: existingMaternity } = await supabase
                    .from('opoint_leave_balances')
                    .select('*')
                    .eq('tenant_id', user.tenant_id)
                    .eq('employee_id', user.id)
                    .eq('leave_type', 'maternity')
                    .eq('year', new Date().getFullYear())
                    .single();

                if (existingMaternity) {
                    // Update existing with migrated used_days
                    const newRemaining = 180 - usedDays;
                    await supabase
                        .from('opoint_leave_balances')
                        .update({
                            used_days: usedDays,
                            remaining_days: newRemaining,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingMaternity.id);
                    console.log(`Migrated ${usedDays} used days to existing maternity balance for ${user.name}`);
                } else {
                    // Create new with migrated used_days
                    await supabase
                        .from('opoint_leave_balances')
                        .insert({
                            tenant_id: user.tenant_id,
                            employee_id: user.id,
                            leave_type: 'maternity',
                            total_days: 180,
                            used_days: usedDays,
                            remaining_days: 180 - usedDays,
                            year: new Date().getFullYear()
                        });
                    console.log(`Created maternity balance with ${usedDays} migrated used days for ${user.name}`);
                }
            }
        }

        console.log('Migration and fix complete');

    } catch (err) {
        console.error('Error:', err);
    }
}

migrateAndFixBalances();