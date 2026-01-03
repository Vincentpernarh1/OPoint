
// Check for Node version compatibility (fetch API)
if (!global.fetch) {
    console.warn("WARNING: Your Node.js version is too old to support 'fetch'. Please use Node 18+.");
    console.warn("The server may crash when attempting to call MTN APIs.");
}

// Safely try to load dotenv
try {
    const dotenv = await import('dotenv');
    dotenv.config();
} catch (e) {
    console.log("NOTE: 'dotenv' package not found. Using system environment variables or defaults.");
}

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { sendPasswordResetEmail } from './services/emailService.js';
import path from 'path';
import webPush from 'web-push';
import db, { getSupabaseClient, getSupabaseAdminClient, setTenantContext, getCurrentTenantId } from './services/database.js';
import { validatePasswordStrength } from './utils/passwordValidator.js';
import { scheduleAutoClose, forceAutoClose } from './services/auto-close.js';

const app = express();

// --- MIDDLEWARE ---
app.use(cors({
    origin: ['http://192.168.0.93:5173', 'http://192.168.0.93:5174', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(cookieParser()); // Parse cookies
app.use(express.json({ limit: '10mb' }));

// Tenant context middleware
app.use((req, res, next) => {
    const tenantId = req.headers['x-tenant-id'];
    if (tenantId) {
        setTenantContext(tenantId);
    }
    next();
});

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// --- CONFIGURATION & SECRETS ---
const CONFIG = {
    MOMO_BASE_URL: process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com/disbursement',
    MOMO_USER_ID: process.env.MOMO_USER_ID,
    MOMO_API_KEY: process.env.MOMO_API_KEY,
    MOMO_SUBSCRIPTION_KEY: process.env.MOMO_SUBSCRIPTION_KEY,
    MOMO_TARGET_ENV: process.env.MOMO_TARGET_ENV || 'sandbox',
    CALLBACK_HOST: process.env.CALLBACK_HOST || 'http://localhost:3001',
    APPROVAL_PASSWORD: process.env.APPROVAL_PASSWORD || 'approve123'
};

// --- PUSH NOTIFICATION SETUP ---
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

// Only set VAPID details if keys are properly configured
if (vapidKeys.publicKey && vapidKeys.privateKey && 
    vapidKeys.publicKey !== 'BDefaultPublicKeyForTestingOnly' && 
    vapidKeys.privateKey !== 'DefaultPrivateKeyForTestingOnly') {
    try {
        webPush.setVapidDetails(
            'mailto:vpenatechwizard@gmail.com',
            vapidKeys.publicKey,
            vapidKeys.privateKey
        );
        console.log('✅ Push notifications enabled');
    } catch (error) {
        console.warn('⚠️ Push notifications disabled - Invalid VAPID keys:', error.message);
    }
} else {
    console.warn('⚠️ Push notifications disabled - VAPID keys not configured');
}

// --- FALLBACK MOCK DATA (Used when database is not configured) ---
const MOCK_USERS = [
    { id: '1', name: 'Alice Johnson', email: 'alice@vertex.com', role: 'Employee', basic_salary: 8000, mobile_money_number: '0240123456', company_id: 'vertex' },
    { id: '2', name: 'Bob Williams', email: 'bob@vertex.com', role: 'Employee', basic_salary: 6000, mobile_money_number: '0551234567', company_id: 'vertex' },
    { id: '3', name: 'Charlie Brown', email: 'charlie@summit.inc', role: 'Admin', basic_salary: 70000, mobile_money_number: '0272345678', company_id: 'summit' },
    { id: '4', name: 'Diana Prince', email: 'diana@vertex.com', role: 'Employee', basic_salary: 3500, mobile_money_number: '0503456789', company_id: 'vertex' },
    { id: '5', name: 'Eva Green', email: 'eva@vertex.com', role: 'HR', basic_salary: 12000, mobile_money_number: '0201112222', company_id: 'vertex' },
    { id: '6', name: 'Frank Miller', email: 'frank@vertex.com', role: 'Operations', basic_salary: 11000, mobile_money_number: '0543334444', company_id: 'vertex' },
    { id: '7', name: 'Grace Jones', email: 'grace@summit.inc', role: 'Payments', basic_salary: 15000, mobile_money_number: '0265556666', company_id: 'summit' },
];

const MOCK_ANNOUNCEMENTS = [
    { id: 'ann1', tenant_id: 'c1', title: 'Public Holiday Announcement', content: 'Please be reminded that this coming Friday is a public holiday. The office will be closed. Enjoy the long weekend!', author_id: '5', created_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), updated_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), isRead: false },
    { id: 'ann2', tenant_id: 'c1', title: 'End of Year Party', content: 'Get ready for our annual end-of-year party! More details to follow next week.', author_id: '5', created_at: new Date('2023-12-01').toISOString(), updated_at: new Date('2023-12-01').toISOString(), isRead: true },
    { id: 'ann3', tenant_id: 'c2', title: 'Company Meeting', content: 'There will be a company-wide meeting next Monday at 10 AM in the main conference room.', author_id: '3', created_at: new Date('2023-12-15').toISOString(), updated_at: new Date('2023-12-15').toISOString(), isRead: false },
];

// In-memory storage for transaction logs (Used when database not configured)
const PAYROLL_HISTORY = [];

// --- VALIDATION HELPERS ---
const validators = {
    isValidGhanaPhone(phone) {
        if (!phone) return false;
        // Remove spaces and non-digit characters
        const cleaned = phone.replace(/\s+/g, '').replace(/\D/g, '');
        // Ghana phone numbers: 0XX XXX XXXX (10 digits starting with 0)
        // Also accept longer numbers and take the last 10 digits
        if (cleaned.length >= 10 && cleaned.startsWith('0')) {
            return /^0[235]\d{8}$/.test(cleaned.slice(-10));
        }
        // If it doesn't start with 0 but has 10+ digits, check if last 10 start with 0
        if (cleaned.length >= 10) {
            return /^0[235]\d{8}$/.test(cleaned.slice(-10));
        }
        return false;
    },

    isValidEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    },

    isValidAmount(amount) {
        return typeof amount === 'number' && amount > 0 && amount <= 100000;
    },

    sanitizePhone(phone) {
        if (!phone) return phone;
        // Remove spaces and non-digit characters
        let cleaned = phone.replace(/\s+/g, '').replace(/\D/g, '');
        // If longer than 10 digits, take the last 10 digits
        if (cleaned.length > 10) {
            cleaned = cleaned.slice(-10);
        }
        // Ensure it starts with 0
        if (cleaned.length === 10 && !cleaned.startsWith('0')) {
            cleaned = '0' + cleaned.slice(1);
        }
        return cleaned;
    }
};

// --- ERROR HANDLER ---
const errorHandler = (error, req, res, next) => {
    console.error('❌ Server Error:', error);
    
    const statusCode = error.statusCode || 500;
    const message = IS_PRODUCTION && statusCode === 500 
        ? 'Internal server error' 
        : error.message;

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(IS_PRODUCTION ? {} : { stack: error.stack })
    });
};

// --- MOMO SERVICE CLASS ---
class MomoService {
    constructor() {
        this.token = null;
        this.tokenExpiry = 0;
    }

    generateUUID() {
        return crypto.randomUUID();
    }

    // 1. Authentication: Get Bearer Token
    async getToken() {
        // Return cached token if valid
        if (this.token && Date.now() < this.tokenExpiry - 60000) {
            return this.token;
        }

        // If credentials missing, simulate
        if (!CONFIG.MOMO_USER_ID || !CONFIG.MOMO_API_KEY) {
            // Logging simulation only once to avoid spamming
            if (!this.hasLoggedSim) {
                console.log(">> 🟡 API Keys missing. Using SIMULATION MODE for token.");
                this.hasLoggedSim = true;
            }
            return 'SIMULATED_TOKEN';
        }

        const authString = Buffer.from(`${CONFIG.MOMO_USER_ID}:${CONFIG.MOMO_API_KEY}`).toString('base64');

        try {
            const response = await fetch(`${CONFIG.MOMO_BASE_URL}/token/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Ocp-Apim-Subscription-Key': CONFIG.MOMO_SUBSCRIPTION_KEY
                }
            });

            if (!response.ok) throw new Error(`Token Auth Failed: ${response.statusText}`);

            const data = await response.json();
            this.token = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            return this.token;
        } catch (error) {
            console.error('MoMo Token Error:', error);
            throw error;
        }
    }

    // 2. Transfer: Send money
    async transfer(amount, payeeNumber, externalId, payeeNote = 'Payroll') {
        const token = await this.getToken();

        // SIMULATION LOGIC
        if (token === 'SIMULATED_TOKEN') {
            await new Promise(r => setTimeout(r, 800)); // Fake delay
            const isSuccess = Math.random() > 0.1; // 90% success rate in simulation
            if (isSuccess) {
                return { status: 'PENDING', referenceId: this.generateUUID(), simulated: true };
            } else {
                 return { status: 'FAILED', error: 'Simulated Network Error' };
            }
        }

        const referenceId = this.generateUUID();
        
        try {
            const response = await fetch(`${CONFIG.MOMO_BASE_URL}/v1_0/transfer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Reference-Id': referenceId,
                    'X-Target-Environment': CONFIG.MOMO_TARGET_ENV,
                    'Ocp-Apim-Subscription-Key': CONFIG.MOMO_SUBSCRIPTION_KEY,
                    'Content-Type': 'application/json',
                    'X-Callback-Url': `${CONFIG.CALLBACK_HOST}/api/momo/callback`
                },
                body: JSON.stringify({
                    amount: amount.toString(),
                    currency: 'GHS',
                    externalId: externalId,
                    payee: {
                        partyIdType: 'MSISDN',
                        partyId: payeeNumber
                    },
                    payerMessage: 'Salary Payment',
                    payeeNote: payeeNote
                })
            });

            if (response.status === 202) {
                return { status: 'PENDING', referenceId };
            } else {
                const errText = await response.text();
                throw new Error(`Transfer Failed: ${response.status} - ${errText}`);
            }

        } catch (error) {
            console.error('MoMo Transfer Error:', error);
            return { status: 'FAILED', error: error.message };
        }
    }

    // 3. Batch Processor
    async processBatch(payments) {
        const results = [];
        
        for (const payment of payments) {
            const { userId, amount, mobileMoneyNumber, reason } = payment;
            const externalId = `PAY_${Date.now()}_${userId}`;
            
            try {
                // Validation
                if (!mobileMoneyNumber) {
                    throw new Error('Missing Mobile Money Number');
                }
                
                if (!validators.isValidGhanaPhone(mobileMoneyNumber)) {
                    throw new Error('Invalid Ghana phone number format');
                }
                
                if (!validators.isValidAmount(amount)) {
                    throw new Error('Invalid payment amount');
                }

                const sanitizedPhone = validators.sanitizePhone(mobileMoneyNumber);
                const result = await this.transfer(amount, sanitizedPhone, externalId, reason);
                
                const isSuccess = result.status !== 'FAILED';
                
                results.push({
                    userId,
                    amount,
                    status: isSuccess ? 'success' : 'failed',
                    referenceId: result.referenceId,
                    message: isSuccess ? 'Payment queued successfully' : result.error
                });

                if (isSuccess) {
                    // Save to database if available, otherwise use in-memory
                    const payrollRecord = {
                        transaction_id: result.referenceId,
                        user_id: userId,
                        amount,
                        reason,
                        status: result.status,
                        external_id: externalId,
                        created_at: new Date().toISOString()
                    };

                    const { error } = await db.createPayrollRecord(payrollRecord);
                    
                    if (error) {
                        // Fallback to in-memory if database fails
                        PAYROLL_HISTORY.push({
                            transactionId: result.referenceId,
                            userId,
                            amount,
                            reason,
                            date: new Date(),
                            status: result.status,
                            externalId
                        });
                    }
                }

            } catch (err) {
                console.error(`Payment error for user ${userId}:`, err.message);
                results.push({ 
                    userId, 
                    status: 'failed', 
                    message: err.message 
                });
            }
        }
        return results;
    }
}

