import type { Company, NewCompanyData, User } from '../types';
import { UserRole } from '../types';

export const api = {
  createCompanyAndAdmin: async (data: NewCompanyData): Promise<{ company: Company; user: User }> => {
    // Mock API call
    const company: Company = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
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
      companyId: company.id,
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
};