import type { Company, NewCompanyData, User, Announcement } from '../types';
import { UserRole } from '../types';

const API_BASE = '';

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
    const response = await fetch(`${API_BASE}/api/announcements/mark-read`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      throw new Error('Failed to mark announcements as read');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to mark announcements as read');
    }
  },

  createAnnouncement: async (data: { title: string; content: string; imageUrl?: string; created_by: string; tenant_id: string; author_name: string }): Promise<Announcement> => {
    const response = await fetch(`${API_BASE}/api/announcements`, {
      method: 'POST',
      headers: getHeaders(data.tenant_id),
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl,
        author_id: data.created_by,
        author_name: data.author_name,
        tenant_id: data.tenant_id
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to create announcement');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create announcement');
    }
    return result.data;
  },

  updateAnnouncement: async (id: string, data: Partial<Announcement>, tenantId: string): Promise<Announcement> => {
    const response = await fetch(`${API_BASE}/api/announcements/${id}`, {
      method: 'PUT',
      headers: getHeaders(tenantId),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update announcement');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update announcement');
    }
    return result.data;
  },


  deleteAnnouncement: async (announcementId: string, tenantId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/announcements/${announcementId}`, {
      method: 'DELETE',
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to delete announcement');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete announcement');
    }
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
    const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to mark notification as read');
    }
  },

  markAllNotificationsAsRead: async (tenantId: string, userId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
      method: 'PUT',
      headers: getHeaders(tenantId),
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to mark all notifications as read');
    }
  },

  sendNotification: async (message: string, roles: string[]): Promise<void> => {
    // Mock implementation - in real app this would call an API
    console.log('Sending notification:', message, 'to roles:', roles);
  },

  // Payroll API
  getPayableEmployees: async (): Promise<any[]> => {
    // Mock implementation
    return [];
  },

  processPayroll: async (payload: any, password: string): Promise<any> => {
    // Mock implementation
    return { success: true };
  },

  // Reports API
  getReport: async (reportType: string): Promise<any[]> => {
    // Mock implementation
    return [];
  },

  // Payslips API
  getPayslip: async (userId: string, date: string): Promise<any> => {
    // Mock implementation
    return {};
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

  createUser: async (tenantId: string, userData: any): Promise<User> => {
    const response = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create user');
    }
    return result.data;
  },

  updateUser: async (tenantId: string, userId: string, userData: any): Promise<User> => {
    const response = await fetch(`${API_BASE}/api/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders(tenantId),
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update user');
    }
    return result.data;
  },

  deleteUser: async (tenantId: string, userId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(tenantId),
    });
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete user');
    }
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
    const response = await fetch(`${API_BASE}/api/leave/requests/${leaveId}`, {
      method: 'PUT',
      headers: getHeaders(tenantId),
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update leave request');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update leave request');
    }
    return result.data;
  },

  createLeaveRequest: async (tenantId: string, leaveData: any): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/leave/requests`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(leaveData),
    });
    if (!response.ok) {
      throw new Error('Failed to create leave request');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create leave request');
    }
    return result.data;
  },

  // Time Punches
  saveTimePunch: async (tenantId: string, punchData: any): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/time-punches`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(punchData),
    });
    if (!response.ok) {
      throw new Error('Failed to save time punch');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to save time punch');
    }
    return result.data;
  },

  // Time Adjustment Requests
  createTimeAdjustmentRequest: async (tenantId: string, adjustmentData: any): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/time-adjustments`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(adjustmentData),
    });
    if (!response.ok) {
      throw new Error('Failed to create time adjustment request');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create time adjustment request');
    }
    return result.data;
  },

  updateTimeAdjustmentRequest: async (tenantId: string, id: string, updates: any): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/time-adjustments/${id}`, {
      method: 'PUT',
      headers: getHeaders(tenantId),
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update time adjustment request');
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update time adjustment request');
    }
    return result.data;
  },

  getTimeAdjustmentRequests: async (tenantId: string, filters?: any): Promise<any[]> => {
    const queryParams = filters ? new URLSearchParams(filters).toString() : '';
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
};