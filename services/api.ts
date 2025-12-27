import type { Company, NewCompanyData, User, Announcement } from '../types';
import { UserRole } from '../types';
import { offlineStorage } from './offlineStorage';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

// Helper to send a request or enqueue it when offline / on network failure
const sendOrQueue = async (method: string, url: string, tenantId?: string, body?: any) => {
  const headers = getHeaders(tenantId);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

  if (!navigator.onLine) {
    await offlineStorage.enqueueRequest({ id, method, url, body, headers, tenantId });
    return { _queued: true, _queueId: id, ...(body || {}) };
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Include cookies in requests
    });
    if (!response.ok) throw new Error('Network response not ok');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'API error');
    return result.data;
  } catch (error) {
    // On error, enqueue for later retry and return queued indicator
    await offlineStorage.enqueueRequest({ id, method, url, body, headers, tenantId });
    // If we're online now, attempt to process the queue immediately
    if (navigator.onLine) {
      try {
        await offlineStorage.processQueue();
      } catch (err) {
        console.warn('processQueue immediate attempt failed:', err);
      }
    }
    return { _queued: true, _queueId: id, _error: String(error), ...(body || {}) };
  }
};

// Helper function to get headers with tenant context
const getHeaders = (tenantId?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }
  return headers;
};

export const api = {
  createCompanyAndAdmin: async (data: NewCompanyData): Promise<{ company: Company; user: User }> => {
    // Mock API call
    const company: Company = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      encryptedId: Math.random().toString(36).substr(2, 9), // Generate encrypted ID
      licenseCount: data.licenseCount,
      workingHoursPerDay: 8,
      modules: data.modules,
    };
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.adminName,
      email: data.adminEmail,
      role: UserRole.ADMIN,
      avatarUrl: '',
      team: 'Admin',
      tenantId: company.id,
      basicSalary: 0,
      hireDate: new Date(),
    };
    return new Promise((resolve) => {
      setTimeout(() => resolve({ company, user }), 1000);
    });
  },

  createCompany: async (data: NewCompanyData): Promise<Company> => {
    // Mock API call - in real app, this would call an API
    const company: Company = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      encryptedId: Math.random().toString(36).substr(2, 9), // Generate encrypted ID
      licenseCount: data.licenseCount,
      workingHoursPerDay: 8,
      modules: data.modules,
    };
    // Simulate async
    return new Promise((resolve) => {
      setTimeout(() => resolve(company), 1000);
    });
  },

  getCompanies: async (): Promise<Company[]> => {
    // Mock
    return [];
  },

  // Announcements API
  getAnnouncements: async (tenantId: string, userId: string): Promise<Announcement[]> => {
    const response = await fetch(`${API_BASE}/api/announcements?userId=${userId}`, {
      headers: getHeaders(tenantId),
      cache: 'no-cache',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch announcements');
    }
    return result.data || [];
  },

  markAnnouncementsAsRead: async (tenantId: string, userId: string): Promise<void> => {
    await sendOrQueue('POST', `${API_BASE}/api/announcements/mark-read`, tenantId, { userId });
  },

  createAnnouncement: async (data: { title: string; content: string; imageUrl?: string; created_by: string; tenant_id: string; author_name: string }): Promise<Announcement> => {
    return await sendOrQueue('POST', `${API_BASE}/api/announcements`, data.tenant_id, {
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      author_id: data.created_by,
      author_name: data.author_name,
      tenant_id: data.tenant_id,
    });
  },

  updateAnnouncement: async (id: string, data: Partial<Announcement>, tenantId: string): Promise<Announcement> => {
    return await sendOrQueue('PUT', `${API_BASE}/api/announcements/${id}`, tenantId, data);
  },


  deleteAnnouncement: async (announcementId: string, tenantId: string): Promise<void> => {
    await sendOrQueue('DELETE', `${API_BASE}/api/announcements/${announcementId}`, tenantId);
  },

  // Notifications API
  getNotifications: async (tenantId: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/api/notifications`, {
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch notifications');
    }
    return result.data || [];
  },

  getUnreadNotificationCount: async (tenantId: string): Promise<number> => {
    const response = await fetch(`${API_BASE}/api/notifications/unread-count`, {
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch unread notification count');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch unread notification count');
    }
    return result.data || 0;
  },

  markNotificationAsRead: async (notificationId: string, tenantId: string): Promise<void> => {
    await sendOrQueue('PUT', `${API_BASE}/api/notifications/${notificationId}/read`, tenantId);
  },

  markAllNotificationsAsRead: async (tenantId: string, userId: string): Promise<void> => {
    await sendOrQueue('PUT', `${API_BASE}/api/notifications/mark-all-read`, tenantId, { userId });
  },

  sendNotification: async (message: string, roles: string[]): Promise<void> => {
    // Mock implementation - in real app this would call an API
    console.log('Sending notification:', message, 'to roles:', roles);
  },

  // Payroll API
  getPayableEmployees: async (tenantId: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/api/payroll/payable-employees`, {
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch payable employees');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch payable employees');
    }
    return result.data || [];
  },

  processPayroll: async (payload: any, password: string, tenantId: string): Promise<any> => {
    return await sendOrQueue('POST', `${API_BASE}/api/payroll/pay`, tenantId, { payments: payload, password });
  },

  // Payslips API
  getPayslip: async (userId: string, date: string, tenantId: string): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/payslips/${userId}/${encodeURIComponent(date)}`, {
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch payslip');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch payslip');
    }
    return result.data;
  },

  getPayslipHistory: async (userId: string, tenantId: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/api/payroll/history?userId=${userId}`, {
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch payslip history');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch payslip history');
    }
    return result.data || [];
  },

  // Users API
  getUsers: async (tenantId: string): Promise<User[]> => {
    const response = await fetch(`${API_BASE}/api/users`, {
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch users');
    }
    return result.data || [];
  },

  // Fetch single user by id
  getUser: async (tenantId: string, userId: string): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch user');
    }
    return result.data;
  },

  createUser: async (tenantId: string, userData: any): Promise<User> => {
    return await sendOrQueue('POST', `${API_BASE}/api/users`, tenantId, userData);
  },

  updateUser: async (tenantId: string, userId: string, userData: any): Promise<User> => {
    return await sendOrQueue('PUT', `${API_BASE}/api/users/${userId}`, tenantId, userData);
  },

  deleteUser: async (tenantId: string, userId: string): Promise<void> => {
    await sendOrQueue('DELETE', `${API_BASE}/api/users/${userId}`, tenantId);
  },

  // Leave Requests API
  getLeaveRequests: async (tenantId: string, filters?: { status?: string; userId?: string }): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userId) params.append('userId', filters.userId);

    const response = await fetch(`${API_BASE}/api/leave/requests?${params}`, {
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch leave requests');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch leave requests');
    }
    return result.data || [];
  },

  updateLeaveRequest: async (tenantId: string, leaveId: string, updates: any): Promise<any> => {
    return await sendOrQueue('PUT', `${API_BASE}/api/leave/requests/${leaveId}`, tenantId, updates);
  },

  createLeaveRequest: async (tenantId: string, leaveData: any): Promise<any> => {
    return await sendOrQueue('POST', `${API_BASE}/api/leave/requests`, tenantId, leaveData);
  },

  // Leave Balances API
  getLeaveBalances: async (tenantId: string, employeeId: string): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE}/api/leave/balances/${employeeId}`, {
        headers: getHeaders(tenantId),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch leave balances');
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leave balances');
      }
      return result.data || [];
    } catch (error) {
      console.warn('API call failed for leave balances:', error);
      return []; // Return empty array as fallback
    }
  },

  updateLeaveBalance: async (tenantId: string, employeeId: string, leaveType: string, usedDays: number): Promise<any> => {
    return await sendOrQueue('PUT', `${API_BASE}/api/leave/balances/${employeeId}`, tenantId, { leaveType, usedDays });
  },

  initializeLeaveBalance: async (tenantId: string, employeeId: string, leaveType: string, totalDays: number): Promise<any> => {
    return await sendOrQueue('POST', `${API_BASE}/api/leave/balances/${employeeId}/initialize`, tenantId, { leaveType, totalDays });
  },

  // Expense Claims API
  getExpenseClaims: async (tenantId: string, filters?: { status?: string; employee_id?: string }): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);

    const response = await fetch(`${API_BASE}/api/expenses?${params}`, {
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch expense claims');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch expense claims');
    }
    return result.data || [];
  },

  createExpenseClaim: async (tenantId: string, expenseData: any): Promise<any> => {
    return await sendOrQueue('POST', `${API_BASE}/api/expenses`, tenantId, expenseData);
  },

  updateExpenseClaim: async (tenantId: string, claimId: string, updates: any): Promise<any> => {
    return await sendOrQueue('PUT', `${API_BASE}/api/expenses/${claimId}`, tenantId, updates);
  },

  // Time Punches
  saveTimePunch: async (tenantId: string, punchData: any): Promise<any> => {
    return await sendOrQueue('POST', `${API_BASE}/api/time-punches`, tenantId, punchData);
  },

  getTimeEntries: async (tenantId: string, userId: string, date?: string): Promise<any[]> => {
    const queryParams = new URLSearchParams({ userId });
    if (date) queryParams.append('date', date);
    const url = `${API_BASE}/api/time-entries?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch time entries');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch time entries');
    }
    return result.data;
  },

  // Profile Update Requests
  createProfileUpdateRequest: async (tenantId: string, requestData: {
    user_id: string;
    field_name: string;
    requested_value: string;
    current_value?: string;
  }): Promise<any> => {
    return await sendOrQueue('POST', `${API_BASE}/api/profile-update-requests`, tenantId, requestData);
  },

  getProfileUpdateRequests: async (tenantId: string, filters?: { status?: string; userId?: string }): Promise<any[]> => {
    // Filter out undefined values
    const cleanFilters = filters ? Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    ) : undefined;
    const queryParams = cleanFilters ? new URLSearchParams(cleanFilters).toString() : '';
    const url = `${API_BASE}/api/profile-update-requests${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch profile update requests');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch profile update requests');
    }
    return result.data;
  },

  approveProfileUpdateRequest: async (tenantId: string, requestId: string, reviewerId: string, reviewNotes?: string): Promise<any> => {
    return await sendOrQueue('PUT', `${API_BASE}/api/profile-update-requests/${requestId}/approve`, tenantId, { reviewer_id: reviewerId, review_notes: reviewNotes });
  },

  rejectProfileUpdateRequest: async (tenantId: string, requestId: string, reviewerId: string, reviewNotes?: string): Promise<any> => {
    return await sendOrQueue('PUT', `${API_BASE}/api/profile-update-requests/${requestId}/reject`, tenantId, { reviewer_id: reviewerId, review_notes: reviewNotes });
  },
  cancelProfileUpdateRequest: async (tenantId: string, requestId: string, userId: string): Promise<any> => {
    return await sendOrQueue('PUT', `${API_BASE}/api/profile-update-requests/${requestId}/cancel`, tenantId, { userId });
  },

  // Time Adjustment API
  getTimeAdjustmentRequests: async (tenantId: string, filters?: { status?: string; userId?: string }): Promise<any[]> => {
    // Filter out undefined values
    const cleanFilters = filters ? Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    ) : undefined;
    const queryParams = cleanFilters ? new URLSearchParams(cleanFilters).toString() : '';
    const url = `${API_BASE}/api/time-adjustments${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch time adjustment requests');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch time adjustment requests');
    }
    return result.data;
  },

  createTimeAdjustmentRequest: async (tenantId: string, adjustmentData: any): Promise<any> => {
    return await sendOrQueue('POST', `${API_BASE}/api/time-adjustments`, tenantId, adjustmentData);
  },

  updateTimeAdjustmentRequest: async (tenantId: string, requestId: string, updates: any): Promise<any> => {
    return await sendOrQueue('PUT', `${API_BASE}/api/time-adjustments/${requestId}`, tenantId, updates);
  },

  // Reports API
  getReport: async (reportType: string, tenantId: string, userId?: string): Promise<any[]> => {
    const params = new URLSearchParams({ type: reportType });
    if (userId) params.append('userId', userId);

    const response = await fetch(`${API_BASE}/api/reports?${params}`, {
      headers: getHeaders(tenantId),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${reportType} report`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || `Failed to fetch ${reportType} report`);
    }
    return result.data || [];
  },

  // Company Settings API
  getCompanySettings: async (tenantId: string): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/company/settings`, {
      headers: getHeaders(tenantId),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch company settings`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || `Failed to fetch company settings`);
    }
    return result.data;
  },

  updateCompanySettings: async (tenantId: string, settings: { workingHoursPerDay: number }): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/company/settings`, {
      method: 'PUT',
      headers: getHeaders(tenantId),
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error(`Failed to update company settings`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || `Failed to update company settings`);
    }
    return result.data;
  },
};