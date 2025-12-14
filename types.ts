
export enum UserRole {
  EMPLOYEE = 'Employee',
  ADMIN = 'Admin',
  HR = 'HR',
  OPERATIONS = 'Operations',
  PAYMENTS = 'Payments',
}

export interface Company {
  id: string;
  name: string;
  licenseCount: number;
  modules: {
    payroll: boolean;
    leave: boolean;
    expenses: boolean;
    reports: boolean;
    announcements: boolean;
  };
}

export type NewCompanyData = Omit<Company, 'id'> & {
  adminName: string;
  adminEmail: string;
};

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatarUrl: string;
  team: string;
  companyId?: string; // Link user to a company
  basicSalary: number; // GHS
  hireDate: Date;
  mobileMoneyNumber?: string; // For MoMo Payroll
}

export enum TimeEntryType {
  CLOCK_IN = 'Clock In',
  CLOCK_OUT = 'Clock Out',
}

export interface TimeEntry {
  id: string;
  userId: string;
  type: TimeEntryType;
  timestamp: Date;
  location?: string;
  photoUrl?: string;
  synced?: boolean; // For Offline Mode
}

export enum RequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum LeaveType {
    ANNUAL = 'Annual Leave',
    MATERNITY = 'Maternity Leave',
    SICK = 'Sick Leave',
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: RequestStatus;
}

export interface AdjustmentRequest {
  id: string;
  userId: string;
  date: Date;
  adjustedTime: string;
  reason: string;
  status: RequestStatus;
}

export interface Earning {
  description: string;
  amount: number;
}

export interface Deduction {
  description: string;
  amount: number;
}

export interface Payslip {
    id: string;
    userId: string;
    payPeriodStart: Date;
    payPeriodEnd: Date;
    payDate: Date;
    // Core Numbers
    basicSalary: number;
    grossPay: number;
    netPay: number;
    totalDeductions: number;
    // Statutory Deductions
    ssnitEmployee: number; // 5.5%
    paye: number;
    // Flexible Deductions
    otherDeductions: Deduction[];
    // Employer Contributions (for reporting)
    ssnitEmployer: number; // 13%
    ssnitTier1: number; // 13.5% of applicable salary (goes to SSNIT)
    ssnitTier2: number; // 5% of applicable salary (private fund)
}

export interface LeaveBalance {
    userId: string;
    annual: number;
    maternity: number;
    sick: number;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    author: string;
    date: Date;
    isRead?: boolean;
    imageUrl?: string;
}

export interface ExpenseRequest {
    id: string;
    userId: string;
    description: string;
    amount: number;
    date: Date;
    receiptUrl?: string; // Mock URL for uploaded photo
    status: RequestStatus;
}

export interface ProfileUpdateRequest {
    id: string;
    userId: string;
    fields: Partial<User>; // The requested changes
    status: RequestStatus;
}

export type View = 'dashboard' | 'leave' | 'approvals' | 'employees' | 'payslips' | 'reports' | 'announcements' | 'expenses' | 'profile' | 'payroll' | 'settings';
