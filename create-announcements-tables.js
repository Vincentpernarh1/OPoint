// Create announcements and notifications tables
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase service role credentials not found');
    console.log('Please set SUPABASE_SERVICE_ROLE_KEY in your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
    console.log('🔨 Creating announcements and notifications tables...');

    try {
        // Test if tables already exist
        const { error: testError } = await supabase.from('opoint_announcements').select('id').limit(1);
        if (!testError) {
            console.log('✅ Tables already exist');
            return;
        }

        console.log('Tables do not exist, you need to create them manually in Supabase SQL Editor');
        console.log('Run the following SQL:');

        const sql = `
-- Announcements table
CREATE TABLE IF NOT EXISTS opoint_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL,
    author_name TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS opoint_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    announcement_id UUID REFERENCES opoint_announcements(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'announcement',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcements_tenant_id ON opoint_announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON opoint_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON opoint_announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON opoint_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON opoint_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON opoint_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON opoint_notifications(created_at);
        `;

        console.log(sql);

    } catch (error) {
        console.error('Error:', error);
    }
}

createTables();