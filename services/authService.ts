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
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
    return null;
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  logout: (): void => {
    localStorage.removeItem('currentUser');
  },
};
