import { USERS, TIME_ENTRIES, LEAVE_BALANCES } from '../constants';
import { User, Payslip, UserRole, TimeEntry } from '../types';

// --- CONFIGURATION ---
const API_BASE_URL = 'http://localhost:3001/api';

const SSNIT_CAP = 61000;
const SSNIT_EMPLOYEE_RATE = 0.055;
const SSNIT_EMPLOYER_RATE = 0.13;
const SSNIT_TIER_1_RATE = 0.135;
const SSNIT_TIER_2_RATE = 0.05;

// --- MOCK DATABASE STATE (Fallback) ---
interface PayrollLog {
    id: string;
    userId: string;
    amount: number;
    reason?: string;
    date: Date;
    monthKey: string; 
}

export interface InAppNotification {
    id: string;
    message: string;
    timestamp: Date;
    read: boolean;
    targetRoles?: UserRole[];
}

let PAYROLL_HISTORY_FALLBACK: PayrollLog[] = [];
let NOTIFICATIONS: InAppNotification[] = [];

// --- HELPER FUNCTIONS ---

const parseNum = (val: any): number => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
}

const getAllTimeEntries = (): TimeEntry[] => {
    let allEntries = [...TIME_ENTRIES];
    USERS.forEach(user => {
        try {
            const stored = localStorage.getItem(`time_entries_${user.id}`);
            if (stored) {
                const localEntries = JSON.parse(stored).map((e: any) => ({
                    ...e, 
                    timestamp: new Date(e.timestamp)
                }));
                localEntries.forEach((loc: TimeEntry) => {
                    if (!allEntries.some(srv => srv.id === loc.id)) {
                        allEntries.push(loc);
                    }
                });
            }
        } catch (e) {
            console.warn(`Failed to parse local entries for user ${user.id}`, e);
        }
    });
    return allEntries;
};

const calculateSSNIT = (basicSalary: number) => {
    const salary = parseNum(basicSalary);
    const applicableSalary = Math.min(salary, SSNIT_CAP);
    const employeeContribution = applicableSalary * SSNIT_EMPLOYEE_RATE;
    const employerContribution = applicableSalary * SSNIT_EMPLOYER_RATE;
    const tier1 = applicableSalary * SSNIT_TIER_1_RATE;
    const tier2 = applicableSalary * SSNIT_TIER_2_RATE;
    return { employeeContribution, employerContribution, tier1, tier2 };
};

const calculatePAYE = (taxableIncomeInput: number) => {
    let tax = 0;
    let remainingIncome = Math.max(0, parseNum(taxableIncomeInput));
    
    const brackets = [
        { limit: 490, rate: 0.0 },
        { limit: 110, rate: 0.05 },
        { limit: 130, rate: 0.10 },
        { limit: 3166.67, rate: 0.175 },
        { limit: 16000, rate: 0.25 },
        { limit: 30520, rate: 0.30 },
        { limit: Infinity, rate: 0.35 },
    ];
    
    for (const bracket of brackets) {
        if (remainingIncome <= 0) break;
        const taxableInBracket = Math.min(remainingIncome, bracket.limit);
        tax += taxableInBracket * bracket.rate;
        remainingIncome -= taxableInBracket;
    }
    return tax;
};

