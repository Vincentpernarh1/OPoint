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

async function initializeLeaveBalances() {
    try {
        // Get all users
        const { data: users, error: usersError } = await supabase
            .from('opoint_users')
            .select('*');

        if (usersError) {
            console.error('Error fetching users:', usersError);
            return;
        }

        console.log(`Found ${users.length} users`);

        for (const user of users) {
            if (!user.tenant_id) continue;

            const now = new Date();

            // Annual leave: 30 days per year (always give 30 days as default)
            const annualDays = 30;

            // Maternity leave: 6 months (180 days)
            const maternityDays = 180; // 6 months

            // Sick leave: 30 days per year
            const sickDays = 30;

            const year = now.getFullYear();

            // Initialize balances
            const balances = [
                { leave_type: 'annual', total_days: annualDays },
                { leave_type: 'maternity', total_days: maternityDays },
                { leave_type: 'sick', total_days: sickDays }
            ];

            for (const balance of balances) {
                // Check if balance already exists
                const { data: existing } = await supabase
                    .from('opoint_leave_balances')
                    .select('*')
                    .eq('tenant_id', user.tenant_id)
                    .eq('employee_id', user.id)
                    .eq('leave_type', balance.leave_type)
                    .eq('year', year)
                    .single();

                if (existing) {
                    // Update existing balance with correct total_days and recalculate remaining
                    const correctRemaining = balance.total_days - existing.used_days;
                    await supabase
                        .from('opoint_leave_balances')
                        .update({
                            total_days: balance.total_days,
                            remaining_days: correctRemaining,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                    console.log(`Updated ${balance.leave_type} balance for user ${user.name}: total=${balance.total_days}, used=${existing.used_days}, remaining=${correctRemaining}`);
                } else {
                    // Check if there are old "Maternity Leave" entries to migrate used_days from
                    let usedDays = 0;
                    if (balance.leave_type === 'maternity') {
                        const { data: oldEntry } = await supabase
                            .from('opoint_leave_balances')
                            .select('used_days')
                            .eq('tenant_id', user.tenant_id)
                            .eq('employee_id', user.id)
                            .eq('leave_type', 'Maternity Leave')
                            .eq('year', year)
                            .single();

                        if (oldEntry) {
                            usedDays = oldEntry.used_days;
                            console.log(`Migrating ${usedDays} used days from old maternity entry for user ${user.name}`);
                        }
                    }

                    // Create new balance
                    const remainingDays = balance.total_days - usedDays;
                    await supabase
                        .from('opoint_leave_balances')
                        .insert({
                            tenant_id: user.tenant_id,
                            employee_id: user.id,
                            leave_type: balance.leave_type,
                            total_days: balance.total_days,
                            used_days: usedDays,
                            remaining_days: remainingDays,
                            year: year
                        });
                    console.log(`Created ${balance.leave_type} balance for user ${user.name}: total=${balance.total_days}, used=${usedDays}, remaining=${remainingDays}`);
                }
            }
        }

        console.log('Leave balances initialization complete');

    } catch (error) {
        console.error('Error initializing leave balances:', error);
    }
}

initializeLeaveBalances();