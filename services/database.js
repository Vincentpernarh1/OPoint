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
    // console.log('✅ Tenant context set:', tenantId);
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

    async updateUser(userId, updates) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        // Transform camelCase to snake_case for database
        const dbUpdates = {
            ...updates,
            tenant_id: updates.tenantId || tenantId,
            basic_salary: updates.basicSalary,
            hire_date: updates.hireDate,
            avatar_url: updates.avatarUrl,
            mobile_money_number: updates.mobileMoneyNumber,
            is_active: updates.isActive,
            temporary_password: updates.temporaryPassword,
            requires_password_change: updates.requiresPasswordChange,
            // Remove camelCase versions
            tenantId: undefined,
            basicSalary: undefined,
            hireDate: undefined,
            avatarUrl: undefined,
            mobileMoneyNumber: undefined,
            isActive: undefined,
            temporaryPassword: undefined,
            requiresPasswordChange: undefined
        };

        // Remove undefined values
        Object.keys(dbUpdates).forEach(key => {
            if (dbUpdates[key] === undefined) {
                delete dbUpdates[key];
            }
        });

        const { data, error } = await client
            .from('opoint_users')
            .update(dbUpdates)
            .eq('id', userId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        // Transform response back to camelCase
        const transformedData = data ? {
            ...data,
            tenantId: data.tenant_id,
            basicSalary: data.basic_salary,
            hireDate: data.hire_date,
            avatarUrl: data.avatar_url,
            mobileMoneyNumber: data.mobile_money_number,
            isActive: data.is_active,
            temporaryPassword: data.temporary_password,
            requiresPasswordChange: data.requires_password_change,
            // Remove snake_case versions
            tenant_id: undefined,
            basic_salary: undefined,
            hire_date: undefined,
            avatar_url: undefined,
            mobile_money_number: undefined,
            is_active: undefined,
            temporary_password: undefined,
            requires_password_change: undefined
        } : data;

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
            isActive: data.is_active,
            temporaryPassword: data.temporary_password,
            requiresPasswordChange: data.requires_password_change,
            // Remove snake_case versions
            tenant_id: undefined,
            basic_salary: undefined,
            hire_date: undefined,
            avatar_url: undefined,
            mobile_money_number: undefined,
            is_active: undefined,
            temporary_password: undefined,
            requires_password_change: undefined
        } : data;

        return { data: transformedData, error };
    },

    async updateUser(userId, updates) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        // Transform camelCase to snake_case for database
        const dbUpdates = {
            ...updates,
            tenant_id: updates.tenantId || tenantId,
            basic_salary: updates.basicSalary,
            hire_date: updates.hireDate,
            avatar_url: updates.avatarUrl,
            mobile_money_number: updates.mobileMoneyNumber,
            is_active: updates.isActive,
            temporary_password: updates.temporaryPassword,
            requires_password_change: updates.requiresPasswordChange,
            // Remove camelCase versions
            tenantId: undefined,
            basicSalary: undefined,
            hireDate: undefined,
            avatarUrl: undefined,
            mobileMoneyNumber: undefined,
            isActive: undefined,
            temporaryPassword: undefined,
            requiresPasswordChange: undefined
        };

        // Remove undefined values
        Object.keys(dbUpdates).forEach(key => {
            if (dbUpdates[key] === undefined) {
                delete dbUpdates[key];
            }
        });

        const { data, error } = await client
            .from('opoint_users')
            .update(dbUpdates)
            .eq('id', userId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        // Transform response back to camelCase
        const transformedData = data ? {
            ...data,
            tenantId: data.tenant_id,
            basicSalary: data.basic_salary,
            hireDate: data.hire_date,
            avatarUrl: data.avatar_url,
            mobileMoneyNumber: data.mobile_money_number,
            isActive: data.is_active,
            temporaryPassword: data.temporary_password,
            requiresPasswordChange: data.requires_password_change,
            // Remove snake_case versions
            tenant_id: undefined,
            basic_salary: undefined,
            hire_date: undefined,
            avatar_url: undefined,
            mobile_money_number: undefined,
            is_active: undefined,
            temporary_password: undefined,
            requires_password_change: undefined
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

        // Temporarily remove tenant filter to debug
        // if (tenantId) {
        //     query = query.eq('tenant_id', tenantId);
        // }

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

        console.log('Creating adjustment request:', {
            userId: adjustmentData.userId,
            date: adjustmentData.date,
            tenantId
        });

        // Find existing clock log for the date, or create new one
        const startOfDay = new Date(adjustmentData.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(adjustmentData.date);
        endOfDay.setHours(23, 59, 59, 999);

        // Check for existing adjustment requests for this day
        const { data: existingAdjustments, error: adjError } = await client
            .from('opoint_clock_logs')
            .select('adjustment_status, adjustment_applied, clock_in, requested_clock_in')
            .eq('employee_id', adjustmentData.userId)
            .eq('tenant_id', tenantId)
            .not('adjustment_status', 'is', null);

        console.log('Database query for existing adjustments:', {
            userId: adjustmentData.userId,
            tenantId,
            date: adjustmentData.date,
            existingAdjustments,
            adjError
        });

        if (adjError) {
            console.log('Database error:', adjError);
            return { data: null, error: adjError };
        }

        // Filter adjustments for the specific date
        const existingAdjustment = existingAdjustments?.find(log => {
            const logDate = log.clock_in ? new Date(log.clock_in).toISOString().split('T')[0] :
                          log.requested_clock_in ? new Date(log.requested_clock_in).toISOString().split('T')[0] : null;
            console.log('Checking log date:', { log, logDate, targetDate: adjustmentData.date, matches: logDate === adjustmentData.date });
            return logDate === adjustmentData.date;
        });

        console.log('Final existing adjustment check:', { existingAdjustment });

        if (existingAdjustment) {
            // Only block if status is Pending or Approved
            // Allow new requests if previous was Rejected or Cancelled
            if (existingAdjustment.adjustment_status === 'Pending') {
                console.log('Blocking: Pending adjustment exists');
                return { data: null, error: 'A time adjustment request is already pending for this day' };
            }
            if (existingAdjustment.adjustment_status === 'Approved' || existingAdjustment.adjustment_applied) {
                console.log('Blocking: Approved/Applied adjustment exists');
                return { data: null, error: 'This day has already been adjusted and cannot be modified' };
            }
            // If status is Rejected or Cancelled, allow new request
            console.log('Allowing new request: Previous status was', existingAdjustment.adjustment_status);
        }

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

        // If approved, update the actual clock times and clear requested times, and mark as applied
        if (updates.status === 'Approved') {
            updateData.clock_in = updates.requested_clock_in;
            updateData.clock_out = updates.requested_clock_out;
            updateData.requested_clock_in = null;
            updateData.requested_clock_out = null;
            updateData.adjustment_applied = true; // Mark that adjustment has been applied
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

    // --- EXPENSE CLAIMS ---
    async createExpenseClaim(expenseData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const dbData = {
            tenant_id: tenantId,
            employee_id: expenseData.employee_id,
            employee_name: expenseData.employee_name,
            description: expenseData.description,
            amount: expenseData.amount,
            expense_date: expenseData.expense_date,
            receipt_url: expenseData.receipt_url,
            status: expenseData.status || 'pending'
        };

        const { data, error } = await client
            .from('opoint_expense_claims')
            .insert([dbData])
            .select()
            .single();

        return { data, error };
    },

    async getExpenseClaims(filters = {}, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();

        let query = client
            .from('opoint_expense_claims')
            .select('*');

        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.employee_id) {
            query = query.eq('employee_id', filters.employee_id);
        }

        query = query.order('submitted_at', { ascending: false });

        const { data, error } = await query;
        return { data, error };
    },

    async updateExpenseClaim(claimId, updates, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();

        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        // If status is being changed to approved or rejected, set reviewed info
        if (updates.status && updates.status !== 'pending') {
            updateData.reviewed_at = new Date().toISOString();
            // reviewed_by should be passed in updates
        }

        let query = client
            .from('opoint_expense_claims')
            .update(updateData)
            .eq('id', claimId);

        if (tenantId) {
            query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query.select().single();

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

    async updateUserPassword(userId, passwordHash, tempPassword = null, requiresChange = false) {
        const client = getSupabaseAdminClient(); // Use admin client to bypass RLS
        if (!client) return { data: null, error: 'Database not configured' };

        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (passwordHash) {
            updateData.password_hash = passwordHash;
            updateData.temporary_password = null;
            updateData.requires_password_change = false;
            updateData.password_changed_at = new Date().toISOString();
        } else if (tempPassword) {
            updateData.password_hash = null;
            updateData.temporary_password = tempPassword;
            updateData.requires_password_change = requiresChange;
        }

        const { data, error } = await client
            .from('opoint_users')
            .update(updateData)
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

    async updateUserSalary(userId, newSalary) {
        const client = getSupabaseAdminClient(); // Use admin client to bypass RLS
        if (!client) return { data: null, error: 'Database not configured' };

        const { data, error } = await client
            .from('opoint_users')
            .update({
                basic_salary: newSalary,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        return { data, error };
    },
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
            // Get all announcements for the tenant
            const { data: announcements, error: annError } = await client
                .from('opoint_announcements')
                .select('id')
                .eq('tenant_id', tenantId);

            if (annError) return { error: annError };

            // Get existing notifications for this user
            const { data: existingNotifications, error: notifError } = await client
                .from('opoint_notifications')
                .select('announcement_id')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            if (notifError) return { error: notifError };

            const existingAnnouncementIds = new Set(existingNotifications.map(n => n.announcement_id));

            // Update existing notifications to read
            if (existingNotifications.length > 0) {
                const { error: updateError } = await client
                    .from('opoint_notifications')
                    .update({ is_read: true })
                    .eq('user_id', userId)
                    .eq('tenant_id', tenantId)
                    .eq('is_read', false);

                if (updateError) return { error: updateError };
            }

            // Insert notifications for announcements that don't have one
            const missingAnnouncements = announcements.filter(ann => !existingAnnouncementIds.has(ann.id));
            if (missingAnnouncements.length > 0) {
                const newNotifications = missingAnnouncements.map(ann => ({
                    user_id: userId,
                    tenant_id: tenantId,
                    announcement_id: ann.id,
                    is_read: true,
                    type: 'announcement_read',
                    title: 'Announcement Read',
                    message: 'Announcement marked as read',
                    created_at: new Date().toISOString()
                }));

                const { error: insertError } = await client
                    .from('opoint_notifications')
                    .insert(newNotifications);

                if (insertError) return { error: insertError };
            }

            return { error: null };

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
    },

    async getClockLogs(employeeId, date = null) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: [], error: 'No tenant context set' };

        let query = client
            .from('opoint_clock_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('employee_id', employeeId);

        // Remove date filtering from here - it's done in the server
        query = query.order('clock_in', { ascending: false });

        const { data, error } = await query;
        return { data, error };
    },

    // --- PROFILE UPDATE REQUESTS ---
    async createProfileUpdateRequest(requestData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const insertData = {
            ...requestData,
            tenant_id: tenantId,
            requested_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await client
            .from('opoint_profile_update_requests')
            .insert(insertData)
            .select()
            .single();

        return { data, error };
    },

    async getProfileUpdateRequests(filters = {}) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: [], error: 'No tenant context set' };

        let query = client
            .from('opoint_profile_update_requests')
            .select('*')
            .eq('tenant_id', tenantId)
            ;

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.userId !== undefined) {
            if (filters.userId && filters.userId.trim()) {
                query = query.eq('user_id', filters.userId);
            } else {
                // If userId is empty, return empty array to prevent data leak
                return { data: [], error: null };
            }
        }

        query = query.order('requested_at', { ascending: false });

        const { data, error } = await query;
        return { data, error };
    },

    async updateProfileUpdateRequest(requestId, updates) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_profile_update_requests')
            .update(updates)
            .eq('id', requestId)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        return { data, error };
    },

    async approveProfileUpdateRequest(requestId, reviewerId, reviewNotes = null) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        // First get the request details
        const { data: request, error: fetchError } = await client
            .from('opoint_profile_update_requests')
            .select('*')
            .eq('id', requestId)
            // Temporarily remove tenant filter
            // .eq('tenant_id', tenantId)
            .single();

        if (fetchError) return { data: null, error: fetchError };

        // Update the request status
        const updateData = {
            status: 'Approved',
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
            review_notes: reviewNotes,
            updated_at: new Date().toISOString()
        };

        const { data: updatedRequest, error: updateError } = await client
            .from('opoint_profile_update_requests')
            .update(updateData)
            .eq('id', requestId)
            // Temporarily remove tenant filter
            // .eq('tenant_id', tenantId)
            .select()
            .single();

        if (updateError) return { data: null, error: updateError };

        // Apply the actual update to the user profile
        if (request.field_name === 'mobile_money_number') {
            const { error: userUpdateError } = await client
                .from('opoint_users')
                .update({ mobile_money_number: request.requested_value, updated_at: new Date().toISOString() })
                .eq('id', request.user_id)
                // Temporarily remove tenant filter
                // .eq('tenant_id', tenantId)
                ;

            if (userUpdateError) {
                console.error('Failed to update user profile:', userUpdateError);
                // Don't return error here as the request was approved, just log it
            }
        }

        return { data: updatedRequest, error: null };
    },

    async rejectProfileUpdateRequest(requestId, reviewerId, reviewNotes = null) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const updateData = {
            status: 'Rejected',
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
            review_notes: reviewNotes,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await client
            .from('opoint_profile_update_requests')
            .update(updateData)
            .eq('id', requestId)
            // Temporarily remove tenant filter
            // .eq('tenant_id', tenantId)
            .select()
            .single();

        return { data, error };
    },

    async getProfileUpdateRequestById(requestId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const { data, error } = await client
            .from('opoint_profile_update_requests')
            .select('*')
            .eq('id', requestId)
            .eq('tenant_id', tenantId)
            .single();

        return { data, error };
    },

    async cancelProfileUpdateRequest(requestId, userId, tenantIdOverride = null) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };

        const tenantId = tenantIdOverride || getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context set' };

        const updateData = {
            status: 'Cancelled',
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            review_notes: 'Cancelled by user',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await client
            .from('opoint_profile_update_requests')
            .update(updateData)
            .eq('id', requestId)
            // Temporarily remove tenant filter
            // .eq('tenant_id', tenantId)
            .eq('user_id', userId) // Extra security check
            .select()
            .single();

        return { data, error };
    },

    // --- REPORT METHODS ---
    async getClockLogsForReport(tenantId, month, year) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: null }; // Return empty array if no database

        // Get start and end dates for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month

        const { data, error } = await client
            .from('opoint_clock_logs')
            .select('employee_id, employee_name, clock_in, clock_out')
            .eq('tenant_id', tenantId)
            .gte('clock_in', startDate.toISOString())
            .lte('clock_in', endDate.toISOString())
            .order('clock_in', { ascending: true });

        // If table doesn't exist or query fails, return empty array
        if (error) {
            console.log('Clock logs table may not exist or query failed:', error.message);
            return { data: [], error: null };
        }

        return { data: data || [], error };
    },

    async getAllLeaveBalances(tenantId) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: null }; // Return empty array if no database

        // Get all users with their leave balances
        const { data: users, error: usersError } = await client
            .from('opoint_users')
            .select('id, name')
            .eq('tenant_id', tenantId);

        if (usersError) {
            console.log('Users table query failed:', usersError.message);
            return { data: [], error: null };
        }

        if (!users || users.length === 0) {
            return { data: [], error: null };
        }

        // Get leave balances for each user
        const leaveBalances = [];
        for (const user of users) {
            const { data: balances, error: balanceError } = await client
                .from('opoint_leave_balances')
                .select('*')
                .eq('employee_id', user.id);

            if (!balanceError && balances && balances.length > 0) {
                balances.forEach(balance => {
                    leaveBalances.push({
                        employee_id: user.id,
                        employee_name: user.name,
                        leave_type: balance.leave_type,
                        total_days: balance.total_days,
                        used_days: balance.used_days,
                        remaining_days: balance.remaining_days
                    });
                });
            } else {
                // If no leave balances exist, add default values
                leaveBalances.push({
                    employee_id: user.id,
                    employee_name: user.name,
                    leave_type: 'annual',
                    total_days: 25, // Default annual leave
                    used_days: 0,
                    remaining_days: 25
                });
            }
        }

        return { data: leaveBalances, error: null };
    }
};

export default db;
