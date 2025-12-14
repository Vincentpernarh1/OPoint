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
    private readonly DB_VERSION = 1;

    async init() {
        if (this.db) return this.db;

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
            },
        });

        return this.db;
    }

    // ===== TIME PUNCHES =====
    async saveTimePunch(punch: OfflineDB['timePunches']['value']) {
        const db = await this.init();
        await db.add('timePunches', punch);
        console.log('💾 Time punch saved offline:', punch.id);
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

    async deleteTimePunch(id: string) {
        const db = await this.init();
        await db.delete('timePunches', id);
    }

    // ===== LEAVE REQUESTS =====
    async saveLeaveRequest(request: OfflineDB['leaveRequests']['value']) {
        const db = await this.init();
        await db.add('leaveRequests', request);
        console.log('💾 Leave request saved offline:', request.id);
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

    // ===== EXPENSES =====
    async saveExpense(expense: OfflineDB['expenses']['value']) {
        const db = await this.init();
        await db.add('expenses', expense);
        console.log('💾 Expense saved offline:', expense.id);
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
        console.log('🔄 Starting offline sync for company:', companyId);
        
        const punches = await this.getUnsyncedTimePunches(companyId);
        const leaves = await this.getUnsyncedLeaveRequests(companyId);
        const expenses = await this.getUnsyncedExpenses(companyId);

        // Sync time punches
        for (const punch of punches) {
            try {
                await syncFunction({ type: 'timePunch', data: punch });
                await this.markTimePunchSynced(punch.id);
            } catch (error) {
                console.error('Failed to sync time punch:', punch.id, error);
            }
        }

        // Sync leave requests
        for (const leave of leaves) {
            try {
                await syncFunction({ type: 'leaveRequest', data: leave });
                await this.markLeaveRequestSynced(leave.id);
            } catch (error) {
                console.error('Failed to sync leave request:', leave.id, error);
            }
        }

        // Sync expenses
        for (const expense of expenses) {
            try {
                await syncFunction({ type: 'expense', data: expense });
                await this.markExpenseSynced(expense.id);
            } catch (error) {
                console.error('Failed to sync expense:', expense.id, error);
            }
        }

        console.log('✅ Offline sync completed');
        return await this.getUnsyncedCount(companyId);
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
