import type { User } from '../types';
import { UserRole } from '../types';
import Cookies from 'js-cookie';

export const authService = {
  login: (email: string, password: string): User | null => {
    // Mock login - in real app, this would call an API
    if (email === 'admin@vpena.com' && password === 'password') {
      const user: User = {
        id: '1',
        name: 'Super Admin',
        email: 'admin@vpena.com',
        role: UserRole.ADMIN,
        avatarUrl: '',
        team: 'Admin',
        basicSalary: 0,
        hireDate: new Date(),
        tenantId: '1', // Add tenantId for mock user
      };
      // Store in cookies instead of sessionStorage
      Cookies.set('user_session', JSON.stringify(user), {
        expires: 7,
        secure: window.location.protocol === 'https:',
        sameSite: 'strict'
      });
      return user;
    }
    return null;
  },

  setCurrentUser: (user: User): void => {
    // User session is now managed server-side with HttpOnly cookies
    // No client-side storage needed for security
    console.log('User session managed server-side via HttpOnly cookies');
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include cookies in request
      });

      const data = await response.json();

      if (data.success && data.authenticated && data.user) {
        return data.user;
      }

      return null;
    } catch (error) {
      console.error('Failed to get current user from server:', error);
      return null;
    }
  },

  logout: (): void => {
    // Cookies are cleared server-side in the logout API call
    // Clear any client-side cached data
    localStorage.clear();
  },

  // Get auth headers for API calls
  getAuthHeaders: (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    return headers;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!authService.getCurrentUser();
  },

  // Reset password for a user (admin action)
  resetPassword: async (userId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: 'Password reset email sent successfully.' };
      } else {
        return { success: false, message: data.error || 'Failed to reset password.' };
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      return { success: false, message: 'Network error occurred.' };
    }
  }
};
