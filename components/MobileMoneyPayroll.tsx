
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User } from '../types';
import { SmartphoneIcon, CheckCircleIcon, XIcon, LogoIcon, CheckSquareIcon } from './Icons';
import { api } from '../services/api';

type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed';

interface PaymentResult {
    userId: string;
    status: PaymentStatus;
    message: string;
}

interface PayableEmployee {
    id: string;
    name: string;
    mobileMoneyNumber?: string;
    basicSalary: number;
    netPay: number;
    grossPay: number;
    totalDeductions: number;
    ssnitEmployee: number;
    paye: number;
    otherDeductions: number;
    isPaid: boolean;
    paidAmount?: number;
    paidDate?: Date;
    paidReason?: string;
}

interface AdjustedPayment {
    amount: number;
    reason: string;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);

// Helper component for currency input
const CurrencyInput = ({ 
    value, 
    onChange, 
    disabled, 
    className 
}: { 
    value: number, 
    onChange: (val: string) => void, 
    disabled: boolean, 
    className?: string 
}) => {
    // We keep a string version for display
    const [localValue, setLocalValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync with prop value when it changes, but only if we are not editing it
    useEffect(() => {
        // If the input is currently focused, do NOT overwrite what the user is typing
        if (document.activeElement === inputRef.current) return;

        // Format the incoming value
        if (value !== undefined && value !== null && !isNaN(value)) {
            setLocalValue(value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        } else {
             setLocalValue('');
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow digits, commas, and dots freely during typing for better UX
        if (/^[0-9,.]*$/.test(val)) {
            setLocalValue(val);
        }
    };

    const handleFocus = () => {
        // Remove commas for editing
        const raw = localValue.replace(/,/g, '');
        setLocalValue(raw);
    };

    const handleBlur = () => {
        // Parse what we have
        let clean = localValue.replace(/,/g, '');
        if (clean === '' || clean === '.') clean = '0';
        
        const parsed = parseFloat(clean);
        
        if (!isNaN(parsed)) {
            // Send number to parent
            onChange(parsed.toString());
            // Reformat local
            setLocalValue(parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        } else {
            // Invalid? Revert to prop
            setLocalValue(value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
    };

    return (
        <input
            ref={inputRef}
            title="Currency Input"
            type="text"
            disabled={disabled}
            value={localValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`${className} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
        />
    );
};

interface MobileMoneyPayrollProps {
    currentUser: User;
}

const MobileMoneyPayroll = ({ currentUser }: MobileMoneyPayrollProps) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');
    const [step, setStep] = useState(1); // 1: Select, 2: Review, 3: Approve, 4: Results
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    
    // Track adjusted amounts: userId -> { amount, reason }
    const [adjustments, setAdjustments] = useState<Record<string, AdjustedPayment>>({});
    
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [paymentResults, setPaymentResults] = useState<PaymentResult[]>([]);
    const [allEmployees, setAllEmployees] = useState<PayableEmployee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPayableEmployees = async () => {
        setIsLoading(true);
        try {
            const data = await api.getPayableEmployees(currentUser.tenantId!);
            if (Array.isArray(data)) {
                setAllEmployees(data);
            } else {
                setAllEmployees([]);
            }
        } catch (err) {
            setAllEmployees([]);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPayableEmployees();
    }, []);

    // Refresh data when connection returns or when an employee is updated elsewhere
    useEffect(() => {
        const handleOnline = () => {
            // When back online, refresh payable employees to avoid stale mobile numbers
            fetchPayableEmployees();
        };

        const handleEmployeeUpdated = (e: Event) => {
            // Custom event may include details about which user changed
            try {
                const ce = e as CustomEvent;
                const detail = ce.detail || {};
                // If the change is relevant (mobile money), refresh list
                if (!detail.field || detail.field === 'mobile_money_number') {
                    fetchPayableEmployees();
                } else {
                    // still refresh to be safe
                    fetchPayableEmployees();
                }
            } catch (err) {
                fetchPayableEmployees();
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('employee-updated', handleEmployeeUpdated as EventListener);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('employee-updated', handleEmployeeUpdated as EventListener);
        };
    }, []);

    // Derived lists based on status
    const pendingEmployees = useMemo(() => allEmployees.filter(u => !u.isPaid), [allEmployees]);
    const paidEmployees = useMemo(() => allEmployees.filter(u => u.isPaid), [allEmployees]);
    
    // Current list to display based on tab
    const currentList = activeTab === 'pending' ? pendingEmployees : paidEmployees;

    // Helpers for handling adjustments
    const getFinalAmount = (user: PayableEmployee) => {
        if (adjustments[user.id]) {
            return adjustments[user.id].amount;
        }
        return user.netPay;
    };

    const handleAmountChange = (userId: string, newValue: string) => {
        const amount = parseFloat(newValue);
        if (isNaN(amount)) return; 

        setAdjustments(prev => ({
            ...prev,
            [userId]: {
                amount: amount,
                reason: prev[userId]?.reason || ''
            }
        }));
    };

    const handleReasonChange = (userId: string, newReason: string) => {
        setAdjustments(prev => ({
            ...prev,
            [userId]: {
                amount: prev[userId]?.amount || 0, // Should typically exist if reason is being edited, but handled in UI
                reason: newReason
            }
        }));
    };

    const handleToggleUser = (userId: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            // Initialize adjustment state if selecting for the first time
            const user = pendingEmployees.find(u => u.id === userId);
            if (user && !adjustments[userId]) {
                 setAdjustments(prev => ({
                    ...prev,
                    [userId]: { amount: user.netPay, reason: '' }
                }));
            }
            newSet.add(userId);
        }
        setSelectedUserIds(newSet);
    };

    const handleSelectAll = () => {
        const payableEmployees = pendingEmployees.filter(u => u.mobileMoneyNumber); // Only those with mobile money
        
        if (selectedUserIds.size === payableEmployees.length) {
            setSelectedUserIds(new Set());
            // Optional: Clear adjustments? No, keep them in case they re-select.
        } else {
            const newSet = new Set(payableEmployees.map(u => u.id));
            setSelectedUserIds(newSet);
            // Initialize adjustments for all
            const newAdjustments = { ...adjustments };
            payableEmployees.forEach(u => {
                if (!newAdjustments[u.id]) {
                    newAdjustments[u.id] = { amount: u.netPay, reason: '' };
                }
            });
            setAdjustments(newAdjustments);
        }
    };
    
    const selectedUsersData = useMemo(() => 
        pendingEmployees.filter(u => selectedUserIds.has(u.id)).map(u => ({
            ...u,
            finalAmount: getFinalAmount(u),
            reason: adjustments[u.id]?.reason
        }))
    , [selectedUserIds, pendingEmployees, adjustments]);

    const totalPayment = useMemo(() => selectedUsersData.reduce((sum, u) => sum + u.finalAmount, 0), [selectedUsersData]);

    const processPayments = async () => {
        setIsLoading(true);
        setError('');
        try {
            const payload = selectedUsersData.map(u => ({
                userId: u.id,
                amount: u.finalAmount,
                reason: u.reason
            }));

            const results = await api.processPayroll(payload, password, currentUser.tenantId!);
            setPaymentResults(results as PaymentResult[]);
            setStep(4);
            
            // Refresh employee data to update "Paid" status
            fetchPayableEmployees();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const resetProcess = () => {
        setStep(1);
        setSelectedUserIds(new Set());
        setAdjustments({});
        setPassword('');
        setError('');
        setPaymentResults([]);
        setActiveTab('pending');
    };
    
    if (isLoading && step === 1 && allEmployees.length === 0) {
        return <div className="text-center p-8"><LogoIcon className="h-10 w-10 mx-auto animate-pulse text-primary" /><p className="mt-2">Loading Payroll Data...</p></div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl shadow-xl overflow-hidden mb-8">
                <div className="px-6 py-8 sm:px-8">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                            <div className="text-3xl">💰</div>
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Mobile Money Payroll</h1>
                            <p className="text-white/90 text-xs sm:text-sm mt-1">Process employee payments via mobile money</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100">
            
            {step === 1 && (
                <div>
                    <div className="flex space-x-2 mb-6">
                        <button 
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${activeTab === 'pending' ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <span className="mr-1 sm:mr-2">⏳</span>
                            <span className="hidden sm:inline">Pending Payments</span>
                            <span className="sm:hidden">Pending</span>
                            <span> ({pendingEmployees.length})</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('paid')}
                            className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${activeTab === 'paid' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <span className="mr-1 sm:mr-2">✅</span>
                            <span className="hidden sm:inline">Payment History</span>
                            <span className="sm:hidden">History</span>
                            <span> ({paidEmployees.length})</span>
                        </button>
                    </div>

                    {activeTab === 'pending' ? (
                        <>
                            {pendingEmployees.filter(u => !u.mobileMoneyNumber).length > 0 && (
                                <div className="mb-6 bg-gradient-to-r from-yellow-50 to-amber-50/50 border-l-4 border-yellow-500 rounded-xl p-4 shadow-md">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <span className="text-2xl">⚠️</span>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-semibold text-yellow-800">Mobile Money Setup Required</p>
                                            <p className="text-xs text-yellow-700 mt-1">
                                                {pendingEmployees.filter(u => !u.mobileMoneyNumber).length} employee(s) need mobile money numbers before they can be paid. 
                                                Please update their profiles or request them to add their mobile money details.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <span className="w-1 h-5 sm:h-6 bg-gradient-to-b from-primary to-purple-600 rounded-full mr-2 sm:mr-3"></span>
                                Select Employees to Pay
                            </h3>
                            <div className="overflow-x-auto border rounded-lg">
                                <div className="min-w-[800px]">
                                    <table className="w-full text-sm text-left">
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 text-gray-800">
                                        <tr>
                                            <th className="p-3 w-10"><input  title="Select All" type="checkbox" onChange={handleSelectAll} checked={selectedUserIds.size === pendingEmployees.filter(u => u.mobileMoneyNumber).length && pendingEmployees.filter(u => u.mobileMoneyNumber).length > 0} /></th>
                                            <th className="p-3">Employee</th>
                                            <th className="p-3">Salary Info</th>
                                            <th className="p-3">Payout Amount (GHS)</th>
                                            <th className="p-3">Adjustment Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingEmployees.length > 0 ? pendingEmployees.map(user => {
                                            const isSelected = selectedUserIds.has(user.id);
                                            const currentAmount = getFinalAmount(user);
                                            const isAdjusted = currentAmount !== user.netPay;

                                            return (
                                                <tr key={user.id} className={`border-b hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                                                    <td className="p-3 align-top pt-4">
                                                        {user.mobileMoneyNumber ? (
                                                            <input  title="Select" type="checkbox" checked={isSelected} onChange={() => handleToggleUser(user.id)} />
                                                        ) : (
                                                            <div className="text-red-500 text-xs">❌</div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        <p className="font-bold text-gray-800">{user.name}</p>
                                                        <p className="text-xs text-gray-500">{user.mobileMoneyNumber || 'No MoMo Number'}</p>
                                                        {!user.mobileMoneyNumber && (
                                                            <div className="mt-1 p-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                                                ⚠️ Mobile money required for payment
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        <div className="text-xs space-y-1">
                                                            <p><span className="text-gray-500">Basic:</span> {formatCurrency(user.basicSalary)}</p>
                                                            <p><span className="text-gray-500">Gross:</span> {formatCurrency(user.grossPay)}</p>
                                                            <p><span className="text-gray-500">Net:</span> {formatCurrency(user.netPay)}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        <CurrencyInput 
                                                            disabled={!isSelected}
                                                            value={adjustments[user.id]?.amount ?? user.netPay}
                                                            onChange={(val) => handleAmountChange(user.id, val)}
                                                            className={`w-32 px-2 py-1 border rounded focus:ring-primary focus:border-primary text-right font-mono ${isAdjusted ? 'bg-yellow-50 border-yellow-300' : 'bg-white'}`}
                                                        />
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        {isAdjusted ? (
                                                            <input 
                                                                type="text" 
                                                                placeholder="Reason for change..."
                                                                value={adjustments[user.id]?.reason || ''}
                                                                onChange={(e) => handleReasonChange(user.id, e.target.value)}
                                                                className="w-full px-2 py-1 border border-yellow-300 bg-yellow-50 rounded focus:ring-primary focus:border-primary text-xs"
                                                            />
                                                        ) : (
                                                            <span className="text-gray-400 text-xs italic">No adjustment</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                                    All employees have been paid for this period.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                            <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="text-center sm:text-left">
                                        <p className="text-sm text-gray-600 mb-1">
                                            Selected: <span className="font-bold text-gray-800">{selectedUserIds.size}</span> employee(s)
                                        </p>
                                        <p className="text-lg font-bold text-primary">
                                            Total Payout: {formatCurrency(totalPayment)}
                                        </p>
                                    </div>
                                    <button onClick={() => setStep(2)} disabled={selectedUserIds.size === 0} className="bg-gradient-to-r from-primary to-purple-600 hover:shadow-lg hover:scale-105 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2">
                                        <span>Next: Review</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        // PAID HISTORY TAB
                        <>
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <span className="w-1 h-5 sm:h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full mr-2 sm:mr-3"></span>
                                Completed Transactions (This Month)
                            </h3>
                            <div className="overflow-x-auto border rounded-lg">
                                <div className="min-w-[700px]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gradient-to-r from-green-50 to-emerald-50/50 text-green-800">
                                        <tr>
                                            <th className="p-3">Employee</th>
                                            <th className="p-3">Date Paid</th>
                                            <th className="p-3">Amount Paid</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paidEmployees.length > 0 ? paidEmployees.map(user => (
                                            <tr key={user.id} className="border-b hover:bg-slate-50">
                                                <td className="p-3">
                                                    <p className="font-bold text-gray-800">{user.name}</p>
                                                    <p className="text-xs text-gray-500">{user.mobileMoneyNumber}</p>
                                                </td>
                                                <td className="p-3">{user.paidDate ? new Date(user.paidDate).toLocaleDateString() + ' ' + new Date(user.paidDate).toLocaleTimeString() : 'N/A'}</td>
                                                <td className="p-3 font-bold">{formatCurrency(user.paidAmount || 0)}</td>
                                                <td className="p-3"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Success</span></td>
                                                <td className="p-3 text-xs text-gray-500 italic">{user.paidReason || '-'}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                                    No payments recorded yet for this month.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            {step === 2 && (
                 <div>
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="bg-gradient-to-r from-primary to-purple-600 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mr-2 sm:mr-3 text-sm">2</span>
                        Review Discrepancies
                    </h3>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-6 rounded-2xl mb-6 border border-blue-200 shadow-md">
                        <div className="flex justify-between items-center mb-2">
                             <p className="text-gray-600">Total Employees Selected:</p>
                             <p className="font-bold">{selectedUsersData.length}</p>
                        </div>
                        <div className="flex justify-between items-center text-xl text-primary font-bold">
                             <p>Total Payout:</p>
                             <p>{formatCurrency(totalPayment)}</p>
                        </div>
                    </div>

                    <h4 className="font-semibold text-gray-700 mb-2">Payment Breakdown</h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Gross Pay</th>
                                    <th className="p-2">Deductions</th>
                                    <th className="p-2">Final Pay</th>
                                    <th className="p-2">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedUsersData.map(u => {
                                    const isChanged = u.finalAmount !== u.netPay;
                                    return (
                                        <tr key={u.id} className={`border-b ${isChanged ? 'bg-yellow-50' : ''}`}>
                                            <td className="p-2 font-medium">{u.name}</td>
                                            <td className="p-2 text-gray-500">{formatCurrency(u.grossPay)}</td>
                                            <td className="p-2 text-xs text-gray-600">
                                                <div>
                                                    <p>PAYE: {formatCurrency(u.paye)}</p>
                                                    <p>SSNIT: {formatCurrency(u.ssnitEmployee)}</p>
                                                    {u.otherDeductions > 0 && <p>Other: {formatCurrency(u.otherDeductions)}</p>}
                                                </div>
                                            </td>
                                            <td className={`p-2 font-bold ${isChanged ? 'text-amber-600' : 'text-gray-800'}`}>{formatCurrency(u.finalAmount)}</td>
                                            <td className="p-2 text-xs italic text-gray-600">{u.reason || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                                </div>
                    <div className="mt-6 flex flex-col sm:flex-row justify-between gap-4">
                        <button onClick={() => setStep(1)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2">
                            <span>←</span>
                            <span>Back</span>
                        </button>
                        <button onClick={() => setStep(3)} className="bg-gradient-to-r from-primary to-purple-600 hover:shadow-lg hover:scale-105 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2">
                            <span>Proceed to Approval</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>
            )}
            
            {step === 3 && (
                 <div>
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="bg-gradient-to-r from-primary to-purple-600 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mr-2 sm:mr-3 text-sm">3</span>
                        Final Approval
                    </h3>
                    <div className="bg-gradient-to-r from-red-50 to-rose-50/50 border-l-4 border-red-500 rounded-xl p-4 shadow-md mb-6">
                        <div className="flex items-start">
                            <span className="text-2xl mr-3">⚠️</span>
                            <p className="text-sm font-semibold text-red-700">Warning: This action initiates money transfer. Ensure all amounts are correct.</p>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                            <span>🔒</span>
                            <span>Enter Approval Password</span>
                        </label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"/>
                        {error && <p className="text-red-500 text-sm mt-2 font-medium">{error}</p>}
                        <p className="text-xs text-gray-500 mt-2">💡 Hint: use 'approve123' for this demo.</p>
                    </div>

                     <div className="mt-6 flex flex-col sm:flex-row justify-between gap-4">
                        <button onClick={() => setStep(2)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2" disabled={isLoading}>
                            <span>←</span>
                            <span>Back</span>
                        </button>
                        <button onClick={processPayments} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg hover:scale-105 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 min-w-[180px]" disabled={isLoading}>
                             {isLoading ? (
                                 <>
                                     <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                     <span>Processing...</span>
                                 </>
                             ) : (
                                 <>
                                     <span>💸</span>
                                     <span>Approve & Pay</span>
                                 </>
                             )}
                        </button>
                    </div>
                </div>
            )}
            
             {step === 4 && (
                 <div>
                    <div className="flex items-center justify-center mb-6">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-2xl shadow-xl">
                            <CheckSquareIcon className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-center text-gray-800 mb-8">Payment Processing Complete</h3>
                    
                     <div className="space-y-2">
                         {paymentResults.map(result => {
                             const user = allEmployees.find(u => u.id === result.userId) || { name: 'Unknown' };
                             const isSuccess = result.status === 'success';
                             return (
                                 <div key={result.userId} className={`p-3 rounded-lg flex items-center justify-between border ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                     <div>
                                         <p className="font-semibold text-sm">{user.name}</p>
                                         <p className="text-xs text-gray-600">{result.message}</p>
                                     </div>
                                     {isSuccess ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XIcon className="h-5 w-5 text-red-500"/>}
                                 </div>
                             );
                         })}
                    </div>
                     <div className="mt-8 text-center">
                        <button onClick={resetProcess} className="bg-gradient-to-r from-primary to-purple-600 hover:shadow-xl hover:scale-105 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 mx-auto">
                            <span>✨</span>
                            <span>Done / Start New Batch</span>
                        </button>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default MobileMoneyPayroll;
