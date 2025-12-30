// =====================================================
// Enhanced Offline Storage Service using IndexedDB
// =====================================================
// Handles offline data storage for time punches, 
// leave requests, expenses, and READ-HEAVY caching
// =====================================================

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB {
    timePunches: {
        key: string;
        value: {
            id: string;
            userId: string;
            companyId: string;
            type: 'clock_in' | 'clock_out';
            timestamp: string;
            location?: string;
            photoUrl?: string;
            synced: boolean;
            createdAt: string;
        };
        indexes: {
            'by-synced': boolean;
            'by-user': string;
            'by-company': string;
        };
    };
    syncQueue: {
        key: string;
        value: {
            id: string;
            method: string;
            url: string;
            body?: any;
            headers?: Record<string,string>;
            tenantId?: string;
            retries?: number;
            status?: 'pending' | 'done' | 'failed';
            createdAt?: string;
        };
        indexes: {
            'by-status': string;
            'by-tenant': string;
        };
    };
    leaveRequests: {
        key: string;
        value: {
            id: string;
            userId: string;
            companyId: string;
            leaveType: string;
            startDate: string;
            endDate: string;
            reason: string;
            status: string;
            synced: boolean;
            createdAt: string;
            employeeName?: string;
        };
        indexes: {
            'by-synced': boolean;
            'by-user': string;
            'by-company': string;
        };
    };
    expenses: {
        key: string;
        value: {
            id: string;
            userId: string;
            companyId: string;
            amount: number;
            category?: string;
            description: string;
            date: string;
            receiptUrl?: string;
            synced: boolean;
            createdAt: string;
            employee_id?: string;
            employee_name?: string;
            expense_date?: string;
            status?: string;
        };
        indexes: {
            'by-synced': boolean;
            'by-user': string;
            'by-company': string;
        };
    };
    // NEW: Cache stores for read-heavy data
    announcements: {
        key: string;
        value: {
            id: string;
            tenant_id: string;
            title: string;
            content: string;
            author_id: string;
            author_name?: string;
            image_url?: string;
            created_at: string;
            updated_at: string;
            readBy?: string[];
            cachedAt: string;
        };
        indexes: {
            'by-tenant': string;
            'by-cached': string;
        };
    };
    users: {
        key: string;
        value: {
            id: string;
            tenantId: string;
            name: string;
            email: string;
            role: string;
            team: string;
            basicSalary: number;
            hireDate: string;
            avatarUrl?: string;
            mobileMoneyNumber?: string;
            cachedAt: string;
        };
        indexes: {
            'by-tenant': string;
        };
    };
    payslips: {
        key: string; // userId_date
        value: {
            id: string;
            userId: string;
            tenantId: string;
            payDate: string;
            basicSalary: number;
            grossPay: number;
            netPay: number;
            ssnitEmployee: number;
            paye: number;
            totalDeductions: number;
            otherDeductions: any[];
            cachedAt: string;
        };
        indexes: {
            'by-user': string;
            'by-tenant': string;
        };
    };
    cachedData: {
        key: string; // Type identifier
        value: {
            type: string;
            tenantId: string;
            data: any;
            cachedAt: string;
        };
        indexes: {
            'by-type': string;
            'by-tenant': string;
        };
    };
}

class OfflineStorageService {
    private db: IDBPDatabase<OfflineDB> | null = null;
    private readonly DB_NAME = 'vpena-onpoint-offline';
    private readonly DB_VERSION = 3; // Increment version for new stores
    private isOnline: boolean = navigator.onLine;
    private readonly CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

