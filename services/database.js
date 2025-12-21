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

        // Transform snake_case to camelCase
        const transformedData = data ? data.map(user => ({
            ...user,
            tenantId: user.tenant_id,
            basicSalary: user.basic_salary,
            hireDate: user.hire_date,
            avatarUrl: user.avatar_url,
            mobileMoneyNumber: user.mobile_money_number,
            is_active: user.is_active,
            temporary_password: user.temporary_password,
            requires_password_change: user.requires_password_change,
            // Remove snake_case versions
            tenant_id: undefined,
            basic_salary: undefined,
            hire_date: undefined,
            avatar_url: undefined,
            mobile_money_number: undefined
        })) : data;

        return { data: transformedData, error };
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

        // Transform snake_case to camelCase
        const transformedData = data ? {
            ...data,
            tenantId: data.tenant_id,
            basicSalary: data.basic_salary,
            hireDate: data.hire_date,
            avatarUrl: data.avatar_url,
            mobileMoneyNumber: data.mobile_money_number,
            is_active: data.is_active,
            temporary_password: data.temporary_password,
            requires_password_change: data.requires_password_change,
            // Remove snake_case versions
            tenant_id: undefined,
            basic_salary: undefined,
            hire_date: undefined,
            avatar_url: undefined,
            mobile_money_number: undefined
        } : data;

        return { data: transformedData, error };
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

    async getCompanyById(companyId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const { data, error } = await client
            .from('opoint_companies')
            .select('*')
            .eq('id', companyId)
            .single();
        
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

        // Map user_id to employee_id for database compatibility and include employee_name
        const dbData = {
            employee_id: leaveData.user_id,
            leave_type: leaveData.leave_type,
            start_date: leaveData.start_date,
            end_date: leaveData.end_date,
            reason: leaveData.reason,
            status: leaveData.status || 'pending',
            employee_name: leaveData.employee_name,
            tenant_id: tenantId
        };

        const { data, error } = await client
            .from('opoint_leave_logs')
            .insert([dbData])
            .select()
            .single();

        return { data, error };
    },

    async getLeaveRequests(filters = {}, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();
        
        let query = client
            .from('opoint_leave_logs')
            .select('*');

        // Only filter by tenant if tenantId is provided
        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.userId) {
            query = query.eq('employee_id', filters.userId);
        }

        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        return { data, error };
    },

    async updateLeaveRequest(leaveId, updates, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();

        let query = client
            .from('opoint_leave_logs')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', leaveId);

        // Only filter by tenant if tenantId is provided
        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query.select().single();

        return { data, error };
    },

    // --- LEAVE BALANCES ---
    async getLeaveBalances(employeeId, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();

        let query = client
            .from('opoint_leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('year', new Date().getFullYear());

        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query;

        // If table doesn't exist, return empty array
        if (error && error.code === 'PGRST205') {
            console.warn('Leave balances table does not exist yet. Returning empty balances.');
            return { data: [], error: null };
        }

        return { data: data || [], error };
    },

    async updateLeaveBalance(employeeId, leaveType, usedDays, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();
        const year = new Date().getFullYear();

        // First, get current balance
        const { data: currentBalance, error: fetchError } = await client
            .from('opoint_leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('leave_type', leaveType)
            .eq('year', year)
            .eq('tenant_id', tenantId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116' && fetchError.code !== 'PGRST205') {
            return { data: null, error: fetchError };
        }

        // If table doesn't exist, return error
        if (fetchError && fetchError.code === 'PGRST205') {
            return { data: null, error: { message: 'Leave balances table does not exist yet' } };
        }

        if (currentBalance) {
            // Update existing balance
            const newUsedDays = currentBalance.used_days + usedDays;
            const newRemainingDays = currentBalance.total_days - newUsedDays;

            const { data, error } = await client
                .from('opoint_leave_balances')
                .update({
                    used_days: newUsedDays,
                    remaining_days: newRemainingDays,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentBalance.id)
                .select()
                .single();

            return { data, error };
        } else {
            // Create new balance entry (assume 0 total days initially)
            const { data, error } = await client
                .from('opoint_leave_balances')
                .insert({
                    tenant_id: tenantId,
                    employee_id: employeeId,
                    leave_type: leaveType,
                    total_days: 0,
                    used_days: usedDays,
                    remaining_days: -usedDays,
                    year: year
                })
                .select()
                .single();

            // If table doesn't exist, this will also fail
            if (error && error.code === 'PGRST205') {
                return { data: null, error: { message: 'Leave balances table does not exist yet' } };
            }

            return { data, error };
        }
    },

    async initializeLeaveBalance(employeeId, leaveType, totalDays, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();
        const year = new Date().getFullYear();

        // Check if balance already exists
        const { data: existing, error: checkError } = await client
            .from('opoint_leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('leave_type', leaveType)
            .eq('year', year)
            .eq('tenant_id', tenantId)
            .single();

        // If table doesn't exist, return error
        if (checkError && checkError.code === 'PGRST205') {
            return { data: null, error: { message: 'Leave balances table does not exist yet' } };
        }

        if (existing) {
            // Update total days and recalculate remaining
            const newRemainingDays = totalDays - existing.used_days;
            const { data, error } = await client
                .from('opoint_leave_balances')
                .update({
                    total_days: totalDays,
                    remaining_days: newRemainingDays,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            return { data, error };
        } else {
            // Create new balance
            const { data, error } = await client
                .from('opoint_leave_balances')
                .insert({
                    tenant_id: tenantId,
                    employee_id: employeeId,
                    leave_type: leaveType,
                    total_days: totalDays,
                    used_days: 0,
                    remaining_days: totalDays,
                    year: year
                })
                .select()
                .single();

            // If table doesn't exist, this will also fail
            if (error && error.code === 'PGRST205') {
                return { data: null, error: { message: 'Leave balances table does not exist yet' } };
            }

            return { data, error };
        }
    },

    // --- TIME ADJUSTMENT REQUESTS (using clock_logs table) ---
    async createTimeAdjustmentRequest(adjustmentData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        // Find existing clock log for the date, or create new one
        const startOfDay = new Date(adjustmentData.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(adjustmentData.date);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: existingLog, error: findError } = await client
            .from('opoint_clock_logs')
            .select('*')
            .eq('employee_id', adjustmentData.userId)
            .eq('tenant_id', tenantId)
            .gte('clock_in', startOfDay.toISOString())
            .lte('clock_in', endOfDay.toISOString())
            .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
            return { data: null, error: findError };
        }

        if (existingLog) {
            // Update existing log with adjustment request
            const { data, error } = await client
                .from('opoint_clock_logs')
                .update({
                    requested_clock_in: adjustmentData.requestedClockIn,
                    requested_clock_out: adjustmentData.requestedClockOut,
                    adjustment_reason: adjustmentData.reason,
                    adjustment_status: 'Pending',
                    adjustment_requested_at: new Date().toISOString()
                })
                .eq('id', existingLog.id)
                .select()
                .single();

            return { data, error };
        } else {
            // Create new log entry with adjustment request
            const { data, error } = await client
                .from('opoint_clock_logs')
                .insert({
                    tenant_id: tenantId,
                    employee_id: adjustmentData.userId,
                    employee_name: adjustmentData.employeeName,
                    requested_clock_in: adjustmentData.requestedClockIn,
                    requested_clock_out: adjustmentData.requestedClockOut,
                    adjustment_reason: adjustmentData.reason,
                    adjustment_status: 'Pending',
                    adjustment_requested_at: new Date().toISOString()
                })
                .select()
                .single();

            return { data, error };
        }
    },

    async getTimeAdjustmentRequests(filters = {}, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();

        let query = client
            .from('opoint_clock_logs')
            .select('*')
            .not('adjustment_status', 'is', null); // Only get entries with adjustment requests

        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        if (filters.status) {
            query = query.eq('adjustment_status', filters.status);
        }

        if (filters.userId) {
            query = query.eq('employee_id', filters.userId);
        }

        query = query.order('adjustment_requested_at', { ascending: false });

        const { data, error } = await query;
        return { data, error };
    },

    async updateTimeAdjustmentRequest(logId, updates, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();

        const updateData = {
            adjustment_status: updates.status,
            adjustment_reviewed_by: updates.reviewed_by,
            adjustment_reviewed_at: updates.status !== 'Pending' ? new Date().toISOString() : null
        };

        // If approved, update the actual clock times and clear requested times
        if (updates.status === 'Approved') {
            updateData.clock_in = updates.requested_clock_in;
            updateData.clock_out = updates.requested_clock_out;
            updateData.requested_clock_in = null;
            updateData.requested_clock_out = null;
        }

        const { data, error } = await client
            .from('opoint_clock_logs')
            .update(updateData)
            .eq('id', logId)
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
    async getAnnouncements(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: [], error: 'No tenant context set' };

        try {
            // Get all announcements for this tenant
            const { data: announcements, error: announcementsError } = await client
                .from('opoint_announcements')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (announcementsError) return { data: [], error: announcementsError };

            // Get read status for this user
            const { data: notifications, error: notificationsError } = await client
                .from('opoint_notifications')
                .select('announcement_id, is_read')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .eq('is_read', true);

            if (notificationsError) {
                // If notifications query fails, return announcements as unread
                console.log('DEBUG: notifications query failed, returning unread');
                return {
                    data: announcements.map(ann => ({ ...ann, readBy: [] })),
                    error: null
                };
            }

            // Create a map of read announcements
            const readAnnouncementIds = new Set(
                notifications
                    .filter(n => n.is_read)
                    .map(n => n.announcement_id)
            );

            // Format announcements with read status
            const formattedData = announcements.map(ann => ({
                ...ann,
                readBy: readAnnouncementIds.has(ann.id) ? [userId] : []
            }));

            return { data: formattedData, error: null };

        } catch (error) {
            // Fallback: return announcements without read status
            const { data: announcementsData, error: announcementsError } = await client
                .from('opoint_announcements')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (announcementsError) return { data: [], error: announcementsError };

            return {
                data: announcementsData.map(ann => ({ ...ann, readBy: [] })),
                error: null
            };
        }
    },

    async markAnnouncementsAsRead(userId) {
        const client = getSupabaseClient();
        if (!client) return { error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { error: 'No tenant context set' };

        try {
            // Update all unread notifications for this user to read
            const { error } = await client
                .from('opoint_notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .eq('is_read', false); // Only update unread ones

            return { error };

        } catch (error) {
            console.error('Error in markAnnouncementsAsRead:', error);
            return { error: error.message };
        }
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
    },

    // Clock Logs
    async createClockLog(logData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const { data, error } = await client
            .from('opoint_clock_logs')
            .insert(logData)
            .select()
            .single();

        return { data, error };
    },

    async updateClockLog(id, updates) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const { data, error } = await client
            .from('opoint_clock_logs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        return { data, error };
    },

    async getLastIncompleteClockLog(employeeId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_clock_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('employee_id', employeeId)
            .is('clock_out', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        return { data, error };
    }
};

export default db;
