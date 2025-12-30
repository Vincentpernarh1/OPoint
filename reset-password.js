// =====================================================
// Reset User Password
// =====================================================
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
    const email = process.argv[2] || 'vpernarh@gmail.com';
    const newPassword = process.argv[3];
    const useTemporary = process.argv[4] === '--temp';

    console.log(`\n🔄 Resetting password for: ${email}\n`);

    // Check if user exists
    const { data: user, error: findError } = await supabase
        .from('P360-Opoint_User')
        .select('*')
        .eq('email', email)
        .single();

    if (findError || !user) {
        console.error('❌ User not found:', email);
        process.exit(1);
    }

    // console.log('✅ User found:', user.name);

    let updateData = {};

    if (useTemporary || !newPassword) {
        // Set temporary password
        console.log('🔐 Setting temporary password...');
        updateData = {
            temporary_password: 'TempPass123!',
            password_hash: null,
            requires_password_change: true,
            updated_at: new Date().toISOString()
        };
    } else {
        // Hash the new password
        console.log('🔐 Hashing new password...');
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        updateData = {
            password_hash: passwordHash,
            temporary_password: null,
            requires_password_change: true, // Still require password change on first login
            password_changed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    // Update the user
    const { data, error } = await supabase
        .from('P360-Opoint_User')
        .update(updateData)
        .eq('email', email)
        .select()
        .single();

    if (error) {
        console.error('❌ Error updating password:', error.message);
        process.exit(1);
    }

    console.log('\n✅ Password reset successfully!\n');
    console.log('📧 Email:', email);
    
    if (useTemporary || !newPassword) {
        console.log('🔑 Temporary Password: TempPass123!');
        console.log('⚠️  User must change password on first login');
    } else {
        console.log('🔑 New Password:', newPassword);
        console.log('✅ User can login immediately');
    }
    
    console.log('\n');
}

console.log('='.repeat(60));
console.log('Password Reset Tool');
console.log('='.repeat(60));
console.log('\nUsage:');
console.log('  node reset-password.js [email] [password] [--temp]');
console.log('\nExamples:');
console.log('  node reset-password.js vpernarh@gmail.com --temp');
console.log('  node reset-password.js vpernarh@gmail.com MyNewPass123!');
console.log('  node reset-password.js user@example.com SecurePass456!');
console.log('='.repeat(60) + '\n');

resetPassword();