    async init() {
        if (this.db) return this.db;

        // Set up online/offline listeners
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Online - ready to sync');
            // Kick off queue processing when connection returns
            try {
                // fire and forget
                void this.processQueue();
            } catch (err) {
                console.error('Error starting queue processing:', err);
            }
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Offline - data will be stored locally');
        });

        this.db = await openDB<OfflineDB>(this.DB_NAME, this.DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                // Time Punches Store
                if (!db.objectStoreNames.contains('timePunches')) {
                    const timePunchStore = db.createObjectStore('timePunches', { keyPath: 'id' });
                    timePunchStore.createIndex('by-synced', 'synced');
                    timePunchStore.createIndex('by-user', 'userId');
                    timePunchStore.createIndex('by-company', 'companyId');
                }

                // Leave Requests Store
                if (!db.objectStoreNames.contains('leaveRequests')) {
                    const leaveStore = db.createObjectStore('leaveRequests', { keyPath: 'id' });
                    leaveStore.createIndex('by-synced', 'synced');
                    leaveStore.createIndex('by-user', 'userId');
                    leaveStore.createIndex('by-company', 'companyId');
                }

                // Expenses Store
                if (!db.objectStoreNames.contains('expenses')) {
                    const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
                    expenseStore.createIndex('by-synced', 'synced');
                    expenseStore.createIndex('by-user', 'userId');
                    expenseStore.createIndex('by-company', 'companyId');
                }

                // Sync Queue Store
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    queueStore.createIndex('by-status', 'status');
                    queueStore.createIndex('by-tenant', 'tenantId');
                }

                // NEW STORES FOR CACHING
                if (!db.objectStoreNames.contains('announcements')) {
                    const announcementStore = db.createObjectStore('announcements', { keyPath: 'id' });
                    announcementStore.createIndex('by-tenant', 'tenant_id');
                    announcementStore.createIndex('by-cached', 'cachedAt');
                }

                if (!db.objectStoreNames.contains('users')) {
                    const usersStore = db.createObjectStore('users', { keyPath: 'id' });
                    usersStore.createIndex('by-tenant', 'tenantId');
                }

                if (!db.objectStoreNames.contains('payslips')) {
                    const payslipsStore = db.createObjectStore('payslips', { keyPath: 'id' });
                    payslipsStore.createIndex('by-user', 'userId');
                    payslipsStore.createIndex('by-tenant', 'tenantId');
                }

                if (!db.objectStoreNames.contains('cachedData')) {
                    const cachedStore = db.createObjectStore('cachedData', { keyPath: 'type' });
                    cachedStore.createIndex('by-type', 'type');
                    cachedStore.createIndex('by-tenant', 'tenantId');
                }
            },
        });

        // If we're already online when initializing, kick off queue processing
        if (this.isOnline) {
            try {
                void this.processQueue();
            } catch (err) {
                console.error('Error starting initial queue processing:', err);
            }
        }

        return this.db;
    }

    // ===== TIME PUNCHES =====
    async saveTimePunch(punch: OfflineDB['timePunches']['value']) {
        const db = await this.init();
        await db.put('timePunches', punch); // Use put to allow updates
        console.log('💾 Time punch saved:', punch.id, 'synced:', punch.synced);
    }

    // ===== SYNC QUEUE =====
    async enqueueRequest(entry: { id: string; method: string; url: string; body?: any; headers?: Record<string, string>; tenantId?: string; retries?: number; status?: 'pending' | 'done' | 'failed'; createdAt?: string; }) {
        const db = await this.init();
        const now = new Date().toISOString();
        const item = {
            retries: 0,
            status: 'pending' as const,
            createdAt: now,
            ...entry,
        };
        await db.put('syncQueue', item);
        console.log('🧾 Enqueued request for sync:', item.id, item.method, item.url);
    }

    async getQueuedRequests(tenantId?: string) {
        const db = await this.init();
        // If syncQueue store doesn't exist (older DB), return empty list instead of throwing
        if (!db.objectStoreNames.contains('syncQueue')) return [];
        const all = await db.getAll('syncQueue');
        return all.filter((q: any) => q.status !== 'done' && (!tenantId || q.tenantId === tenantId));
    }

    async markQueuedRequestDone(id: string) {
        const db = await this.init();
        const req = await db.get('syncQueue', id);
        if (req) {
            req.status = 'done';
            await db.put('syncQueue', req);
            console.log('✅ Queue request marked done:', id);
        }
    }

    async incrementQueuedRequestRetries(id: string) {
        const db = await this.init();
        const req = await db.get('syncQueue', id);
        if (req) {
            req.retries = (req.retries || 0) + 1;
            await db.put('syncQueue', req);
        }
    }

    async processQueue(processFn?: (entry: any) => Promise<Response>) {
        if (!this.isOnline) {
            console.log('📴 Offline - will not process queue');
            return;
        }

        const queue = await this.getQueuedRequests();
        if (!queue.length) return;

        console.log('🔁 Processing sync queue, items:', queue.length);

        for (const entry of queue) {
            try {
                let resp: Response;
                if (processFn) {
                    resp = await processFn(entry);
                } else {
                    const fetchOpts: RequestInit = { 
                        method: entry.method, 
                        headers: entry.headers || { 'Content-Type': 'application/json' },
                        credentials: 'include' // Include cookies for authentication
                    };
                    if (entry.body) fetchOpts.body = JSON.stringify(entry.body);
                    
                    console.log('🔄 Processing queue entry:', entry.id);
                    console.log('   URL:', entry.url);
                    console.log('   Method:', entry.method);
                    console.log('   Headers:', entry.headers);
                    console.log('   Body:', entry.body);
                    
                    resp = await fetch(entry.url, fetchOpts);
                }

                if (resp && resp.ok) {
                    await this.markQueuedRequestDone(entry.id);
                    try {
                        // If this queued request was a profile update approval, dispatch an event
                        if (entry.url && typeof entry.url === 'string' && entry.url.includes('/api/profile-update-requests')) {
                            const detail = {
                                userId: entry.body?.user_id || entry.body?.userId || entry.tenantId,
                                field: entry.body?.field_name || entry.body?.field || 'unknown',
                                value: entry.body?.requested_value || entry.body?.value
                            };
                            try {
                                window.dispatchEvent(new CustomEvent('employee-updated', { detail }));
                            } catch (evErr) {
                                console.warn('Could not dispatch employee-updated from offline queue', evErr);
                            }
                        }
                    } catch (dispatchErr) {
                        console.warn('Error while handling queued request post-success dispatch:', dispatchErr);
                    }
                } else {
                    // Log the error response
                    let shouldDiscard = false;
                    try {
                        const errorData = await resp.clone().json();
                        console.error('❌ Queue entry failed:', entry.id, resp.status);
                        console.error('   Server error:', errorData);
                        
                        // Check if this is a validation error that won't be fixed by retrying
                        if (resp.status === 400 && errorData.error) {
                            const validationErrors = [
                                'Invalid Ghana phone number format',
                                'Tenant ID and User ID required',
                                'User not found',
                                'Invalid',
                                'required'
                            ];
                            if (validationErrors.some(msg => errorData.error.includes(msg))) {
                                shouldDiscard = true;
                                console.warn('🗑️ Discarding queue entry with validation error:', entry.id);
                            }
                        }
                        
                        // Also discard if too many retries
                        if ((entry.retries || 0) >= 5) {
                            shouldDiscard = true;
                            console.warn('🗑️ Discarding queue entry after max retries:', entry.id);
                        }
                    } catch (e) {
                        console.error('❌ Queue entry failed:', entry.id, resp.status, '(could not parse error)');
                        // Discard after max retries even if we can't parse the error
                        if ((entry.retries || 0) >= 5) {
                            shouldDiscard = true;
                        }
                    }
                    
                    if (shouldDiscard) {
                        await this.markQueuedRequestDone(entry.id);
                    } else {
                        await this.incrementQueuedRequestRetries(entry.id);
                        console.warn('Queue entry failed, will retry later:', entry.id, resp && resp.status);
                    }
                }
            } catch (error) {
                await this.incrementQueuedRequestRetries(entry.id);
                console.error('Error processing queue entry:', entry.id, error);
            }
        }
    }

    async getUnsyncedTimePunches(companyId: string) {
        const db = await this.init();
        const allPunches = await db.getAllFromIndex('timePunches', 'by-company', companyId);
        return allPunches.filter(p => !p.synced);
    }

    async markTimePunchSynced(id: string) {
        const db = await this.init();
        const punch = await db.get('timePunches', id);
        if (punch) {
            punch.synced = true;
            await db.put('timePunches', punch);
            console.log('✅ Time punch marked as synced:', id);
        }
    }

    async getTimePunches(companyId: string, userId: string) {
        const db = await this.init();
        const allPunches = await db.getAllFromIndex('timePunches', 'by-company', companyId);
        return allPunches.filter(p => p.userId === userId);
    }

    async deleteTimePunch(id: string) {
        const db = await this.init();
        await db.delete('timePunches', id);
    }

    async clearTimePunches(companyId: string, userId: string) {
        const db = await this.init();
        const allPunches = await db.getAllFromIndex('timePunches', 'by-company', companyId);
        const userPunches = allPunches.filter(p => p.userId === userId);
        
        for (const punch of userPunches) {
            await db.delete('timePunches', punch.id);
        }
        
        console.log(`🗑️ Cleared ${userPunches.length} time punches for user ${userId} in company ${companyId}`);
    }

    // ===== LEAVE REQUESTS =====
    async saveLeaveRequest(request: OfflineDB['leaveRequests']['value']) {
        const db = await this.init();
        await db.put('leaveRequests', request);
        console.log('💾 Leave request saved (local):', request.id, 'synced:', request.synced);
        if (this.isOnline) {
            // attempt to process queue (enqueue will be used by API layer)
            try { void this.processQueue(); } catch (err) { console.error(err); }
        }
    }

    async getUnsyncedLeaveRequests(companyId: string) {
        const db = await this.init();
        const allRequests = await db.getAllFromIndex('leaveRequests', 'by-company', companyId);
        return allRequests.filter(r => !r.synced);
    }

    async getLeaveRequestsByUser(companyId: string, userId: string) {
        const db = await this.init();
        const allRequests = await db.getAllFromIndex('leaveRequests', 'by-company', companyId);
        return allRequests.filter(r => r.userId === userId);
    }

    async markLeaveRequestSynced(id: string) {
        const db = await this.init();
        const request = await db.get('leaveRequests', id);
        if (request) {
            request.synced = true;
            await db.put('leaveRequests', request);
            console.log('✅ Leave request marked as synced:', id);
        }
    }

    async deleteLeaveRequest(id: string) {
        const db = await this.init();
        await db.delete('leaveRequests', id);
    }

    // ===== EXPENSES =====
    async saveExpense(expense: OfflineDB['expenses']['value']) {
        const db = await this.init();
        await db.put('expenses', expense);
        console.log('💾 Expense saved (local):', expense.id, 'synced:', expense.synced);
        if (this.isOnline) {
            try { void this.processQueue(); } catch (err) { console.error(err); }
        }
    }

    async getUnsyncedExpenses(companyId: string) {
        const db = await this.init();
        const allExpenses = await db.getAllFromIndex('expenses', 'by-company', companyId);
        return allExpenses.filter(e => !e.synced);
    }

    async getExpensesByUser(companyId: string, userId: string) {
        const db = await this.init();
        const allExpenses = await db.getAllFromIndex('expenses', 'by-company', companyId);
        return allExpenses.filter(e => e.userId === userId || e.employee_id === userId);
    }

    async markExpenseSynced(id: string) {
        const db = await this.init();
        const expense = await db.get('expenses', id);
        if (expense) {
            expense.synced = true;
            await db.put('expenses', expense);
            console.log('✅ Expense marked as synced:', id);
        }
    }

    async deleteExpense(id: string) {
        const db = await this.init();
        await db.delete('expenses', id);
    }

    // ===== ANNOUNCEMENTS CACHE =====
    async cacheAnnouncements(announcements: any[], tenantId: string) {
        const db = await this.init();
        const cachedAt = new Date().toISOString();
        
        for (const announcement of announcements) {
            await db.put('announcements', {
                ...announcement,
                cachedAt
            });
        }
        // console.log(`💾 Cached ${announcements.length} announcements for tenant ${tenantId}`);
    }

    async getCachedAnnouncements(tenantId: string): Promise<any[]> {
        const db = await this.init();
        if (!db.objectStoreNames.contains('announcements')) return [];
        
        const all = await db.getAllFromIndex('announcements', 'by-tenant', tenantId);
        // Filter out stale cache (older than CACHE_MAX_AGE)
        const now = Date.now();
        return all.filter(ann => {
            const cacheAge = now - new Date(ann.cachedAt).getTime();
            return cacheAge < this.CACHE_MAX_AGE;
        });
    }

    // ===== USERS CACHE =====
    async cacheUsers(users: any[], tenantId: string) {
        const db = await this.init();
        const cachedAt = new Date().toISOString();
        
        for (const user of users) {
            await db.put('users', {
                id: user.id,
                tenantId: user.tenantId || tenantId,
                name: user.name,
                email: user.email,
                role: user.role,
                team: user.team || '',
                basicSalary: user.basicSalary || user.basic_salary || 0,
                hireDate: user.hireDate || user.hire_date || new Date().toISOString(),
                avatarUrl: user.avatarUrl || user.avatar_url,
                mobileMoneyNumber: user.mobileMoneyNumber || user.mobile_money_number,
                cachedAt
            });
        }
    }

    async getCachedUsers(tenantId: string): Promise<any[]> {
        const db = await this.init();
        if (!db.objectStoreNames.contains('users')) return [];
        
        const all = await db.getAllFromIndex('users', 'by-tenant', tenantId);
        return all;
    }

    // ===== PAYSLIPS CACHE =====
    async cachePayslip(payslip: any, userId: string, tenantId: string) {
        const db = await this.init();
        const cachedAt = new Date().toISOString();
        
        // Normalize the date to ISO string (date only, no time) for consistent ID
        let dateStr: string;
        if (payslip.payDate instanceof Date) {
            dateStr = payslip.payDate.toISOString();
        } else if (typeof payslip.payDate === 'string') {
            dateStr = payslip.payDate;
        } else {
            dateStr = new Date().toISOString();
        }
        
        // Use date only (not full timestamp) for consistent ID
        const dateOnly = dateStr.split('T')[0];
        const id = `${userId}_${dateOnly}`;
        
        await db.put('payslips', {
            id,
            userId,
            tenantId,
            payDate: dateStr,
            basicSalary: payslip.basicSalary || 0,
            grossPay: payslip.grossPay || 0,
            netPay: payslip.netPay || 0,
            ssnitEmployee: payslip.ssnitEmployee || 0,
            paye: payslip.paye || 0,
            totalDeductions: payslip.totalDeductions || 0,
            otherDeductions: payslip.otherDeductions || [],
            cachedAt
        });
    }

    async getCachedPayslips(userId: string, tenantId: string): Promise<any[]> {
        const db = await this.init();
        if (!db.objectStoreNames.contains('payslips')) return [];
        
        const all = await db.getAllFromIndex('payslips', 'by-user', userId);
        return all.filter(p => p.tenantId === tenantId);
    }

    async getCachedPayslip(userId: string, payDate: string, tenantId: string): Promise<any | null> {
        const db = await this.init();
        if (!db.objectStoreNames.contains('payslips')) return null;
        
        // Normalize date to date-only format for consistent lookup
        const dateOnly = payDate.split('T')[0];
        const id = `${userId}_${dateOnly}`;
        const payslip = await db.get('payslips', id);
        
        if (!payslip || payslip.tenantId !== tenantId) return null;
        
        // Check if cache is stale (24 hours)
        const cacheAge = Date.now() - new Date(payslip.cachedAt).getTime();
        if (cacheAge > this.CACHE_MAX_AGE) return null;
        
        return payslip;
    }

    async clearOldPayslips(userId: string, tenantId: string) {
        const db = await this.init();
        if (!db.objectStoreNames.contains('payslips')) return;
        
        const all = await db.getAllFromIndex('payslips', 'by-user', userId);
        const userPayslips = all.filter(p => p.tenantId === tenantId);
        
        // Delete all old payslips for this user
        for (const payslip of userPayslips) {
            await db.delete('payslips', payslip.id);
        }
        console.log(`🗑️ Cleared ${userPayslips.length} old payslips for user ${userId}`);
    }

    // ===== GENERIC CACHE =====
    async cacheData(type: string, data: any, tenantId: string, userId?: string) {
        const db = await this.init();
        const cachedAt = new Date().toISOString();
        const key = userId ? `${type}_${userId}` : type;
        
        await db.put('cachedData', {
            type: key,
            tenantId,
            data,
            cachedAt
        });
    }

    async getCachedData(type: string, tenantId: string, userId?: string): Promise<any | null> {
        const db = await this.init();
        if (!db.objectStoreNames.contains('cachedData')) return null;
        
        const key = userId ? `${type}_${userId}` : type;
        const cached = await db.get('cachedData', key);
        if (!cached || cached.tenantId !== tenantId) return null;
        
        // Check if cache is stale
        const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
        if (cacheAge > this.CACHE_MAX_AGE) return null;
        
        return cached.data;
    }

    // ===== SYNC STATUS =====
    async getUnsyncedCount(companyId: string) {
        const db = await this.init();
        const punches = await this.getUnsyncedTimePunches(companyId);
        const leaves = await this.getUnsyncedLeaveRequests(companyId);
        const expenses = await this.getUnsyncedExpenses(companyId);
        
        return {
            timePunches: punches.length,
            leaveRequests: leaves.length,
            expenses: expenses.length,
            total: punches.length + leaves.length + expenses.length
        };
    }

    // ===== SYNC ALL =====
    async syncAll(companyId: string, syncFunction: (data: any) => Promise<void>) {
        if (!this.isOnline) {
            console.log('📴 Offline - skipping sync');
            return await this.getUnsyncedCount(companyId);
        }

        console.log('🔄 Starting sync for company:', companyId);
        
        const punches = await this.getUnsyncedTimePunches(companyId);
        const leaves = await this.getUnsyncedLeaveRequests(companyId);
        const expenses = await this.getUnsyncedExpenses(companyId);

        // Sync time punches
        for (const punch of punches) {
            try {
                await syncFunction({ type: 'timePunch', data: punch });
                await this.deleteTimePunch(punch.id); // Delete after sync
            } catch (error) {
                console.error('Failed to sync time punch:', punch.id, error);
            }
        }

        // Sync leave requests
        for (const leave of leaves) {
            try {
                await syncFunction({ type: 'leaveRequest', data: leave });
                await this.deleteLeaveRequest(leave.id); // Delete after sync
            } catch (error) {
                console.error('Failed to sync leave request:', leave.id, error);
            }
        }

        // Sync expenses
        for (const expense of expenses) {
            try {
                await syncFunction({ type: 'expense', data: expense });
                await this.deleteExpense(expense.id); // Delete after sync
            } catch (error) {
                console.error('Failed to sync expense:', expense.id, error);
            }
        }

        console.log('✅ Sync completed - local data cleared');
        return await this.getUnsyncedCount(companyId);
    }

    // ===== UTILITIES =====
    isOnlineStatus() {
        return this.isOnline;
    }

    async forceSync(companyId: string, syncFunction: (data: any) => Promise<void>) {
        // Force sync regardless of online status (for manual sync)
        console.log('🔄 Force syncing for company:', companyId);
        return await this.syncAll(companyId, syncFunction);
    }

    // ===== CLEAR DATA =====
    async clearCompanyData(companyId: string) {
        const db = await this.init();
        
        // Clear time punches
        const punches = await db.getAllFromIndex('timePunches', 'by-company', companyId);
        for (const punch of punches) {
            await db.delete('timePunches', punch.id);
        }

        // Clear leave requests
        const leaves = await db.getAllFromIndex('leaveRequests', 'by-company', companyId);
        for (const leave of leaves) {
            await db.delete('leaveRequests', leave.id);
        }

        // Clear expenses
        const expenses = await db.getAllFromIndex('expenses', 'by-company', companyId);
        for (const expense of expenses) {
            await db.delete('expenses', expense.id);
        }

        console.log('🗑️ Cleared offline data for company:', companyId);
    }

    async clearAllCache() {
        const db = await this.init();
        
        if (db.objectStoreNames.contains('announcements')) {
            const announcements = await db.getAll('announcements');
            for (const ann of announcements) {
                await db.delete('announcements', ann.id);
            }
        }

        if (db.objectStoreNames.contains('users')) {
            const users = await db.getAll('users');
            for (const user of users) {
                await db.delete('users', user.id);
            }
        }

        if (db.objectStoreNames.contains('payslips')) {
            const payslips = await db.getAll('payslips');
            for (const payslip of payslips) {
                await db.delete('payslips', payslip.id);
            }
        }

        if (db.objectStoreNames.contains('cachedData')) {
            const cached = await db.getAll('cachedData');
            for (const item of cached) {
                await db.delete('cachedData', item.type);
            }
        }

        console.log('🗑️ Cleared all cached data');
    }
}

export const offlineStorage = new OfflineStorageService();
