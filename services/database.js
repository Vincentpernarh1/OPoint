import { createClient } from '@supabase/supabase-js';
import { decrypt } from '../utils/encryption.js';

let supabase = null;
let supabaseAdmin = null;
let currentCompanyId = null;
let currentUserId = null;
let currentCompanyTable = null;
let currentCompanyName = null;
let currentCompanyAdminEmail = null;

// Create Supabase client with error handling
export function getSupabaseClient() {
    // Read environment variables inside the function to ensure dotenv has loaded
    const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
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

// Set company context for RLS (Row Level Security)
export async function setCompanyContext(companyId, userId) {
    const client = getSupabaseAdminClient(); // Use admin client to bypass RLS
    
    currentCompanyId = companyId;
    currentUserId = userId;
    
    // Also fetch company details to set table name
    console.log('Fetching company details for context ID:', companyId);
    const { data: company, error: fetchError } = await client
        .from('opoint_companies')
        .select('*')
        .eq('id', companyId)
        .single();

    if (fetchError || !company) {
        console.warn('⚠️  Could not fetch company details:', fetchError?.message);
    } else {
        currentCompanyTable = company.table_name || `company_${company.name.replace(/\s+/g, '_').toLowerCase()}_users`;
        currentCompanyName = company.name;
        currentCompanyAdminEmail = company.admin_email;
        console.log('✅ Company table set:', currentCompanyTable);
    }
    
    // Use regular client for RLS context
    const rlsClient = getSupabaseClient();
    try {
        const { error } = await rlsClient.rpc('set_company_context', {
            company_uuid: companyId,
            user_uuid: userId
        });
        
        if (error) {
            console.warn('⚠️  Could not set company context (RLS may not be enabled):', error.message);
            return false;
        }
        
        console.log('✅ Company context set:', companyId);
        return true;
    } catch (err) {
        console.warn('⚠️  Company context function not available:', err.message);
        return false;
    }
}

// Get current company context
export function getCurrentCompanyId() {
    return currentCompanyId;
}

// Get dynamic table name for company-specific tables
export function getTableName(tableType) {
    if (!currentCompanyName) return `P360-Opoint_${tableType.charAt(0).toUpperCase() + tableType.slice(1)}`;
    return `company_${currentCompanyName.replace(/\s+/g, '_').toLowerCase()}_${tableType}`;
}

// Set company context by decrypting encrypted company ID
export async function setCompanyContextByEncryptedId(encryptedId, userId = null) {
    try {
        console.log('Decrypting:', encryptedId);
        const companyId = decrypt(encryptedId);
        console.log('Decrypted company ID:', companyId);
        if (!companyId) {
            console.error('Failed to decrypt company ID');
            return false;
        }
        return await setCompanyContextById(companyId, userId);
    } catch (err) {
        console.error('Error decrypting company ID:', err);
        return false;
    }
}

// Set company context by company ID, fetching details
export async function setCompanyContextById(companyId, userId = null) {
    const client = getSupabaseClient();
    if (!client) return false;

    console.log('Fetching company details for ID:', companyId);
    // Fetch company details
    const { data: company, error } = await client
        .from('opoint_companies')
        .select('*')
        .eq('id', companyId)
        .single();

    console.log('Company fetch result:', { company, error });
    if (error || !company) {
        console.error('Company not found:', error);
        return false;
    }

    currentCompanyId = companyId;
    currentUserId = userId;
    currentCompanyTable = company.table_name || `company_${company.name.replace(/\s+/g, '_').toLowerCase()}_users`; // Company-specific table
    currentCompanyName = company.name;
    currentCompanyAdminEmail = company.admin_email;

    console.log('✅ Company context set:', currentCompanyName, currentCompanyTable);
    return true;
}

export function getCurrentCompanyTable() {
    return currentCompanyTable;
}

export function getCurrentCompanyName() {
    return currentCompanyName;
}

export function getCurrentCompanyAdminEmail() {
    return currentCompanyAdminEmail;
}


// Database Helper Functions
export const db = {
    // --- USERS / EMPLOYEES ---
    async getUsers() {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };
        
        const table = getTableName('user');
        const { data, error } = await client
            .from(table)
            .select('*')
            .order('created_at', { ascending: false });
        
        return { data, error };
    },

    async getUserById(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const table = getTableName('user');
        const { data, error } = await client
            .from(table)
            .select('*')
            .eq('id', userId)
            .single();
        
        return { data, error };
    },

    async createUser(userData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const table = getTableName('user');
        const { data, error } = await client
            .from(table)
            .insert([userData])
            .select()
            .single();
        
        return { data, error };
    },

    async updateUser(userId, updates) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const table = getTableName('user');
        const { data, error } = await client
            .from(table)
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        
        return { data, error };
    },

    async deleteUser(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const table = getTableName('user');
        const { data, error } = await client
            .from(table)
            .delete()
            .eq('id', userId);
        
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
        
        const { data, error } = await client
            .from(getTableName('payrollhistory'))
            .insert([payrollData])
            .select()
            .single();
        
        return { data, error };
    },

    async getPayrollHistory(filters = {}) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };
        
        let query = client
            .from(getTableName('payrollhistory'))
            .select(`*, ${getTableName('user')}(name, email, mobile_money_number)`);

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
        
        const { data, error } = await client
            .from('P360-Opoint_PayrollHistory')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('transaction_id', transactionId)
            .select()
            .single();
        
        return { data, error };
    },

    // --- LEAVE MANAGEMENT ---
    async createLeaveRequest(leaveData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Database not configured' };
        
        const { data, error } = await client
            .from(getTableName('leaverequest'))
            .insert([leaveData])
            .select()
            .single();
        
        return { data, error };
    },

    async getLeaveRequests(filters = {}) {
        const client = getSupabaseClient();
        if (!client) return { data: [], error: 'Database not configured' };
        
        let query = client
            .from(getTableName('leaverequest'))
            .select(`*, ${getTableName('user')}(name, email)`);

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
        
        const { data, error } = await client
            .from(getTableName('leaverequest'))
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', leaveId)
            .select()
            .single();
        
        return { data, error };
    },

    // --- AUTHENTICATION ---
    async getUserByEmail(email, tableName = null) {
        const client = getSupabaseAdminClient(); // Use admin client to bypass RLS
        if (!client) return { data: null, error: 'Database not configured' };
        
        let table = tableName || getCurrentCompanyTable();
        
        // If no specific table and no company context, search across all company tables
        if (!table || table === 'P360-Opoint_User') {
            // Get all companies
            const { data: companies, error: companiesError } = await client
                .from('opoint_companies')
                .select('table_name')
                .not('table_name', 'is', null);
                
            if (companiesError) {
                return { data: null, error: 'Failed to fetch companies' };
            }
            
            // Try each company table
            for (const company of companies) {
                if (company.table_name) {
                    const { data: user, error } = await client
                        .from(company.table_name)
                        .select('*')
                        .ilike('email', email)
                        .eq('is_active', true)
                        .single();
                    
                    if (user && !error) {
                        // Set the company context for this user
                        const { data: companyData } = await client
                            .from('opoint_companies')
                            .select('*')
                            .eq('table_name', company.table_name)
                            .single();
                        
                        if (companyData) {
                            currentCompanyId = companyData.id;
                            currentCompanyTable = companyData.table_name;
                            currentCompanyName = companyData.name;
                            currentCompanyAdminEmail = companyData.admin_email;
                        }
                        
                        return { data: user, error: null };
                    }
                }
            }
            
            return { data: null, error: 'User not found' };
        }
        
        if (!table) return { data: null, error: 'No table specified' };
        
        const { data, error } = await client
            .from(table)
            .select('*')
            .ilike('email', email)  // Case-insensitive email match
            .eq('is_active', true)
            .single();
        
        return { data, error };
    },

    async updateUserPassword(userId, passwordHash) {
        const client = getSupabaseAdminClient(); // Use admin client to bypass RLS
        if (!client) return { data: null, error: 'Database not configured' };
        
        const table = getCurrentCompanyTable() || 'P360-Opoint_User';
        const { data, error } = await client
            .from(table)
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
        
        const table = getCurrentCompanyTable() || 'P360-Opoint_User';
        const { data, error } = await client
            .from(table)
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
    }
};

export default db;
