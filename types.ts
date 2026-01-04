
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
  encryptedId: string;
  licenseCount: number;
  workingHoursPerDay: number;
  breakDurationMinutes?: number; // Auto-deducted break time for single-session days
  modules: {
    payroll: boolean;
    leave: boolean;
    expenses: boolean;
    reports: boolean;
    announcements: boolean;
  };
}

export type NewCompanyData = Omit<Company, 'id' | 'encryptedId'> & {
  adminName: string;
  adminEmail: string;
};

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatarUrl?: string; // Optional since it might not be in database
  team: string; // Maps to department in database
  tenantId?: string; // Link user to a tenant
  companyName?: string; // Company name from user record
  basicSalary: number; // GHS - maps to basic_salary in database
  hireDate: Date | string; // Can be Date or string from database
  mobileMoneyNumber?: string; // For MoMo Payroll - maps to mobile_money_number
  department?: string; // Alternative to team
  position?: string; // Job position
  status?: string; // User status
  is_active?: boolean; // Active status
  temporary_password?: string; // For first-time login
  requires_password_change?: boolean; // Password change requirement
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
  CANCELLED = 'Cancelled',
}

export enum LeaveType {
    ANNUAL = 'Annual Leave',
    MATERNITY = 'Maternity Leave',
    SICK = 'Sick Leave',
}

export interface LeaveRequest {
  id: string;
  userId: string;
  employeeName?: string; // Optional for backward compatibility
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: RequestStatus;
}

export interface AdjustmentRequest {
  id: string;
  userId: string;
  employeeName?: string;
  date: string;
  originalClockIn?: Date;
  originalClockOut?: Date;
  // Actual clock times (populated after approval)
  clockIn?: Date;
  clockOut?: Date;
  clockIn2?: Date; // Second clock-in (return from break)
  clockOut2?: Date; // Second clock-out (end of day)
  // Requested times (used for pending adjustments)
  requestedClockIn: Date;
  requestedClockOut: Date;
  requestedClockIn2?: Date; // Second clock-in (return from break)
  requestedClockOut2?: Date; // Second clock-out (end of day)
  reason: string;
  status: RequestStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
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
    // Informational (not included in actual deductions)
    hoursDeduction?: {
        hours: number;
        amount: number;
        description: string;
    } | null;
    // Hours breakdown (for transparency)
    hourlyRate?: number;
    expectedHoursThisMonth?: number;
    actualHoursWorked?: number | null;
    workingHoursPerDay?: number;
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
    tenant_id: string;
    company_name?: string;
    title: string;
    content: string;
    author_id: string;
    author_name?: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
    readBy?: string[]; // Array of user IDs who have read this announcement
}

export interface ExpenseRequest {
    id: string;
    employee_id: string;
    employee_name?: string;
    description: string;
    amount: number;
    expense_date: string; // Date in YYYY-MM-DD format
    receipt_url?: string;
    status: string;
    submitted_at?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ProfileUpdateRequest {
    id: string;
    userId: string;
    fields: Partial<User>; // The requested changes
    status: RequestStatus;
}

export type View = 'dashboard' | 'leave' | 'approvals' | 'employees' | 'payslips' | 'reports' | 'announcements' | 'expenses' | 'profile' | 'payroll' | 'settings';
