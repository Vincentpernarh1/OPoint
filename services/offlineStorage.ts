// =====================================================
// Offline Storage Service using IndexedDB
// =====================================================
// Handles offline data storage for time punches, 
// leave requests, and other offline-first features
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
            category: string;
            description: string;
            date: string;
            receiptUrl?: string;
            synced: boolean;
            createdAt: string;
        };
        indexes: {
            'by-synced': boolean;
            'by-user': string;
            'by-company': string;
        };
    };
}

class OfflineStorageService {
    private db: IDBPDatabase<OfflineDB> | null = null;
    private readonly DB_NAME = 'vpena-onpoint-offline';
    private readonly DB_VERSION = 2;
    private isOnline: boolean = navigator.onLine;

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
            upgrade(db) {
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
                // Sync Queue Store - stores requests to replay when online
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    queueStore.createIndex('by-status', 'status');
                    queueStore.createIndex('by-tenant', 'tenantId');
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
                    const fetchOpts: RequestInit = { method: entry.method, headers: entry.headers || { 'Content-Type': 'application/json' } };
                    if (entry.body) fetchOpts.body = JSON.stringify(entry.body);
                    resp = await fetch(entry.url, fetchOpts);
                }

                if (resp && resp.ok) {
                    await this.markQueuedRequestDone(entry.id);
                } else {
                    await this.incrementQueuedRequestRetries(entry.id);
                    console.warn('Queue entry failed, will retry later:', entry.id, resp && resp.status);
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
}

export const offlineStorage = new OfflineStorageService();