const momoService = new MomoService();

// --- PAYSLIP CACHE ---
// In-memory cache for payslip calculations (reduces database load)
const payslipCache = new Map();
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

function getCachedPayslip(userId, date) {
    const cacheKey = `${userId}_${date}`;
    const cached = payslipCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return cached.data;
    }
    
    return null;
}

function setCachedPayslip(userId, date, payslipData) {
    const cacheKey = `${userId}_${date}`;
    payslipCache.set(cacheKey, {
        data: payslipData,
        timestamp: Date.now()
    });
}

function clearPayslipCache(userId) {
    // Clear all cache entries for a specific user
    for (const key of payslipCache.keys()) {
        if (key.startsWith(`${userId}_`)) {
            payslipCache.delete(key);
        }
    }
}

// --- UTILITY FUNCTIONS ---
async function getUsers() {
    const { data, error } = await db.getUsers();
    if (error || !data || data.length === 0) {
        console.log('⚠️  Using fallback mock data (database not configured)');
        // Transform mock data to camelCase to match database transformation
        return MOCK_USERS.map(user => ({
            ...user,
            tenantId: user.company_id, // Map company_id to tenantId
            basicSalary: user.basic_salary,
            mobileMoneyNumber: user.mobile_money_number,
            // Remove snake_case versions
            basic_salary: undefined,
            mobile_money_number: undefined,
            company_id: undefined
        }));
    }
    return data;
}

async function getUserById(userId) {
    const { data, error } = await db.getUserById(userId);
    if (error || !data) {
        // Transform mock data to camelCase
        const mockUser = MOCK_USERS.find(u => u.id === userId);
        if (mockUser) {
            return {
                ...mockUser,
                tenantId: mockUser.company_id,
                basicSalary: mockUser.basic_salary,
                mobileMoneyNumber: mockUser.mobile_money_number,
                // Remove snake_case versions
                basic_salary: undefined,
                mobile_money_number: undefined,
                company_id: undefined
            };
        }
        return null;
    }
    return data;
}

// Helper function to get current user from cookies
function getCurrentUser(req) {
    try {
        const userSessionCookie = req.cookies.user_session;
        if (!userSessionCookie) {
            return null;
        }

        const userSession = JSON.parse(userSessionCookie);
        if (!userSession || !userSession.id) {
            return null;
        }

        return userSession;
    } catch (error) {
        console.error('Error parsing user session:', error);
        return null;
    }
}

// Helper function to check if user has admin/payment access
function hasFullReportAccess(userRole) {
    return userRole === 'Admin' || userRole === 'Payments' || userRole === 'SuperAdmin';
}

// Calculate net pay after taxes and deductions
function calculateNetPay(basicSalary, userId, payDate, workingHoursPerDay = 8.00, actualHoursWorked = null) {
    let grossPay = basicSalary;
    let hourlyRate = 0;
    let expectedHoursThisMonth = 0;

    // If we have actual hours worked, calculate pay based on hours
    if (actualHoursWorked !== null && actualHoursWorked >= 0) {
        // Calculate expected hours for the month (counting only working days - Mon-Fri)
        const year = payDate.getFullYear();
        const month = payDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let workingDays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            // Count Monday (1) to Friday (5) only
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                workingDays++;
            }
        }
        
        expectedHoursThisMonth = workingHoursPerDay * workingDays;

        // Calculate hourly rate: basic salary / expected monthly hours
        hourlyRate = basicSalary / expectedHoursThisMonth;

        // Calculate gross pay based on actual hours worked
        grossPay = hourlyRate * actualHoursWorked;
    }

    // Calculate SSNIT contributions (5.5% of gross pay)
    // NOTE: SSNIT is calculated on gross pay, not basic salary
    const ssnitEmployee = grossPay * 0.055;

    // Calculate PAYE tax (Ghana tax brackets)
    // PAYE is calculated on taxable income (gross pay minus SSNIT employee contribution)
    let paye = 0;
    const taxableIncome = grossPay - ssnitEmployee;

    if (taxableIncome <= 3828) {
        paye = 0;
    } else if (taxableIncome <= 4828) {
        paye = (taxableIncome - 3828) * 0.05;
    } else if (taxableIncome <= 5828) {
        paye = 1000 * 0.05 + (taxableIncome - 4828) * 0.10;
    } else if (taxableIncome <= 6828) {
        paye = 1000 * 0.05 + 1000 * 0.10 + (taxableIncome - 5828) * 0.175;
    } else {
        paye = 1000 * 0.05 + 1000 * 0.10 + 1000 * 0.175 + (taxableIncome - 6828) * 0.25;
    }

    // Note: Hours-based pay adjustment is already reflected in grossPay
    // No need to add as separate deduction (would be double-counting)
    const otherDeductions = [];

    // Calculate hours deduction for DISPLAY ONLY (informational)
    // This shows how much was deducted from basic salary, but doesn't affect net pay
    let hoursDeduction = null;
    if (actualHoursWorked !== null && actualHoursWorked >= 0 && expectedHoursThisMonth > 0) {
        const hoursShortfall = expectedHoursThisMonth - actualHoursWorked;
        if (hoursShortfall > 0) {
            const deductionAmount = hourlyRate * hoursShortfall;
            hoursDeduction = {
                hours: hoursShortfall,
                amount: deductionAmount,
                description: `Hours not worked (${hoursShortfall.toFixed(2)} hours)`
            };
        }
    }

    // Calculate totals
    const totalOtherDeductions = otherDeductions.reduce((sum, d) => sum + d.amount, 0);
    const totalDeductions = ssnitEmployee + paye + totalOtherDeductions;
    const netPay = grossPay - totalDeductions;

    return {
        grossPay: Math.max(0, grossPay),
        netPay: Math.max(0, netPay), // Ensure net pay is not negative
        totalDeductions,
        ssnitEmployee,
        paye,
        otherDeductions,
        hoursDeduction,
        hourlyRate,
        expectedHoursThisMonth,
        actualHoursWorked,
        workingHoursPerDay
    };
}

// Function to calculate actual hours worked for a user in the current month
async function calculateHoursWorked(userId, tenantId, payDate) {
    try {
        const currentMonth = payDate.getMonth();
        const currentYear = payDate.getFullYear();

        // Get company break duration setting
        let breakDurationMinutes = 60; // Default 60 minutes
        try {
            const adminClient = getSupabaseAdminClient();
            if (adminClient) {
                const { data: company } = await adminClient
                    .from('opoint_companies')
                    .select('break_duration_minutes')
                    .eq('id', tenantId)
                    .single();
                if (company && company.break_duration_minutes !== undefined && company.break_duration_minutes !== null) {
                    breakDurationMinutes = company.break_duration_minutes;
                }
            }
        } catch (error) {
            console.log('Could not fetch company break duration, using default:', error.message);
        }

        // Get clock logs for the user
        const { data: clockLogs, error } = await db.getClockLogs(userId);

        if (error || !clockLogs || clockLogs.length === 0) {
            console.log(`⚠️ No clock logs found for user ${userId}, month: ${currentMonth + 1}/${currentYear}`);
            return null; // Return null to use default salary calculation
        }
        
        console.log(`📋 Found ${clockLogs.length} total clock logs for user ${userId}, filtering for month: ${currentMonth + 1}/${currentYear}`);

        let totalHoursWorked = 0;
        let skippedNoClockOut = 0;
        let skippedWrongMonth = 0;

        // Group entries by date and calculate hours
        // Note: Approved adjustments already have clock_in/clock_out updated in the database
        const entriesByDate = {};
        const now = new Date();
        
        clockLogs.forEach(entry => {
            // Skip entries without clock_in
            if (!entry.clock_in) {
                skippedNoClockOut++;
                return;
            }
            
            const clockInDate = new Date(entry.clock_in);
            // Filter for current month
            if (clockInDate.getMonth() !== currentMonth || clockInDate.getFullYear() !== currentYear) {
                skippedWrongMonth++;
                return;
            }
            
            // For incomplete entries (no clock_out), use current time as temporary clock_out
            // This allows calculating hours for ongoing work sessions
            if (!entry.clock_out) {
                entry = { ...entry, clock_out: now.toISOString(), isIncomplete: true };
            }
            
            const dateKey = clockInDate.toDateString();
            if (!entriesByDate[dateKey]) {
                entriesByDate[dateKey] = [];
            }
            entriesByDate[dateKey].push(entry);
        });
        
        const validEntries = Object.keys(entriesByDate).length;
        console.log(`⏱️ Filtered results: ${validEntries} days with entries, skipped ${skippedNoClockOut} incomplete, ${skippedWrongMonth} wrong month`);

        // Calculate hours for each day
        Object.keys(entriesByDate).forEach(dateKey => {
            const dayEntries = entriesByDate[dateKey];
            let dayTotalMs = 0;
            
            // Check if any entry has multi-session fields (clock_in_2, clock_out_2)
            const hasMultiSession = dayEntries.some(entry => entry.clock_in_2 || entry.clock_out_2);
            
            if (hasMultiSession) {
                // Handle multi-session day (break tracking with 2 separate sessions)
                dayEntries.forEach(entry => {
                    // Session 1
                    if (entry.clock_in && entry.clock_out) {
                        const clockIn = new Date(entry.clock_in);
                        const clockOut = new Date(entry.clock_out);
                        const sessionMs = clockOut.getTime() - clockIn.getTime();
                        dayTotalMs += sessionMs;
                    }
                    
                    // Session 2 (if exists)
                    if (entry.clock_in_2 && entry.clock_out_2) {
                        const clockIn2 = new Date(entry.clock_in_2);
                        const clockOut2 = new Date(entry.clock_out_2);
                        const session2Ms = clockOut2.getTime() - clockIn2.getTime();
                        dayTotalMs += session2Ms;
                    }
                });
                // Multi-session days don't get automatic break deduction (break already tracked)
            } else {
                // Single or multiple entries without multi-session fields
                dayEntries.forEach(entry => {
                    const clockIn = new Date(entry.clock_in);
                    const clockOut = new Date(entry.clock_out);
                    const sessionMs = clockOut.getTime() - clockIn.getTime();
                    dayTotalMs += sessionMs;
                });

                // Apply automatic break deduction for single-session days (consistent with frontend)
                // Only deduct break if worked time >= 7 hours AND it's a single session day
                const isSingleSession = dayEntries.length === 1;
                const minimumHoursForBreak = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
                
                if (isSingleSession && breakDurationMinutes > 0 && dayTotalMs >= minimumHoursForBreak) {
                    const breakMs = breakDurationMinutes * 60 * 1000;
                    dayTotalMs = Math.max(0, dayTotalMs - breakMs);
                }
            }

            // Convert to hours and add to total
            const dayHours = dayTotalMs / (1000 * 60 * 60);
            totalHoursWorked += dayHours;
        });

        return totalHoursWorked;

    } catch (error) {
        console.error(`Error calculating hours worked for user ${userId}:`, error);
        return null; // Return null to fall back to default calculation
    }
}