const generatePayslip = (user: User, payDateInput: Date | string, otherDeductions: any[] = []): Payslip => {
    const basicSalary = parseNum(user.basicSalary);
    const ssnit = calculateSSNIT(basicSalary);
    const taxableIncome = Math.max(0, basicSalary - ssnit.employeeContribution);
    const paye = calculatePAYE(taxableIncome);
    
    const grossPay = basicSalary;
    const totalOtherDeductions = otherDeductions.reduce((sum, d) => sum + parseNum(d.amount), 0);
    const totalDeductions = ssnit.employeeContribution + paye + totalOtherDeductions;
    const netPay = grossPay - totalDeductions;
    
    const payDate = new Date(payDateInput);
    const validPayDate = isNaN(payDate.getTime()) ? new Date() : payDate;
    const payPeriodEnd = validPayDate;
    const payPeriodStart = new Date(validPayDate.getFullYear(), validPayDate.getMonth(), 1);

    return {
        id: `ps-${user.id}-${validPayDate.getTime()}`, 
        userId: user.id, 
        payPeriodStart, 
        payPeriodEnd, 
        payDate: validPayDate,
        basicSalary: parseNum(basicSalary), 
        grossPay: parseNum(grossPay), 
        ssnitEmployee: parseNum(ssnit.employeeContribution), 
        paye: parseNum(paye), 
        otherDeductions: otherDeductions,
        totalDeductions: parseNum(totalDeductions), 
        netPay: parseNum(netPay), 
        ssnitEmployer: parseNum(ssnit.employerContribution),
        ssnitTier1: parseNum(ssnit.tier1), 
        ssnitTier2: parseNum(ssnit.tier2),
    };
};

// --- API SERVICE ---

