import type { User } from '../types';
import { UserRole } from '../types';

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
      };
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
    return null;
  },

  setCurrentUser: (user: User): void => {
    try {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user session:', error);
    }
  },

  getCurrentUser: (): User | null => {
    try {
      const userStr = sessionStorage.getItem('currentUser');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      // Validate that the user object has required fields
      if (!user || !user.id || !user.email) {
        console.warn('Invalid user data in session storage, clearing...');
        sessionStorage.removeItem('currentUser');
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('Failed to parse user session:', error);
      sessionStorage.removeItem('currentUser');
      return null;
    }
  },

  logout: (): void => {
    sessionStorage.removeItem('currentUser');
  },
};
