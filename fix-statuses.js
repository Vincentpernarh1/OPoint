import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function fixStatusCapitalization() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Supabase credentials not found');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
        console.log('Fixing leave request status capitalization...');
        // Fix all variations
        const { error: leaveError1 } = await supabase
            .from('opoint_leave_logs')
            .update({ status: 'Pending' })
            .eq('status', 'pending');

        const { error: leaveError2 } = await supabase
            .from('opoint_leave_logs')
            .update({ status: 'Approved' })
            .eq('status', 'approved');

        const { error: leaveError3 } = await supabase
            .from('opoint_leave_logs')
            .update({ status: 'Rejected' })
            .eq('status', 'rejected');

        if (leaveError1 || leaveError2 || leaveError3) {
            console.error('Error fixing leave requests:', leaveError1 || leaveError2 || leaveError3);
        } else {
            console.log('Fixed leave request statuses');
        }

        console.log('Fixing time adjustment status capitalization...');
        const { error: adjustmentError1 } = await supabase
            .from('opoint_clock_logs')
            .update({ adjustment_status: 'Pending' })
            .eq('adjustment_status', 'pending');

        const { error: adjustmentError2 } = await supabase
            .from('opoint_clock_logs')
            .update({ adjustment_status: 'Approved' })
            .eq('adjustment_status', 'approved');

        const { error: adjustmentError3 } = await supabase
            .from('opoint_clock_logs')
            .update({ adjustment_status: 'Rejected' })
            .eq('adjustment_status', 'rejected');

        if (adjustmentError1 || adjustmentError2 || adjustmentError3) {
            console.error('Error fixing time adjustments:', adjustmentError1 || adjustmentError2 || adjustmentError3);
        } else {
            console.log('Fixed time adjustment statuses');
        }

        console.log('Status capitalization fix completed!');
    } catch (error) {
        console.error('Error:', error);
    }
}

fixStatusCapitalization();