// --- API ENDPOINTS ---

// Health check - MUST be at /api/health, NOT at root
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        database: getSupabaseClient() ? 'connected' : 'mock mode',
        momo: CONFIG.MOMO_API_KEY ? 'live' : 'simulation',
        timestamp: new Date().toISOString()
    });
});

// API status check
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'running',
        message: 'Opoint Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Force auto-close endpoint (for testing)
app.post('/api/admin/force-auto-close', async (req, res) => {
    try {
        const result = await forceAutoClose();
        res.json(result);
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Test endpoint to check if user exists
app.get('/api/test/check-user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { data: user, error } = await db.getUserByEmail(email);
        
        res.json({
            success: true,
            exists: !!user,
            error: error?.message,
            user: user ? {
                email: user.email,
                name: user.name,
                role: user.role,
                hasTemporaryPassword: !!user.temporary_password,
                hasPasswordHash: !!user.password_hash,
                requiresPasswordChange: user.requires_password_change,
                isActive: user.is_active
            } : null
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/login', async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Normalize email to lowercase
        email = email.trim().toLowerCase();

        if (!validators.isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Get user from database
        const { data: user, error } = await db.getUserByEmail(email);

        // console.log(`Login attempt for: ${email}`);
        // console.log('Database query result:', { user: user ? 'Found' : 'Not found', error: error?.message });

        if (error) {
            console.error('Database error during login:', error);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        if (!user) {
            console.log(`User not found in database: ${email}`);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        // console.log('User found:', {
        //     email: user.email,
        //     hasTemporaryPassword: !!user.temporary_password,
        //     hasPasswordHash: !!user.password_hash,
        //     requiresPasswordChange: user.requires_password_change,
        //     status: user.status
        // });

        let passwordMatch = false;

        // Check if this is first-time login with temporary password
        if (user.temporary_password && user.requires_password_change) {
            // Direct comparison for temporary password (plain text)
            passwordMatch = password === user.temporary_password;

            if (passwordMatch) {
                console.log(`✅ First-time login successful for: ${email}`);
            } else {
                console.log(`❌ Temporary password mismatch for: ${email}`);
            }
        }
        // Regular login with hashed password
        else if (user.password_hash) {
            passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (passwordMatch) {
                console.log(`✅ Regular login successful for: ${email}`);
            } else {
                console.log(`❌ Password hash mismatch for: ${email}`);
            }
        }
        // No password set at all
        else {
            console.log(`❌ No password configured for: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Account not properly configured. Please contact administrator.'
            });
        }

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Update last login
        await db.updateLastLogin(user.id);

        // Set tenant context for the session
        if (user.tenant_id) {
            setTenantContext(user.tenant_id, user.id);
            console.log('✅ Tenant context set for:', user.tenant_id);
        }

        // Remove sensitive data before sending response
        const { password_hash, temporary_password, ...userWithoutPassword } = user;

        // Set HttpOnly cookies for authentication
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction, // HTTPS only in production
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
        };

        // Store user session data in cookies
        res.cookie('user_session', JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenant_id: user.tenant_id,
            company_id: user.company_id
        }), cookieOptions);

        // Store authentication token
        res.cookie('auth_token', Buffer.from(`${user.id}:${Date.now()}`).toString('base64'), {
            ...cookieOptions,
            httpOnly: true
        });

        console.log('✅ Cookies set for user:', user.email);

        res.json({
            success: true,
            user: userWithoutPassword,
            requiresPasswordChange: user.requires_password_change || false,
            isFirstLogin: !!user.temporary_password
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Login failed' 
        });
    }
});

// Change password endpoint (for first-time login and password changes)
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and new password are required' 
            });
        }

        // Validate password strength
        const validation = validatePasswordStrength(newPassword);
        
        if (!validation.isValid) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password does not meet security requirements',
                validationErrors: validation.errors,
                passwordStrength: validation.strength,
                passwordScore: validation.score
            });
        }

        // Get user from database
        const { data: user, error } = await db.getUserByEmail(email);

        if (error || !user) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Set tenant context for RLS
        if (user.tenant_id) {
            setTenantContext(user.tenant_id, user.id);
            // console.log('✅ Tenant context set for password change:', user.tenant_id);
        }

        // Verify current password (either temporary or hashed)
        if (currentPassword) {
            let passwordMatch = false;
            
            // Check temporary password for first-time login
            if (user.temporary_password && user.requires_password_change) {
                passwordMatch = currentPassword === user.temporary_password;
            } 
            // Check regular password hash
            else if (user.password_hash) {
                passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
            }
            
            if (!passwordMatch) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Current password is incorrect' 
                });
            }
        }

        // Prevent reusing the same password
        if (user.password_hash) {
            const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'New password must be different from your current password' 
                });
            }
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password in database
        const { data: updatedUser, error: updateError } = await db.updateUserPassword(user.id, passwordHash);

        if (updateError) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to update password' 
            });
        }

        // Remove sensitive data
        const { password_hash, temporary_password, ...userWithoutPassword } = updatedUser;

        // Set HttpOnly cookies for authentication after password change
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction, // HTTPS only in production
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
        };

        // Store user session data in cookies
        res.cookie('user_session', JSON.stringify({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            tenant_id: updatedUser.tenant_id,
            company_id: updatedUser.company_id
        }), cookieOptions);

        // Store authentication token
        res.cookie('auth_token', Buffer.from(`${updatedUser.id}:${Date.now()}`).toString('base64'), {
            ...cookieOptions,
            httpOnly: true
        });

        console.log('✅ Cookies set after password change for user:', updatedUser.email);

        res.json({ 
            success: true, 
            message: 'Password updated successfully',
            user: userWithoutPassword,
            passwordStrength: validation.strength
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to change password' 
        });
    }
});

// Reset password endpoint (admin action)
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }

        // Get current user (admin) from session cookies
        const userSessionCookie = req.cookies.user_session;
        if (!userSessionCookie) {
            return res.status(401).json({ 
                success: false, 
                error: 'Not authenticated' 
            });
        }

        let currentUser;
        try {
            currentUser = JSON.parse(userSessionCookie);
        } catch (parseError) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid session' 
            });
        }

        if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'HR')) {
            return res.status(403).json({ 
                success: false, 
                error: 'Unauthorized: Only admins or HR can reset passwords' 
            });
        }

        // Get target user using admin client (bypasses RLS for password reset operation)
        const { data: targetUser, error } = await db.getUserByIdAdmin(userId);

        if (error || !targetUser) {
            console.error('❌ Failed to get target user:', error);
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Set tenant context
        if (targetUser.tenant_id) {
            setTenantContext(targetUser.tenant_id, currentUser.id);
        }

        // Generate a secure random temporary password
        // Format: 2 uppercase + 6 alphanumeric + 2 special chars (e.g., "AB7k9m2x!@")
        const generateSecurePassword = () => {
            const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            const lowercase = 'abcdefghijkmnpqrstuvwxyz';
            const numbers = '23456789';
            const special = '!@#$%&*';
            
            let password = '';
            // 2 uppercase letters
            password += uppercase[Math.floor(Math.random() * uppercase.length)];
            password += uppercase[Math.floor(Math.random() * uppercase.length)];
            // 3 lowercase letters
            password += lowercase[Math.floor(Math.random() * lowercase.length)];
            password += lowercase[Math.floor(Math.random() * lowercase.length)];
            password += lowercase[Math.floor(Math.random() * lowercase.length)];
            // 2 numbers
            password += numbers[Math.floor(Math.random() * numbers.length)];
            password += numbers[Math.floor(Math.random() * numbers.length)];
            // 1 special character
            password += special[Math.floor(Math.random() * special.length)];
            
            return password;
        };

        const tempPassword = generateSecurePassword();

        // Update user with temporary password (password_hash will be NULL, requires_password_change will be TRUE)
        const { data: updatedUser, error: updateError } = await db.updateUserPassword(targetUser.id, null, tempPassword, true);

        if (updateError) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to reset password' 
            });
        }

        // Send email notification to the employee
        const emailResult = await sendPasswordResetEmail({
            to: targetUser.email,
            employeeName: targetUser.name || targetUser.email,
            tempPassword: tempPassword,
            resetBy: currentUser.name || currentUser.email
        });

        console.log(`✅ Password reset for ${targetUser.email}: Temporary password generated`);
        
        if (emailResult.success) {
            console.log(`📧 Email sent successfully to ${targetUser.email}`);
            res.json({ 
                success: true, 
                message: 'Password reset successfully. Employee will receive an email with a temporary password.' 
            });
        } else {
            // If email fails, we need to show the password to the admin so they can communicate it
            console.error(`⚠️ Email failed for ${targetUser.email}. Temporary password: ${tempPassword}`);
            res.json({ 
                success: true, 
                tempPassword: tempPassword, // Include password in response only if email failed
                message: `Password reset successfully. ⚠️ Email could not be sent. Please provide this temporary password to the employee: ${tempPassword}`,
                emailError: emailResult.message
            });
        }

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to reset password' 
        });
    }
});


// Get current user session (reads HttpOnly cookies)
app.get('/api/auth/me', async (req, res) => {
    try {
        // Check if user_session cookie exists
        const userSessionCookie = req.cookies.user_session;
        const authTokenCookie = req.cookies.auth_token;

        if (!userSessionCookie || !authTokenCookie) {
            return res.json({
                success: false,
                authenticated: false,
                user: null
            });
        }

        // Parse user session data
        let userSession;
        try {
            userSession = JSON.parse(userSessionCookie);
        } catch (parseError) {
            console.error('Failed to parse user session cookie:', parseError);
            return res.json({
                success: false,
                authenticated: false,
                user: null
            });
        }

        // Validate session data
        if (!userSession || !userSession.id || !userSession.email) {
            return res.json({
                success: false,
                authenticated: false,
                user: null
            });
        }

        // Set tenant context first (required for getUserById)
        if (userSession.tenant_id) {
            setTenantContext(userSession.tenant_id, userSession.id);
        }

        // Verify user still exists in database
        const { data: dbUser, error } = await db.getUserById(userSession.id);

        if (error || !dbUser) {
            console.log('User session invalid - user not found in database');
            // Clear invalid cookies
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieOptions = {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'strict',
                path: '/',
                maxAge: 0
            };
            res.clearCookie('user_session', cookieOptions);
            res.clearCookie('auth_token', cookieOptions);

            return res.json({
                success: false,
                authenticated: false,
                user: null
            });
        }

        // Return user data (without sensitive fields)
        const { password_hash, temporary_password, ...userWithoutPassword } = dbUser;

        res.json({
            success: true,
            authenticated: true,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({
            success: false,
            authenticated: false,
            user: null,
            error: 'Session check failed'
        });
    }
});


// Validate password strength (for real-time feedback in UI)
app.post('/api/auth/validate-password', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password is required' 
            });
        }

        const validation = validatePasswordStrength(password);

        res.json({ 
            success: true,
            isValid: validation.isValid,
            errors: validation.errors,
            strength: validation.strength,
            score: validation.score
        });

    } catch (error) {
        console.error('Password validation error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to validate password' 
        });
    }
});


// Initialize user password (for admin creating test user)
app.post('/api/auth/initialize-password', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and password are required' 
            });
        }

        // Get user from database
        const { data: user, error } = await db.getUserByEmail(email);

        if (error || !user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update password in database
        const { data: updatedUser, error: updateError } = await db.updateUserPassword(user.id, passwordHash);

        if (updateError) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to initialize password' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Password initialized successfully'
        });

    } catch (error) {
        console.error('Initialize password error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to initialize password' 
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email, password, and name are required' 
            });
        }

        if (!validators.isValidEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid email format' 
            });
        }

        if (password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password must be at least 8 characters' 
            });
        }

        const { data, error } = await db.signUp(email, password, { name, role });

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            user: data.user 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed' 
        });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    try {
        await db.signOut();

        // Clear authentication cookies
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            path: '/',
            maxAge: 0 // Expire immediately
        };

        res.clearCookie('user_session', cookieOptions);
        res.clearCookie('auth_token', cookieOptions);

        console.log('✅ Cookies cleared for logout');

        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// --- USER MANAGEMENT ENDPOINTS ---
app.get('/api/users', async (req, res) => {
    try {
        const users = await getUsers();
        res.json({ success: true, data: users });
    } catch (error) {
        // console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch users' 
        });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await getUserById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        // console.error('Error fetching user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch user' 
        });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const userData = req.body;

        // Validation
        if (!userData.name || !userData.email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and email are required' 
            });
        }

        // Normalize email to lowercase
        userData.email = userData.email.trim().toLowerCase();

        if (!validators.isValidEmail(userData.email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid email format' 
            });
        }

        if (userData.mobile_money_number && !validators.isValidGhanaPhone(userData.mobile_money_number)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid Ghana phone number format' 
            });
        }

        // Sanitize phone number if provided
        if (userData.mobile_money_number) {
            userData.mobile_money_number = validators.sanitizePhone(userData.mobile_money_number);
        }

        // Get tenant context (set by middleware)
        const tenantId = getCurrentTenantId();
        console.log('Tenant ID from context:', tenantId);
        console.log('Headers received:', req.headers);
        if (!tenantId) {
            return res.status(400).json({ 
                success: false, 
                error: 'No tenant context available' 
            });
        }

        // Check license limit
        const adminClient = getSupabaseAdminClient();
        if (adminClient) {
            // Get current active employee count and license limit
            const { count: activeEmployeeCount } = await adminClient
                .from('opoint_users')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            const { data: company } = await adminClient
                .from('opoint_companies')
                .select('license_count, used_licenses')
                .eq('id', tenantId)
                .single();

            if (company && company.license_count) {
                const currentUsed = activeEmployeeCount || 0;
                const licenseLimit = company.license_count;

                // Check if adding this employee would exceed the limit
                if (currentUsed >= licenseLimit) {
                    return res.status(403).json({
                        success: false,
                        error: 'License limit reached',
                        licenseInfo: {
                            used: currentUsed,
                            limit: licenseLimit,
                            message: `Your company has reached its license limit (${currentUsed}/${licenseLimit} licenses used). Please contact support to increase your license limit.`
                        }
                    });
                }

                // Show warning if approaching limit (90% threshold)
                const usagePercent = (currentUsed / licenseLimit) * 100;
                if (usagePercent >= 90) {
                    console.warn(`License usage warning: ${currentUsed}/${licenseLimit} (${usagePercent.toFixed(1)}%)`);
                }
            }
        }

        // Fetch company name based on tenant_id
        let companyName = null;
        console.log('Looking up company for tenant:', tenantId);
        try {
            const adminClient = getSupabaseAdminClient();
            console.log('Admin client available:', !!adminClient);
            if (adminClient) {
                const { data: companyData, error: companyError } = await adminClient
                    .from('opoint_companies')
                    .select('name')
                    .eq('id', tenantId)
                    .single();
                
                console.log('Company lookup result:', { data: companyData, error: companyError });
                if (!companyError && companyData) {
                    companyName = companyData.name;
                    console.log('Set company name to:', companyName);
                }
            }
        } catch (error) {
            console.log('Company lookup failed:', error.message);
        }

        const { data, error } = await db.createUser({
            ...userData,
            company_name: companyName,
            tenant_id: tenantId,
            created_at: new Date().toISOString()
        });

        if (error) {
            console.error('Database error creating user:', error);
            return res.status(400).json({ 
                success: false, 
                error: `Database error: ${error.message || 'Unknown error'}`,
                code: error.code || 'UNKNOWN'
            });
        }

        // Update used_licenses count (only count active employees)
        if (adminClient && data.is_active !== false) {
            const { count: activeCount } = await adminClient
                .from('opoint_users')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            await adminClient
                .from('opoint_companies')
                .update({ used_licenses: activeCount || 0 })
                .eq('id', tenantId);
        }

        res.status(201).json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ 
            success: false, 
            error: `Server error: ${error.message}`,
            stack: error.stack
        });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const updates = req.body;
        const userId = req.params.id;

        console.log('User update request:', { userId, updates });

        // Normalize email to lowercase if being updated
        if (updates.email) {
            updates.email = updates.email.trim().toLowerCase();
        }

        // Validation
        if (updates.email && !validators.isValidEmail(updates.email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid email format' 
            });
        }

        if (updates.mobile_money_number && !validators.isValidGhanaPhone(updates.mobile_money_number)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid Ghana phone number format' 
            });
        }

        // Sanitize phone number if provided
        if (updates.mobile_money_number) {
            updates.mobile_money_number = validators.sanitizePhone(updates.mobile_money_number);
        }

        const { data, error } = await db.updateUser(userId, {
            ...updates,
            updated_at: new Date().toISOString()
        });

        console.log('User update result:', { data, error });

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        // Update used_licenses if is_active status changed
        if (updates.is_active !== undefined && data) {
            const tenantId = getCurrentTenantId();
            const adminClient = getSupabaseAdminClient();
            if (adminClient && tenantId) {
                const { count: activeCount } = await adminClient
                    .from('opoint_users')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .eq('is_active', true);

                await adminClient
                    .from('opoint_companies')
                    .update({ used_licenses: activeCount || 0 })
                    .eq('id', tenantId);
            }
        }

        // Create notification if mobile money number was updated
        if (updates.mobile_money_number && data) {
            try {
                await db.createNotification({
                    user_id: userId,
                    tenant_id: data.tenant_id,
                    type: 'profile_update',
                    title: 'Profile Updated',
                    message: 'Your mobile money number has been updated by an administrator.',
                    is_read: false,
                    created_at: new Date().toISOString()
                });
                console.log('Notification created for mobile money update');
            } catch (notificationError) {
                console.error('Error creating notification:', notificationError);
                // Don't fail the update if notification creation fails
            }
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update user' 
        });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { error } = await db.deleteUser(req.params.id);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        // Update used_licenses count after deletion
        const tenantId = getCurrentTenantId();
        const adminClient = getSupabaseAdminClient();
        if (adminClient && tenantId) {
            const { count: activeCount } = await adminClient
                .from('opoint_users')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            await adminClient
                .from('opoint_companies')
                .update({ used_licenses: activeCount || 0 })
                .eq('id', tenantId);
        }

        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete user' 
        });
    }
});

// --- COMPANY SETTINGS ENDPOINTS ---
app.get('/api/company/settings', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required'
            });
        }

        // Get current user from cookies
        const currentUser = getCurrentUser(req);
        if (!currentUser) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Only admins can view company settings
        if (currentUser.role !== 'Admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        // Set tenant context
        setTenantContext(tenantId);

        // Get company settings from database
        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available'
            });
        }

        const { data: company, error } = await adminClient
            .from('opoint_companies')
            .select('id, name, working_hours_per_day, break_duration_minutes, license_count, used_licenses, created_at, updated_at')
            .eq('id', tenantId)
            .single();

        if (error) {
            console.error('Error fetching company settings:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch company settings'
            });
        }

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found'
            });
        }

        res.json({
            success: true,
            data: {
                id: company.id,
                name: company.name,
                workingHoursPerDay: company.working_hours_per_day || 8.00,
                break_duration_minutes: company.break_duration_minutes || 60,
                licenseCount: company.license_count || 0,
                usedLicenses: company.used_licenses || 0
            }
        });

    } catch (error) {
        console.error('Error fetching company settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch company settings'
        });
    }
});

app.put('/api/company/settings', async (req, res) => {
    try {
        const { workingHoursPerDay, break_duration_minutes } = req.body;
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required'
            });
        }

        // Get current user from cookies
        const currentUser = getCurrentUser(req);
        if (!currentUser) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Only admins can update company settings
        if (currentUser.role !== 'Admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        // Build update object dynamically
        const updateData = {
            updated_at: new Date().toISOString()
        };

        // Validate and add working hours if provided
        if (workingHoursPerDay !== undefined && workingHoursPerDay !== null) {
            const hours = parseFloat(workingHoursPerDay);
            if (isNaN(hours) || hours < 1 || hours > 24) {
                return res.status(400).json({
                    success: false,
                    error: 'Working hours must be between 1 and 24'
                });
            }
            updateData.working_hours_per_day = hours;
        }

        // Validate and add break duration if provided
        if (break_duration_minutes !== undefined && break_duration_minutes !== null) {
            const breakMins = parseInt(break_duration_minutes);
            if (isNaN(breakMins) || breakMins < 0 || breakMins > 480) {
                return res.status(400).json({
                    success: false,
                    error: 'Break duration must be between 0 and 480 minutes'
                });
            }
            updateData.break_duration_minutes = breakMins;
        }

        // Set tenant context
        setTenantContext(tenantId);

        // Update company settings in database
        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available'
            });
        }

        const { data: company, error } = await adminClient
            .from('opoint_companies')
            .update(updateData)
            .eq('id', tenantId)
            .select('id, name, working_hours_per_day, break_duration_minutes, updated_at')
            .single();

        if (error) {
            console.error('Error updating company settings:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update company settings'
            });
        }

        res.json({
            success: true,
            data: {
                id: company.id,
                name: company.name,
                workingHoursPerDay: company.working_hours_per_day,
                break_duration_minutes: company.break_duration_minutes
            },
            message: 'Company settings updated successfully'
        });

    } catch (error) {
        console.error('Error updating company settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update company settings'
        });
    }
});

// --- PROFILE UPDATE REQUEST ENDPOINTS ---
app.post('/api/profile-update-requests', async (req, res) => {
    try {
        const { field_name, current_value } = req.body;
        let { requested_value } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.body.user_id; // From authenticated user

        if (!tenantId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID and User ID required'
            });
        }

        // Set tenant context
        setTenantContext(tenantId);

        // Get current user info for the request
        const { data: user, error: userError } = await db.getUserById(userId);
        if (userError || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Validate mobile money number format
        if (field_name === 'mobile_money_number' && !validators.isValidGhanaPhone(requested_value)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Ghana phone number format'
            });
        }

        // Sanitize phone number if updating mobile money number
        if (field_name === 'mobile_money_number') {
            requested_value = validators.sanitizePhone(requested_value);
        }

        // Check if there's already a pending request for this field
        const { data: existingRequests, error: checkError } = await db.getProfileUpdateRequests({
            userId: userId,
            status: 'Pending'
        });

        if (checkError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to check existing requests'
            });
        }

        const hasPendingRequest = existingRequests.some(req => req.field_name === field_name);
        if (hasPendingRequest) {
            return res.status(400).json({
                success: false,
                error: `You already have a pending request for ${field_name === 'mobile_money_number' ? 'mobile money number' : field_name} update. Please wait for it to be reviewed.`
            });
        }

        const requestData = {
            user_id: userId,
            employee_name: user.name,
            field_name,
            current_value: current_value || '',
            requested_value,
            requested_by: userId,
            status: 'Pending'
        };

        const { data, error } = await db.createProfileUpdateRequest(requestData);

        if (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error creating profile update request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create profile update request'
        });
    }
});

app.get('/api/profile-update-requests', async (req, res) => {
    try {
        const { status, userId } = req.query;
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required'
            });
        }

        // Set tenant context
        setTenantContext(tenantId);

        const filters = {};
        if (status) filters.status = status;
        filters.userId = userId;

        const { data, error } = await db.getProfileUpdateRequests(filters);

        if (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error fetching profile update requests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile update requests'
        });
    }
});

app.put('/api/profile-update-requests/:id/approve', async (req, res) => {
    try {
        const requestId = req.params.id;
        const { review_notes } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const reviewerId = req.body.reviewer_id; // From authenticated user

        if (!tenantId || !reviewerId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID and Reviewer ID required'
            });
        }

        // Set tenant context
        setTenantContext(tenantId);

        const { data, error } = await db.approveProfileUpdateRequest(requestId, reviewerId, review_notes);

        if (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error approving profile update request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve profile update request'
        });
    }
});

app.put('/api/profile-update-requests/:id/reject', async (req, res) => {
    try {
        const requestId = req.params.id;
        const { review_notes } = req.body;
        const tenantId = req.headers['x-tenant-id'];
        const reviewerId = req.body.reviewer_id; // From authenticated user

        if (!tenantId || !reviewerId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID and Reviewer ID required'
            });
        }

        // Set tenant context
        setTenantContext(tenantId);

        const { data, error } = await db.rejectProfileUpdateRequest(requestId, reviewerId, review_notes);

        if (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error rejecting profile update request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject profile update request'
        });
    }
});

// Cancel profile update request (for users to cancel their own requests)
app.put('/api/profile-update-requests/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID and User ID required'
            });
        }

        // Set tenant context
        setTenantContext(tenantId);

        // Verify the request belongs to the user
        const { data: request, error: fetchError } = await db.getProfileUpdateRequestById(id);
        if (fetchError || !request) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }

        if (request.user_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You can only cancel your own requests'
            });
        }

        if (request.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                error: 'Only pending requests can be cancelled'
            });
        }

        const { data, error } = await db.cancelProfileUpdateRequest(id, userId);

        if (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error cancelling profile update request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel profile update request'
        });
    }
});

// --- PAYROLL ENDPOINTS ---
app.get('/api/payroll/payable-employees', async (req, res) => {
    try {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required'
            });
        }

        const users = await getUsers();

        // Get company working hours
        let workingHoursPerDay = 8.00; // Default
        try {
            const adminClient = getSupabaseAdminClient();
            if (adminClient) {
                const { data: company } = await adminClient
                    .from('opoint_companies')
                    .select('working_hours_per_day')
                    .eq('id', tenantId)
                    .single();
                if (company && company.working_hours_per_day) {
                    workingHoursPerDay = company.working_hours_per_day;
                }
            }
        } catch (error) {
            console.log('Could not fetch company working hours, using default:', error.message);
        }

        // Get payroll history from database
        const { data: historyData } = await db.getPayrollHistory({
            month: currentMonth + 1,
            year: currentYear
        });

        const payableEmployees = await Promise.all(users.map(async (user) => {
            // Calculate actual hours worked for this user
            const actualHoursWorked = await calculateHoursWorked(user.id, tenantId, new Date());

            // Use proper tax calculations with hours-based pay
            const payCalculation = calculateNetPay(
                user.basicSalary || 0,
                user.id,
                new Date(),
                workingHoursPerDay,
                actualHoursWorked
            );
            const netPay = payCalculation.netPay;

            // Check if paid this month (from database or fallback)
            let paymentLog;

            if (historyData && historyData.length > 0) {
                paymentLog = historyData.find(log =>
                    log.user_id === user.id &&
                    (log.status === 'SUCCESS' || log.status === 'PENDING')
                );
            } else {
                // Fallback to in-memory
                paymentLog = PAYROLL_HISTORY.find(log => {
                    const logDate = new Date(log.date);
                    return log.userId === user.id &&
                           logDate.getMonth() === currentMonth &&
                           logDate.getFullYear() === currentYear &&
                           (log.status === 'SUCCESS' || log.status === 'PENDING');
                });
            }

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                mobileMoneyNumber: user.mobileMoneyNumber,
                netPay: netPay,
                basicSalary: user.basicSalary,
                grossPay: payCalculation.grossPay,
                totalDeductions: payCalculation.totalDeductions,
                ssnitEmployee: payCalculation.ssnitEmployee,
                paye: payCalculation.paye,
                otherDeductions: payCalculation.otherDeductions,
                hoursWorked: actualHoursWorked,
                expectedHoursThisMonth: payCalculation.expectedHoursThisMonth,
                hourlyRate: payCalculation.hourlyRate,
                workingHoursPerDay: workingHoursPerDay,
                isPaid: !!paymentLog,
                paidAmount: paymentLog ? paymentLog.amount : 0,
                paidDate: paymentLog ? paymentLog.created_at || paymentLog.date : null,
                paidReason: paymentLog ? paymentLog.reason : null
            };
        }));

        res.json({
            success: true,
            data: payableEmployees
        });

    } catch (error) {
        console.error("Error fetching payables:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch payable employees"
        });
    }
});

app.get('/api/payroll/history', async (req, res) => {
    try {
        const { userId, month, year } = req.query;

        const filters = {};
        if (userId) filters.userId = userId;
        if (month && year) {
            filters.month = parseInt(month);
            filters.year = parseInt(year);
        }

        const { data, error } = await db.getPayrollHistory(filters);

        if (error) {
            // Fallback to in-memory
            let history = PAYROLL_HISTORY;
            
            if (userId) {
                history = history.filter(h => h.userId === userId);
            }
            
            return res.json({ 
                success: true, 
                data: history,
                source: 'fallback' 
            });
        }

        res.json({ 
            success: true, 
            data,
            source: 'database' 
        });

    } catch (error) {
        console.error("Error fetching payroll history:", error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to fetch payroll history" 
        });
    }
});


app.get('/api/payslips/:userId/:date', async (req, res) => {
    try {
        const { userId, date } = req.params;
        const { forceRefresh } = req.query; // Allow manual cache bypass
        const tenantId = req.headers['x-tenant-id'];

        // console.log('Payslip request:', { userId, date, tenantId, forceRefresh });

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required'
            });
        }

        // Check cache first (unless force refresh requested)
        if (!forceRefresh) {
            const cached = getCachedPayslip(userId, date);
            if (cached) {
                return res.json({
                    success: true,
                    data: cached.payslip,
                    cached: true,
                    cachedAt: new Date(cached.calculatedAt).toISOString(),
                    cacheExpiresIn: Math.max(0, CACHE_DURATION_MS - (Date.now() - cached.calculatedAt))
                });
            }
        }

        // Parse the date (expected format: ISO string)
        const payDate = new Date(date);
        if (isNaN(payDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format'
            });
        }

        // Get employee data from opoint_users table using database service
        // console.log('Fetching user:', userId);
        const { data: employee, error: employeeError } = await db.getUserById(userId);

        // console.log('User fetch result:', { employee, error: employeeError });

        if (employeeError || !employee) {
            return res.status(404).json({
                success: false,
                error: 'Employee not found'
            });
        }

        const basicSalary = parseFloat(employee.basicSalary) || 0;


        // Check if employee has salary set
        if (basicSalary === 0) {
            return res.status(400).json({
                success: false,
                error: 'Employee salary not set. Please set a salary for this employee before generating payslip.',
                requiresSalarySetup: true,
                defaultSalary: 1
            });
        }

        // Calculate pay period (assuming monthly, last day of previous month to current date)
        const payPeriodEnd = new Date(payDate);
        const payPeriodStart = new Date(payPeriodEnd.getFullYear(), payPeriodEnd.getMonth() - 1, payPeriodEnd.getDate() + 1);

        // Get company working hours
        let workingHoursPerDay = 8.00; // Default
        try {
            const adminClient = getSupabaseAdminClient();
            if (adminClient) {
                const { data: company } = await adminClient
                    .from('opoint_companies')
                    .select('working_hours_per_day')
                    .eq('id', tenantId)
                    .single();
                if (company && company.working_hours_per_day) {
                    workingHoursPerDay = company.working_hours_per_day;
                }
            }
        } catch (error) {
            console.log('Could not fetch company working hours, using default:', error.message);
        }

        // Calculate actual hours worked for this user (includes approved adjustments)
        const actualHoursWorked = await calculateHoursWorked(userId, tenantId, payDate);
        console.log(`📊 Payslip calculation for user ${userId}, payDate: ${payDate.toISOString()}, actualHoursWorked: ${actualHoursWorked}`);

        // Use calculateNetPay function which handles hours-based calculation
        const payCalculation = calculateNetPay(
            basicSalary,
            userId,
            payDate,
            workingHoursPerDay,
            actualHoursWorked
        );

        // Get other deductions from payroll history for this pay period
        const { data: payrollHistory, error: historyError } = await db.getPayrollHistory({
            userId: userId,
            month: payDate.getMonth() + 1,
            year: payDate.getFullYear()
        });

        const otherDeductions = [];
        if (!historyError && payrollHistory) {
            // Filter for deduction entries (negative amounts or specific reasons)
            payrollHistory.forEach(record => {
                if (record.amount < 0 || record.reason?.toLowerCase().includes('deduction')) {
                    otherDeductions.push({
                        description: record.reason || 'Other Deduction',
                        amount: Math.abs(record.amount)
                    });
                }
            });
        }
        
        // Add hours-based deductions from payCalculation
        if (payCalculation.otherDeductions && Array.isArray(payCalculation.otherDeductions)) {
            otherDeductions.push(...payCalculation.otherDeductions);
        }

        // Use calculated values from calculateNetPay
        const grossPay = payCalculation.grossPay;
        const netPay = payCalculation.netPay;
        const totalDeductions = payCalculation.totalDeductions + otherDeductions.reduce((sum, d) => sum + d.amount, 0);
        const ssnitEmployee = payCalculation.ssnitEmployee;
        const paye = payCalculation.paye;

        // Calculate SSNIT employer contribution and tiers for reporting
        // NOTE: Employer contributions are based on GROSS PAY, not basic salary
        const ssnitEmployer = grossPay * 0.13;  // 13%
        const applicableSalary = Math.min(grossPay, 1500); // SSNIT ceiling
        const ssnitTier1 = applicableSalary * 0.135; // 13.5% to SSNIT
        const ssnitTier2 = applicableSalary * 0.05;  // 5% to private fund

        // Build payslip object
        const payslip = {
            id: `${userId}_${payDate.toISOString().split('T')[0]}`,
            userId: userId,
            payPeriodStart: payPeriodStart.toISOString(),
            payPeriodEnd: payDate.toISOString(),
            payDate: payDate.toISOString(),
            basicSalary: basicSalary,
            grossPay: grossPay,
            netPay: netPay,
            totalDeductions: totalDeductions,
            ssnitEmployee: ssnitEmployee,
            paye: paye,
            otherDeductions: otherDeductions,
            hoursDeduction: payCalculation.hoursDeduction,
            ssnitEmployer: ssnitEmployer,
            ssnitTier1: ssnitTier1,
            ssnitTier2: ssnitTier2
        };

        // Cache the calculated payslip for 2 hours
        const calculatedAt = Date.now();
        const cacheData = {
            payslip,
            calculatedAt
        };
        setCachedPayslip(userId, date, cacheData);

        res.json({
            success: true,
            data: payslip,
            cached: false,
            calculatedAt: new Date(calculatedAt).toISOString(),
            cacheExpiresIn: CACHE_DURATION_MS
        });

    } catch (error) {
        console.error('Error generating payslip:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate payslip'
        });
    }
});


app.post('/api/payroll/pay', async (req, res) => {
    try {
        const { payments, password } = req.body;

        // Validation
        if (!password || password !== CONFIG.APPROVAL_PASSWORD) {
            return res.status(401).json({ 
                success: false, 
                error: 'Incorrect approval password.' 
            });
        }

        if (!payments || !Array.isArray(payments) || payments.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid payments data' 
            });
        }

        // Enrich payments with mobile money numbers
        const users = await getUsers();
        const enrichedPayments = payments.map(p => {
            const user = users.find(u => u.id === p.userId);
            
            if (!user) {
                throw new Error(`User not found: ${p.userId}`);
            }

            return { 
                ...p, 
                mobileMoneyNumber: user.mobile_money_number || user.mobileMoneyNumber 
            };
        });

        // Process batch payments
        const results = await momoService.processBatch(enrichedPayments);

        // Calculate summary
        const summary = {
            total: results.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failed').length
        };

        res.json({ 
            success: true, 
            data: results,
            summary
        });

    } catch (error) {
        console.error("Payroll processing error:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message || "Payroll processing failed" 
        });
    }
});

// --- LEAVE MANAGEMENT ENDPOINTS ---
app.get('/api/leave/requests', async (req, res) => {
    try {
        const { status, userId } = req.query;
        const tenantId = req.headers['x-tenant-id'];
        
        const filters = {};
        if (status) filters.status = status;
        if (userId) filters.userId = userId;

        const { data, error } = await db.getLeaveRequests(filters, tenantId);

        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch leave requests' 
            });
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch leave requests' 
        });
    }
});

app.post('/api/leave/requests', async (req, res) => {
    try {
        const leaveData = req.body;
        const tenantId = req.headers['x-tenant-id'];

        console.log('Creating leave request:', { leaveData, tenantId });

        // Set tenant context
        if (tenantId) {
            setTenantContext(tenantId);
            // console.log('Tenant context set to:', tenantId);
        }

        // Validation
        if (!leaveData.user_id || !leaveData.start_date || !leaveData.end_date || !leaveData.reason) {
            console.log('Validation failed - missing fields:', {
                user_id: !!leaveData.user_id,
                start_date: !!leaveData.start_date,
                end_date: !!leaveData.end_date,
                reason: !!leaveData.reason
            });
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        const { data, error } = await db.createLeaveRequest({
            ...leaveData,
            status: 'Pending',
            created_at: new Date().toISOString()
        });

        if (error) {
            console.log('Database error:', error);
            return res.status(400).json({ 
                success: false, 
                error: `Database error: ${error.message}`,
                details: error
            });
        }

        console.log('Leave request created successfully:', data.id);
        res.status(201).json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error creating leave request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create leave request' 
        });
    }
});

app.put('/api/leave/requests/:id', async (req, res) => {
    try {
        const updates = req.body;
        const leaveId = req.params.id;
        const tenantId = req.headers['x-tenant-id'];

        const { data, error } = await db.updateLeaveRequest(leaveId, updates, tenantId);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error updating leave request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update leave request' 
        });
    }
});

// --- LEAVE BALANCE ENDPOINTS ---
app.get('/api/leave/balances/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const tenantId = req.headers['x-tenant-id'];

        const { data, error } = await db.getLeaveBalances(employeeId, tenantId);

        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch leave balances'
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error fetching leave balances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leave balances'
        });
    }
});

app.put('/api/leave/balances/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { leaveType, usedDays } = req.body;
        const tenantId = req.headers['x-tenant-id'];

        const { data, error } = await db.updateLeaveBalance(employeeId, leaveType, usedDays, tenantId);

        if (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error updating leave balance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update leave balance'
        });
    }
});

app.post('/api/leave/balances/:employeeId/initialize', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { leaveType, totalDays } = req.body;
        const tenantId = req.headers['x-tenant-id'];

        const { data, error } = await db.initializeLeaveBalance(employeeId, leaveType, totalDays, tenantId);

        if (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Error initializing leave balance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize leave balance'
        });
    }
});

// --- EXPENSE CLAIM ENDPOINTS ---
app.get('/api/expenses', async (req, res) => {
    try {
        const { status, employee_id } = req.query;
        const tenantId = req.headers['x-tenant-id'];

        const filters = {};
        if (status) filters.status = status;
        if (employee_id) filters.employee_id = employee_id;

        const { data, error } = await db.getExpenseClaims(filters, tenantId);

        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch expense claims'
            });
        }

        res.json({
            success: true,
            data: data || []
        });
    } catch (error) {
        console.error('Error fetching expense claims:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch expense claims'
        });
    }
});

app.post('/api/expenses', async (req, res) => {
    try {
        const { employee_id, employee_name, description, amount, expense_date, receipt_url } = req.body;
        const tenantId = req.headers['x-tenant-id'];

        // console.log('Creating expense claim:', { employee_id, description, amount, tenantId });

        const { data, error } = await db.createExpenseClaim({
            employee_id,
            employee_name,
            description,
            amount: parseFloat(amount),
            expense_date,
            receipt_url
        });

        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create expense claim'
            });
        }

        console.log('Expense claim created successfully:', data.id);
        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        // console.error('Error creating expense claim:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create expense claim'
        });
    }
});

app.put('/api/expenses/:id', async (req, res) => {
    try {
        const claimId = req.params.id;
        const { status, reviewed_by } = req.body;
        const tenantId = req.headers['x-tenant-id'];

        const updates = {};
        if (status) updates.status = status;
        if (reviewed_by) updates.reviewed_by = reviewed_by;

        // If approving, add to salary
        if (status === 'approved') {
            // Get the expense claim details
            const { data: claim, error: fetchError } = await db.getExpenseClaims({ employee_id: null }, tenantId);
            if (fetchError) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch expense claim details'
                });
            }

            const expenseClaim = claim.find(c => c.id === claimId);
            if (!expenseClaim) {
                return res.status(404).json({
                    success: false,
                    error: 'Expense claim not found'
                });
            }

            // Update employee's basic salary
            const { data: userData, error: userError } = await db.getUserById(expenseClaim.employee_id);
            if (userError || !userData) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch employee data'
                });
            }

            const newSalary = parseFloat(userData.basicSalary || 0) + parseFloat(expenseClaim.amount);
            const { error: salaryError } = await db.updateUserSalary(expenseClaim.employee_id, newSalary);
            if (salaryError) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to update employee salary'
                });
            }
        }

        const { data, error } = await db.updateExpenseClaim(claimId, updates, tenantId);

        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update expense claim'
            });
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error updating expense claim:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update expense claim'
        });
    }
});

// --- TIME ADJUSTMENT ENDPOINTS ---
app.get('/api/time-adjustments', async (req, res) => {
    try {
        const { status, userId } = req.query;
        const tenantId = req.headers['x-tenant-id'];

        const filters = {};
        if (status) filters.status = status;
        if (userId) filters.userId = userId;

        const { data, error } = await db.getTimeAdjustmentRequests(filters, tenantId);

        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch time adjustment requests' 
            });
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error fetching time adjustment requests:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch time adjustment requests' 
        });
    }
});

app.post('/api/time-adjustments', async (req, res) => {
    try {
        const adjustmentData = req.body;
        const tenantId = req.headers['x-tenant-id'];

        console.log('📥 Time adjustment request received:', JSON.stringify(adjustmentData, null, 2));

        // Set tenant context
        if (tenantId) {
            setTenantContext(tenantId);
        }

        // Validation
        if (!adjustmentData.userId || !adjustmentData.requestedClockIn || !adjustmentData.requestedClockOut || !adjustmentData.reason) {
            console.log('❌ Validation failed - missing required fields');
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        console.log('✅ Validation passed, calling db.createTimeAdjustmentRequest');
        const { data, error } = await db.createTimeAdjustmentRequest(adjustmentData);

        console.log('Database response:', { 
            success: !!data, 
            hasError: !!error,
            errorMessage: error?.message || error
        });

        if (error) {
            console.error('❌ Failed to create time adjustment:', error);
            return res.status(400).json({ 
                success: false, 
                error: error.message || error
            });
        }

        console.log('✅ Time adjustment created successfully');
        res.status(201).json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error creating time adjustment request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create time adjustment request' 
        });
    }
});

app.put('/api/time-adjustments/:id', async (req, res) => {
    try {
        const updates = req.body;
        const adjustmentId = req.params.id;
        const tenantId = req.headers['x-tenant-id'];

        const { data, error } = await db.updateTimeAdjustmentRequest(adjustmentId, updates, tenantId);

        if (error) {
            console.log('Update time adjustment error:', error);
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error updating time adjustment request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update time adjustment request' 
        });
    }
});

// --- PROFILE UPDATE REQUESTS ENDPOINTS ---

app.put('/api/profile-update-requests/:id/approve', async (req, res) => {
    try {
        const { reviewer_id, review_notes } = req.body;
        const requestId = req.params.id;
        const tenantId = req.headers['x-tenant-id'];

        const { data, error } = await db.approveProfileUpdateRequest(requestId, reviewer_id, review_notes, tenantId);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error approving profile update request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to approve profile update request' 
        });
    }
});

app.put('/api/profile-update-requests/:id/reject', async (req, res) => {
    try {
        const { reviewer_id, review_notes } = req.body;
        const requestId = req.params.id;
        const tenantId = req.headers['x-tenant-id'];

        const { data, error } = await db.rejectProfileUpdateRequest(requestId, reviewer_id, review_notes, tenantId);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error rejecting profile update request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to reject profile update request' 
        });
    }
});

app.put('/api/profile-update-requests/:id/cancel', async (req, res) => {
    try {
        const { userId } = req.body;
        const requestId = req.params.id;
        const tenantId = req.headers['x-tenant-id'];

        const { data, error } = await db.cancelProfileUpdateRequest(requestId, userId, tenantId);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error cancelling profile update request:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cancel profile update request' 
        });
    }
});

// --- COMPANY MANAGEMENT ENDPOINTS ---
app.get('/api/companies', async (req, res) => {
    try {
        const { data, error } = await db.getCompanies();

        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch companies' 
            });
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch companies' 
        });
    }
});

app.post('/api/companies', async (req, res) => {
    try {
        const companyData = req.body;

        // Validation
        if (!companyData.name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Company name is required' 
            });
        }

        const { data, error } = await db.createCompany({
            ...companyData,
            created_at: new Date().toISOString()
        });

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.status(201).json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error creating company:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create company' 
        });
    }
});

// --- ANNOUNCEMENTS ENDPOINTS ---
app.get('/api/announcements', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        const { data, error } = await db.getAnnouncements(userId);

        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch announcements'
            });
        }

        // If no data from database, fall back to constants for development
        let announcementsData = data;
        if (!data || data.length === 0) {
            announcementsData = MOCK_ANNOUNCEMENTS.map(ann => ({
                ...ann,
                readBy: [] // Add empty readBy for mock data
            }));
        }

        res.json({ success: true, data: announcementsData });

    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch announcements'
        });
    }
});

app.post('/api/announcements', async (req, res) => {
    try {
        const { title, content, imageUrl, author_id, author_name } = req.body;

        // Validation
        if (!title || !content) {
            return res.status(400).json({ 
                success: false, 
                error: 'Title and content are required' 
            });
        }

        // Use author info from request body
        const announcementData = {
            title,
            content,
            author_id: author_id || 'system',
            author_name: author_name || 'System',
            image_url: imageUrl,
            created_at: new Date().toISOString()
        };

        const { data, error } = await db.createAnnouncement(announcementData);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        // Create notifications for all employees
        await createNotificationsForAnnouncement(data);

        res.status(201).json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create announcement' 
        });
    }
});

app.post('/api/announcements/mark-read', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        const { error } = await db.markAnnouncementsAsRead(userId);

        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to mark announcements as read'
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error marking announcements as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark announcements as read'
        });
    }
});

app.delete('/api/announcements/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await db.deleteAnnouncement(id);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete announcement' 
        });
    }
});

app.put('/api/announcements/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await db.updateAnnouncement(id, updates);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update announcement' 
        });
    }
});

app.delete('/api/announcements/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await db.deleteAnnouncement(id);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete announcement' 
        });
    }
});

// --- TIME PUNCHES ENDPOINTS ---
app.post('/api/time-punches', async (req, res) => {
    try {
        const { userId, companyId, type, timestamp, location, photoUrl } = req.body;

        if (!userId || !companyId || !type || !timestamp) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        // Get user and company info
        const { data: user, error: userError } = await db.getUserById(userId);
        if (userError || !user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const { data: company, error: companyError } = await db.getCompanyById(companyId);
        if (companyError || !company) {
            return res.status(404).json({ 
                success: false, 
                error: 'Company not found' 
            });
        }

        // Use new one-row-per-day architecture
        const punchData = {
            tenant_id: companyId,
            company_name: company.name,
            employee_id: userId,
            employee_name: user.name,
            type: type, // 'clock_in' or 'clock_out'
            timestamp: timestamp,
            location: location || null,
            photo_url: photoUrl || null
        };

        // createOrUpdateClockLog handles both clock in and clock out
        const { data, error } = await db.createOrUpdateClockLog(punchData);
        
        if (error) {
            console.error('Error saving time punch:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to save time punch' 
            });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('Error saving time punch:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save time punch' 
        });
    }
});

app.get('/api/time-entries', async (req, res) => {
    try {
        const { userId, date } = req.query;
        const tenantId = req.headers['x-tenant-id'];

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'userId is required' 
            });
        }

        const { data, error } = await db.getClockLogs(userId, date);

        if (error) {
            console.error('Database error fetching time entries:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch time entries' 
            });
        }

        // Filter entries by date if specified
        let filteredData = data;
        if (date) {
            filteredData = data.filter(entry => {
                const clockInDate = entry.clock_in ? entry.clock_in.split('T')[0] : null;
                const clockOutDate = entry.clock_out ? entry.clock_out.split('T')[0] : null;
                
                // Include entry if either clock_in or clock_out is on the target date
                return clockInDate === date || clockOutDate === date;
            });
        }

        // Exclude adjustment request entries from time entries
        filteredData = filteredData.filter(entry => !entry.adjustment_status);

        // Transform to TimeEntry format
        const timeEntries = filteredData.map(entry => ({
            id: entry.id,
            userId: entry.employee_id,
            type: entry.clock_out ? 'clock_out' : 'clock_in',
            timestamp: entry.clock_in || entry.clock_out,
            location: entry.location,
            photoUrl: entry.photo_url,
            synced: true
        }));

        res.json({ 
            success: true, 
            data: timeEntries 
        });

    } catch (error) {
        console.error('Error fetching time entries:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch time entries' 
        });
    }
});

// --- TIME ADJUSTMENT REQUESTS ENDPOINTS ---
app.get('/api/time-adjustments', async (req, res) => {
    try {
        const { status, userId } = req.query;
        const tenantId = req.headers['x-tenant-id'];
        
        const filters = {};
        if (status) filters.status = status;
        if (userId) filters.userId = userId;

        const { data, error } = await db.getTimeAdjustmentRequests(filters, tenantId);

        if (error) {
            console.error('Database error fetching time adjustments:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch time adjustment requests',
                details: error.message
            });
        }

        res.json({ 
            success: true, 
            data 
        });

    } catch (error) {
        console.error('Error fetching time adjustment requests:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch time adjustment requests',
            details: error.message
        });
    }
});

// --- NOTIFICATIONS ENDPOINTS ---
app.get('/api/notifications', async (req, res) => {
    try {
        // Get user ID from headers
        const userId = req.headers['x-user-id'];
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }

        const { data, error } = await db.getNotifications(userId);

        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch notifications' 
            });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch notifications' 
        });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'];
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }

        const { data, error } = await db.markNotificationAsRead(id, userId);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to mark notification as read' 
        });
    }
});

app.put('/api/notifications/mark-all-read', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }

        const { error } = await db.markAllNotificationsAsRead(userId);

        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to mark notifications as read' 
        });
    }
});

app.get('/api/notifications/unread-count', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }

        const { data, error } = await db.getUnreadNotificationCount(userId);

        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to get unread count' 
            });
        }

        res.json({ success: true, count: data });

    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get unread count' 
        });
    }
});

// Helper function to create notifications for all employees when an announcement is posted
async function createNotificationsForAnnouncement(announcement) {
    try {
        // Get all employees in the tenant
        const { data: employees, error } = await db.getUsers();
        
        if (error || !employees) {
            console.error('Error fetching employees for notifications:', error);
            return;
        }

        // Create notifications for each employee
        const notifications = employees
            .filter(employee => employee.role !== 'SuperAdmin') // Don't notify super admins
            .map(employee => ({
                user_id: employee.id,
                announcement_id: announcement.id,
                type: 'announcement',
                title: `New Announcement: ${announcement.title}`,
                message: `A new announcement has been posted by ${announcement.author_name}`,
                created_at: new Date().toISOString()
            }));

        // Create notifications in batch
        for (const notification of notifications) {
            await db.createNotification(notification);
        }

        console.log(`Created ${notifications.length} notifications for announcement`);

        // Send push notifications
        for (const employee of employees.filter(employee => employee.role !== 'SuperAdmin')) {
            try {
                await sendPushNotification(employee.id, {
                    title: `New Announcement: ${announcement.title}`,
                    body: `A new announcement has been posted by ${announcement.author_name}`,
                    icon: '/favicon.svg',
                    data: { url: '/announcements', announcementId: announcement.id }
                });
            } catch (pushError) {
                console.error(`Failed to send push to user ${employee.id}:`, pushError);
            }
        }

    } catch (error) {
        console.error('Error creating notifications for announcement:', error);
    }
}

// --- REPORTS ENDPOINTS ---
app.get('/api/reports', async (req, res) => {
    try {
        const { type, userId } = req.query;
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID required'
            });
        }

        // Get current user from cookies
        const currentUser = getCurrentUser(req);
        if (!currentUser) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Set tenant context
        setTenantContext(tenantId);

        let reportData = [];
        const hasFullAccess = hasFullReportAccess(currentUser.role);

        switch (type) {
            case 'ssnit':
                // SSNIT Contribution Report
                const users = await getUsers();
                let ssnitData = users.map(user => {
                    const basicSalary = parseFloat(user.basicSalary) || 0;
                    // NOTE: Contributions are based on GROSS PAY, not basic salary
                    // For report purposes, we use basic salary as gross pay (no hours adjustment in reports)
                    const grossPay = basicSalary;
                    const ssnitEmployee = grossPay * 0.055; // 5.5%
                    const ssnitEmployer = grossPay * 0.13;  // 13%
                    const applicableSalary = Math.min(grossPay, 1500); // SSNIT ceiling
                    const ssnitTier1 = applicableSalary * 0.135; // 13.5% to SSNIT
                    const ssnitTier2 = applicableSalary * 0.05;  // 5% to private fund

                    return {
                        employee_id: user.id,
                        employee_name: user.name,
                        basic_salary: basicSalary,
                        ssnit_employee: ssnitEmployee,
                        ssnit_employer: ssnitEmployer,
                        ssnit_tier1: ssnitTier1,
                        ssnit_tier2: ssnitTier2,
                        total_ssnit: ssnitEmployee + ssnitEmployer
                    };
                });

                // Filter data based on user role and userId parameter
                if (userId) {
                    ssnitData = ssnitData.filter(item => item.employee_id === userId);
                } else if (!hasFullAccess) {
                    ssnitData = ssnitData.filter(item => item.employee_id === currentUser.id);
                }
                reportData = ssnitData;
                break;

            case 'paye':
                // PAYE Tax Report
                const payeUsers = await getUsers();
                let payeData = payeUsers.map(user => {
                    const basicSalary = parseFloat(user.basicSalary) || 0;
                    let paye = 0;
                    const taxableIncome = basicSalary;

                    if (taxableIncome <= 3828) {
                        paye = 0;
                    } else if (taxableIncome <= 4828) {
                        paye = (taxableIncome - 3828) * 0.05;
                    } else if (taxableIncome <= 5828) {
                        paye = 1000 * 0.05 + (taxableIncome - 4828) * 0.10;
                    } else if (taxableIncome <= 6828) {
                        paye = 1000 * 0.05 + 1000 * 0.10 + (taxableIncome - 5828) * 0.175;
                    } else {
                        paye = 1000 * 0.05 + 1000 * 0.10 + 1000 * 0.175 + (taxableIncome - 6828) * 0.25;
                    }

                    return {
                        employee_id: user.id,
                        employee_name: user.name,
                        basic_salary: basicSalary,
                        taxable_income: taxableIncome,
                        paye_tax: paye
                    };
                });

                // Filter data based on user role and userId parameter
                if (userId) {
                    payeData = payeData.filter(item => item.employee_id === userId);
                } else if (!hasFullAccess) {
                    payeData = payeData.filter(item => item.employee_id === currentUser.id);
                }
                reportData = payeData;
                break;

            case 'attendance':
                // Attendance Summary Report
                const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
                const currentYear = year ? parseInt(year) : new Date().getFullYear();

                // Get company break duration setting
                let breakDurationMinutes = 60; // Default
                try {
                    const adminClient = getSupabaseAdminClient();
                    if (adminClient) {
                        const { data: company } = await adminClient
                            .from('opoint_companies')
                            .select('break_duration_minutes')
                            .eq('id', tenantId)
                            .single();
                        if (company && company.break_duration_minutes !== undefined && company.break_duration_minutes !== null) {
                            breakDurationMinutes = company.break_duration_minutes;
                        }
                    }
                } catch (error) {
                    console.log('Could not fetch company break duration for report, using default');
                }

                // Get all clock logs for the month
                const { data: clockLogs, error: logsError } = await db.getClockLogsForReport(tenantId, currentMonth, currentYear);

                if (logsError) {
                    console.error('Error fetching clock logs:', logsError);
                    reportData = []; // Return empty array instead of failing
                } else {
                    // Group by employee and date, then calculate totals with break deduction
                    const employeeDataMap = new Map();

                    // First, organize logs by employee and date
                    const employeeDateLogs = {};
                    clockLogs.forEach(log => {
                        const employeeId = log.employee_id;
                        if (!employeeDateLogs[employeeId]) {
                            employeeDateLogs[employeeId] = {
                                employee_name: log.employee_name,
                                dateEntries: {}
                            };
                        }

                        if (log.clock_in && log.clock_out) {
                            const clockInDate = new Date(log.clock_in);
                            const dateKey = clockInDate.toDateString();
                            
                            if (!employeeDateLogs[employeeId].dateEntries[dateKey]) {
                                employeeDateLogs[employeeId].dateEntries[dateKey] = [];
                            }
                            employeeDateLogs[employeeId].dateEntries[dateKey].push(log);
                        }
                    });

                    // Calculate hours for each employee with break deduction logic
                    Object.keys(employeeDateLogs).forEach(employeeId => {
                        const employeeData = employeeDateLogs[employeeId];
                        let totalHours = 0;
                        let presentDays = 0;

                        Object.keys(employeeData.dateEntries).forEach(dateKey => {
                            const dayEntries = employeeData.dateEntries[dateKey];
                            let dayTotalMs = 0;

                            // Check if any entry has multi-session fields
                            const hasMultiSession = dayEntries.some(log => log.clock_in_2 || log.clock_out_2);

                            if (hasMultiSession) {
                                // Multi-session day (break tracking)
                                dayEntries.forEach(log => {
                                    // Session 1
                                    if (log.clock_in && log.clock_out) {
                                        const clockIn = new Date(log.clock_in);
                                        const clockOut = new Date(log.clock_out);
                                        dayTotalMs += clockOut.getTime() - clockIn.getTime();
                                    }
                                    // Session 2
                                    if (log.clock_in_2 && log.clock_out_2) {
                                        const clockIn2 = new Date(log.clock_in_2);
                                        const clockOut2 = new Date(log.clock_out_2);
                                        dayTotalMs += clockOut2.getTime() - clockIn2.getTime();
                                    }
                                });
                                // No automatic break for multi-session days
                            } else {
                                // Sum all sessions for the day
                                dayEntries.forEach(log => {
                                    const clockIn = new Date(log.clock_in);
                                    const clockOut = new Date(log.clock_out);
                                    const sessionMs = clockOut.getTime() - clockIn.getTime();
                                    dayTotalMs += sessionMs;
                                });

                                // Apply break deduction (consistent with frontend and backend calculations)
                                const isSingleSession = dayEntries.length === 1;
                                const minimumHoursForBreak = 7 * 60 * 60 * 1000; // 7 hours
                                
                                if (isSingleSession && breakDurationMinutes > 0 && dayTotalMs >= minimumHoursForBreak) {
                                    const breakMs = breakDurationMinutes * 60 * 1000;
                                    dayTotalMs = Math.max(0, dayTotalMs - breakMs);
                                }
                            }

                            const dayHours = dayTotalMs / (1000 * 60 * 60);
                            totalHours += dayHours;
                            if (dayHours > 0) presentDays++;
                        });

                        // Calculate working days in month
                        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
                        const workingDays = Math.floor(daysInMonth * 5 / 7); // Approximate working days

                        employeeDataMap.set(employeeId, {
                            employee_id: employeeId,
                            employee_name: employeeData.employee_name,
                            total_days: workingDays,
                            total_hours: parseFloat(totalHours.toFixed(2)),
                            present_days: presentDays,
                            absent_days: Math.max(0, workingDays - presentDays)
                        });
                    });

                    let attendanceData = Array.from(employeeDataMap.values());

                    // Filter data based on user role and userId parameter
                    if (userId) {
                        attendanceData = attendanceData.filter(item => item.employee_id === userId);
                    } else if (!hasFullAccess) {
                        attendanceData = attendanceData.filter(item => item.employee_id === currentUser.id);
                    }
                    reportData = attendanceData;
                }
                break;

            case 'leave':
                // Leave Balance Report
                const { data: leaveBalances, error: leaveError } = await db.getAllLeaveBalances(tenantId);

                if (leaveError) {
                    console.error('Error fetching leave balances:', leaveError);
                    reportData = []; // Return empty array instead of failing
                } else {
                    let leaveData = leaveBalances || [];

                    // Filter data based on user role and userId parameter
                    if (userId) {
                        leaveData = leaveData.filter(item => item.employee_id === userId);
                    } else if (!hasFullAccess) {
                        leaveData = leaveData.filter(item => item.employee_id === currentUser.id);
                    }
                    reportData = leaveData;
                }
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid report type. Supported types: ssnit, paye, attendance, leave'
                });
        }

        res.json({
            success: true,
            data: reportData,
            report_type: type,
            user_role: currentUser.role,
            has_full_access: hasFullAccess,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate report'
        });
    }
});

// --- MOMO CALLBACK ENDPOINT ---
app.post('/api/momo/callback', async (req, res) => {
    try {
        console.log('📞 MoMo Callback received:', req.body);
        
        const { referenceId, status } = req.body;

        if (referenceId && status) {
            // Update payment status in database
            await db.updatePayrollStatus(referenceId, status);
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Callback processing failed' 
        });
    }
});

// --- PUSH NOTIFICATION ENDPOINTS ---

// Subscribe to push notifications
app.post('/api/push/subscribe', async (req, res) => {
    try {
        const { subscription, userId } = req.body;
        const tenantId = getCurrentTenantId();

        if (!subscription || !userId) {
            return res.status(400).json({ error: 'Subscription and userId required' });
        }

        // Store subscription in database
        const supabase = getSupabaseClient();
        if (supabase) {
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: userId,
                    tenant_id: tenantId,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth
                });

            if (error) {
                console.error('Error storing push subscription:', error);
                return res.status(500).json({ error: 'Failed to store subscription' });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ error: 'Subscription failed' });
    }
});

// Unsubscribe from push notifications
app.post('/api/push/unsubscribe', async (req, res) => {
    try {
        const { endpoint, userId } = req.body;

        if (!endpoint || !userId) {
            return res.status(400).json({ error: 'Endpoint and userId required' });
        }

        // Remove subscription from database
        const supabase = getSupabaseClient();
        if (supabase) {
            const { error } = await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .eq('endpoint', endpoint);

            if (error) {
                console.error('Error removing push subscription:', error);
                return res.status(500).json({ error: 'Failed to unsubscribe' });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ error: 'Unsubscribe failed' });
    }
});

// Send push notification
app.post('/api/push/send', async (req, res) => {
    try {
        const { userId, title, body, icon, badge, data } = req.body;
        const tenantId = getCurrentTenantId();

        if (!userId || !title || !body) {
            return res.status(400).json({ error: 'userId, title, and body required' });
        }

        // Get user's push subscriptions
        const supabase = getSupabaseClient();
        if (!supabase) {
            return res.status(500).json({ error: 'Database not available' });
        }

        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('tenant_id', tenantId);

        if (error) {
            console.error('Error fetching subscriptions:', error);
            return res.status(500).json({ error: 'Failed to fetch subscriptions' });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return res.json({ success: true, message: 'No subscriptions found' });
        }

        // Send push to each subscription
        const payload = JSON.stringify({
            title,
            body,
            icon: icon || '/favicon.svg',
            badge: badge || '/favicon.svg',
            data: data || {}
        });

        const results = [];
        for (const sub of subscriptions) {
            try {
                await webPush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload);
                results.push({ endpoint: sub.endpoint, success: true });
            } catch (pushError) {
                console.error('Push send error:', pushError);
                results.push({ endpoint: sub.endpoint, success: false, error: pushError.message });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Push send error:', error);
        res.status(500).json({ error: 'Failed to send push notification' });
    }
});

// Get VAPID public key
app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

// Helper function to send push notification to a user
async function sendPushNotification(userId, notificationData) {
    try {
        const tenantId = getCurrentTenantId();
        const supabase = getSupabaseClient();

        if (!supabase) return;

        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('tenant_id', tenantId);

        if (error || !subscriptions || subscriptions.length === 0) return;

        const payload = JSON.stringify(notificationData);

        for (const sub of subscriptions) {
            try {
                await webPush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload);
            } catch (pushError) {
                console.error(`Push send error for user ${userId}:`, pushError);
            }
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

// Serve static files from dist directory
app.use(express.static(path.join(process.cwd(), 'dist')));

// Handle client-side routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Opoint - Professional Payroll System`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📍 Server:      http://localhost:${PORT}`);
    console.log(`📍 API Health:  http://localhost:${PORT}/api/health`);
    console.log(`📍 API Status:  http://localhost:${PORT}/api/status`);
    console.log(`${'='.repeat(60)}`);
    
    // Database Status
    if (getSupabaseClient()) {
        console.log(`✅ Database:    Connected (Supabase)`);
        
        // Start auto-close scheduler
        scheduleAutoClose();
        console.log(`⏰ Auto-close:  Enabled (10 PM daily)`);
    } else {
        console.log(`⚠️  Database:    Fallback Mode (Mock Data)`);
        console.log(`   💡 Add SUPABASE_URL and SUPABASE_ANON_KEY to .env`);
    }
    
    // Payment Provider Status
    if (CONFIG.MOMO_API_KEY) {
        console.log(`✅ Payments:    Live Mode (MTN MoMo ${CONFIG.MOMO_TARGET_ENV})`);
    } else {
        console.log(`⚠️  Payments:    Simulation Mode`);
        console.log(`   💡 Add MTN MoMo credentials to .env for live payments`);
    }
    
    console.log(`${'='.repeat(60)}`);
    console.log(`🌍 Environment: ${IS_PRODUCTION ? 'Production' : 'Development'}`);
    console.log(`📅 Started:     ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Accra' })} GMT`);
    console.log(`${'='.repeat(60)}\n`);
    
    console.log(`💼 Ready to serve businesses across Ghana!\n`);
});