export const api = {
    getPayslip: async (userId: string, dateStr?: string): Promise<Payslip> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        const user = USERS.find(u => u.id === userId);
        if (!user) throw new Error('User not found');
        const payDate = dateStr ? new Date(dateStr) : new Date();
        const staffLoanDeduction = user.id === '1' ? [{ description: 'Staff Loan', amount: 250 }] : [];
        return generatePayslip(user, payDate, staffLoanDeduction);
    },

    getPayableEmployees: async () => {
        try {
            // Attempt to fetch from Backend
            const response = await fetch(`${API_BASE_URL}/payroll/payable-employees`);
            if (!response.ok) throw new Error('Backend unreachable');
            return await response.json();
        } catch (e) {
            console.warn('Backend unavailable, using fallback mock data', e);
            // FALLBACK SIMULATION
            await new Promise(resolve => setTimeout(resolve, 400));
            const today = new Date();
            const currentMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
            
            return USERS.map(user => {
                const payslip = generatePayslip(user, today);
                const paymentLog = PAYROLL_HISTORY_FALLBACK.find(
                    log => log.userId === user.id && log.monthKey === currentMonthKey
                );

                return {
                    id: user.id,
                    name: user.name,
                    mobileMoneyNumber: user.mobileMoneyNumber,
                    basicSalary: user.basicSalary,
                    netPay: payslip.netPay,
                    isPaid: !!paymentLog,
                    paidAmount: paymentLog ? paymentLog.amount : 0,
                    paidDate: paymentLog ? paymentLog.date : null,
                    paidReason: paymentLog ? paymentLog.reason : null
                };
            });
        }
    },

    processPayroll: async (payments: { userId: string, amount: number, reason?: string }[], password: string) => {
        try {
            // Attempt to send to Backend
            const response = await fetch(`${API_BASE_URL}/payroll/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payments, password })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Payment processing failed');
            }
            return await response.json();

        } catch (e) {
            console.warn('Backend unavailable or failed, using fallback mock logic', e);
            // FALLBACK SIMULATION
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (password !== 'approve123') throw new Error('Incorrect approval password.');

            const today = new Date();
            const currentMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

            return payments.map(payment => {
                const isSuccess = Math.random() > 0.05; 
                if (isSuccess) {
                    PAYROLL_HISTORY_FALLBACK.push({
                        id: `pay-${Date.now()}-${Math.random()}`,
                        userId: payment.userId,
                        amount: payment.amount,
                        reason: payment.reason,
                        date: new Date(),
                        monthKey: currentMonthKey
                    });
                }
                return {
                    userId: payment.userId,
                    status: isSuccess ? 'success' : 'failed',
                    message: isSuccess ? 'Payment simulated successfully' : 'Simulation error'
                };
            });
        }
    },

    getReport: async (reportType: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));

        if (reportType === 'ssnit') {
            return USERS.map(user => {
                const { employeeContribution, employerContribution } = calculateSSNIT(user.basicSalary);
                return {
                    'Staff ID': user.id,
                    'Full Name': user.name,
                    'Basic Salary (GHS)': Number(user.basicSalary).toFixed(2),
                    'SSNIT Contribution (18.5%)': (employeeContribution + employerContribution).toFixed(2)
                };
            });
        }
        
        if (reportType === 'paye') {
            return USERS.map(user => {
                const { employeeContribution } = calculateSSNIT(user.basicSalary);
                const taxableIncome = Math.max(0, user.basicSalary - employeeContribution);
                const paye = calculatePAYE(taxableIncome);
                return {
                    'Staff ID': user.id,
                    'Full Name': user.name,
                    'Basic Salary (GHS)': Number(user.basicSalary).toFixed(2),
                    'Taxable Income (GHS)': taxableIncome.toFixed(2),
                    'PAYE (GHS)': paye.toFixed(2)
                };
            });
        }

        if (reportType === 'leave') {
            return USERS.map(user => {
                const balance = LEAVE_BALANCES.find(b => b.userId === user.id) || { annual: 0, maternity: 0, sick: 0 };
                return {
                    'Staff ID': user.id,
                    'Full Name': user.name,
                    'Department': user.team,
                    'Annual Leave (Days)': balance.annual,
                    'Sick Leave (Days)': balance.sick,
                    'Maternity Leave (Weeks)': balance.maternity
                };
            });
        }

        if (reportType === 'attendance') {
            const allTimeEntries = getAllTimeEntries();
            const attendanceByDate: Record<string, any> = allTimeEntries.reduce((acc: any, entry) => {
                const dateKey = new Date(entry.timestamp).toDateString();
                const key = `${entry.userId}-${dateKey}`;
                if (!acc[key]) {
                    acc[key] = { userId: entry.userId, date: new Date(entry.timestamp), clockIns: [], clockOuts: [] };
                }
                if (entry.type === 'Clock In') {
                    acc[key].clockIns.push(new Date(entry.timestamp));
                } else {
                    acc[key].clockOuts.push(new Date(entry.timestamp));
                }
                return acc;
            }, {});

            return Object.values(attendanceByDate).map((dayData: any) => {
                const user = USERS.find(u => u.id === dayData.userId);
                const firstClockIn = dayData.clockIns.length > 0 ? new Date(Math.min(...dayData.clockIns.map((d:Date) => d.getTime()))) : null;
                const lastClockOut = dayData.clockOuts.length > 0 ? new Date(Math.max(...dayData.clockOuts.map((d:Date) => d.getTime()))) : null;

                let totalHours = 'N/A';
                if (firstClockIn && lastClockOut) {
                    const diffMs = lastClockOut.getTime() - firstClockIn.getTime();
                    totalHours = (diffMs / 3600000).toFixed(2);
                } else if (firstClockIn) {
                    totalHours = 'In Progress';
                }

                return {
                    'Staff ID': user ? user.id : 'Unknown',
                    'Full Name': user ? user.name : 'Unknown',
                    'Date': dayData.date.toLocaleDateString(),
                    'Clock In': firstClockIn ? firstClockIn.toLocaleTimeString() : 'N/A',
                    'Clock Out': lastClockOut ? lastClockOut.toLocaleTimeString() : 'N/A',
                    'Total Hours': totalHours
                };
            }).sort((a,b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
        }

        return [];
    },

    sendNotification: (message: string, targetRoles: UserRole[]) => {
        const newNotification: InAppNotification = {
            id: `notif-${Date.now()}-${Math.random()}`,
            message,
            timestamp: new Date(),
            read: false,
            targetRoles
        };
        NOTIFICATIONS.unshift(newNotification);
    },

    getNotifications: (user: User) => {
        return NOTIFICATIONS.filter(n => 
            n.targetRoles ? n.targetRoles.includes(user.role) : true
        );
    }
};