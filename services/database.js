import { createClient } from '@supabase/supabase-js';

let supabase = null;
let supabaseAdmin = null;
let currentTenantId = null;
let currentUserId = null;

// Create Supabase client with error handling
export function getSupabaseClient() {
    // Read environment variables inside the function to ensure dotenv has loaded
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️  Supabase credentials not found. Database features disabled.');
        return null;
    }
    
    if (!supabase) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
    
    return supabase;
}

// Create Supabase admin client with service role key (bypasses RLS)
export function getSupabaseAdminClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
        console.warn('⚠️  Supabase service role credentials not found. Admin operations disabled.');
        return null;
    }
    
    if (!supabaseAdmin) {
        supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    }
    
    return supabaseAdmin;
}

// Set tenant context
export function setTenantContext(tenantId, userId = null) {
    currentTenantId = tenantId;
    currentUserId = userId;
    console.log('✅ Tenant context set:', tenantId);
}

// Get current tenant context
export function getCurrentTenantId() {
    return currentTenantId;
}


// Database Helper Functions
export const db = {
    // --- USERS / EMPLOYEES ---
    async getUsers() {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: [], error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_users')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        return { data, error };
    },

    async getUserById(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_users')
            .select('*')
            .eq('id', userId)
            .eq('tenant_id', tenantId)
            .single();

        return { data, error };
    },

    async createUser(userData) {
        const client = getSupabaseAdminClient(); // Use admin client to bypass RLS
        if (!client) {
            console.error('Admin client not available');
            return { data: null, error: 'Database not configured' };
        }

        // Use tenant_id from userData if provided, otherwise get from context
        const tenantId = userData.tenant_id || getCurrentTenantId();
        if (!tenantId) {
            console.error('No tenant context set');
            return { data: null, error: 'No tenant context set' };
        }

        // Remove tenant_id from userData if it exists to avoid duplication
        const { tenant_id, ...dataToInsert } = userData;

        console.log('Creating user with data:', { ...dataToInsert, tenant_id: tenantId });

        const { data, error } = await client
            .from('opoint_users')
            .insert([{ ...dataToInsert, tenant_id: tenantId }])
            .select()
            .single();

        if (error) {
            console.error('Supabase insert error:', error);
        } else {
            console.log('User created successfully:', data);
        }

        return { data, error };
    },

    async updateUser(userId, updates) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_users')
            .update(updates)
            .eq('id', userId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        return { data, error };
    },

    async deleteUser(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_users')
            .delete()
            .eq('id', userId)
            .eq('tenant_id', tenantId);

        return { data, error };
    },

    // --- COMPANIES ---
    async getCompanies() {
        const client = getSupabaseAdminClient(); // Use admin client to bypass RLS
        if (!client) return { data: [], error: 'Database not configured' };
        
        const { data, error } = await client
            .from('opoint_companies')
            .select('*')
            .order('created_at', { ascending: false });
        
        return { data, error };
    },

    async createCompany(companyData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const { data, error } = await client
            .from('opoint_companies')
            .insert([companyData])
            .select()
            .single();
        
        return { data, error };
    },

    // --- PAYROLL HISTORY ---
    async createPayrollRecord(payrollData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_payroll_history')
            .insert([{ ...payrollData, tenant_id: tenantId }])
            .select()
            .single();

        return { data, error };
    },

    async getPayrollHistory(filters = {}) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: [], error: 'No tenant context set' };

        let query = client
            .from('opoint_payroll_history')
            .select('*, opoint_users(name, email)')
            .eq('tenant_id', tenantId);

        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        if (filters.month && filters.year) {
            const startDate = new Date(filters.year, filters.month - 1, 1);
            const endDate = new Date(filters.year, filters.month, 0);
            query = query
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        return { data, error };
    },

    async updatePayrollStatus(transactionId, status) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_payroll_history')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('transaction_id', transactionId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        return { data, error };
    },

    // --- LEAVE MANAGEMENT ---
    async createLeaveRequest(leaveData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_leave_logs')
            .insert([{ ...leaveData, tenant_id: tenantId }])
            .select()
            .single();

        return { data, error };
    },

    async getLeaveRequests(filters = {}) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: [], error: 'No tenant context set' };

        let query = client
            .from('opoint_leave_logs')
            .select('*, opoint_users(name, email)')
            .eq('tenant_id', tenantId);

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        return { data, error };
    },

    async updateLeaveRequest(leaveId, updates) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_leave_logs')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', leaveId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        return { data, error };
    },

    // --- AUTHENTICATION ---
    async getUserByEmail(email) {
        const client = getSupabaseAdminClient(); // Use admin client to bypass RLS
        if (!client) return { data: null, error: 'Database not configured' };

        const { data, error } = await client
            .from('opoint_users')
            .select('*')
            .ilike('email', email)
            .eq('status', 'Active')
            .single();

        return { data, error };
    },

    async updateUserPassword(userId, passwordHash) {
        const client = getSupabaseAdminClient(); // Use admin client to bypass RLS
        if (!client) return { data: null, error: 'Database not configured' };

        const { data, error } = await client
            .from('opoint_users')
            .update({
                password_hash: passwordHash,
                temporary_password: null, // Clear temporary password
                requires_password_change: false,
                password_changed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        return { data, error };
    },

    async updateLastLogin(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const { data, error } = await client
            .from('opoint_users')
            .update({ 
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();
        
        return { data, error };
    },

    // Legacy Supabase Auth (kept for backward compatibility)
    async signIn(email, password) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });
        
        return { data, error };
    },

    async signUp(email, password, metadata = {}) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });
        
        return { data, error };
    },

    async signOut() {
        const client = getSupabaseClient();
        if (!client) return { error: 'Database not configured' };
        
        const { error } = await client.auth.signOut();
        return { error };
    },

    async getCurrentUser() {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const { data, error } = await client.auth.getUser();
        return { data, error };
    },

    // --- ANNOUNCEMENTS ---
    async getAnnouncements() {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: [], error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_announcements')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        return { data, error };
    },

    async createAnnouncement(announcementData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_announcements')
            .insert([{ ...announcementData, tenant_id: tenantId }])
            .select()
            .single();

        return { data, error };
    },

    async updateAnnouncement(announcementId, updates) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_announcements')
            .update(updates)
            .eq('id', announcementId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        return { data, error };
    },

    async deleteAnnouncement(announcementId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_announcements')
            .delete()
            .eq('id', announcementId)
            .eq('tenant_id', tenantId);

        return { data, error };
    },

    // --- NOTIFICATIONS ---
    async getNotifications(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: [], error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_notifications')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        return { data, error };
    },

    async createNotification(notificationData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_notifications')
            .insert([{ ...notificationData, tenant_id: tenantId }])
            .select()
            .single();

        return { data, error };
    },

    async markNotificationAsRead(notificationId, userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        return { data, error };
    },

    async markAllNotificationsAsRead(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .eq('is_read', false);

        return { data, error };
    },

    async getUnreadNotificationCount(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: 0, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: 0, error: 'No tenant context set' };

        const { count, error } = await client
            .from('opoint_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .eq('is_read', false);

        return { data: count || 0, error };
    }
};

export default db;
