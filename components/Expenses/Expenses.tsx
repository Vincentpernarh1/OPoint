import React, { useState, useEffect } from 'react';
import { User, ExpenseRequest, RequestStatus } from '../../types';
import { api } from '../../services/api';
import { offlineStorage } from '../../services/offlineStorage';
import { ReceiptIcon, CheckCircleIcon, ClockIcon, XIcon } from "../Icons/Icons";
import MessageOverlay from "../MessageOverlay/MessageOverlay";
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";

interface ExpensesProps {
    currentUser: User;
}

const statusInfo: Record<string, { icon: React.FC<{className?: string}>, color: string }> = {
    'pending': { icon: ClockIcon, color: 'text-yellow-500' },
    'approved': { icon: CheckCircleIcon, color: 'text-green-500' },
    'rejected': { icon: ClockIcon, color: 'text-red-500' }, // Using ClockIcon as a placeholder
    'cancelled': { icon: XIcon, color: 'text-gray-500' },
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);

const Expenses = ({ currentUser }: ExpensesProps) => {
    const [requests, setRequests] = useState<ExpenseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [receipt, setReceipt] = useState<File | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
    const [confirmationDialog, setConfirmationDialog] = useState<{ isVisible: boolean; message: string; onConfirm: () => void }>({ 
        isVisible: false, 
        message: '', 
        onConfirm: () => {} 
    });

    // Group requests by year and month
    const requestsByYearAndMonth = React.useMemo(() => {
        const grouped: Record<string, Record<string, ExpenseRequest[]>> = {};
        requests.forEach(req => {
            const date = new Date(req.expense_date);
            const year = date.getFullYear().toString();
            const month = date.toLocaleString('en-US', { month: 'long' });
            
            if (!grouped[year]) {
                grouped[year] = {};
            }
            if (!grouped[year][month]) {
                grouped[year][month] = [];
            }
            grouped[year][month].push(req);
        });
        return grouped;
    }, [requests]);

    const sortedExpenseYears = React.useMemo(() => {
        return Object.keys(requestsByYearAndMonth).sort((a, b) => parseInt(b) - parseInt(a));
    }, [requestsByYearAndMonth]);

    // Fetch expense claims on component mount
    useEffect(() => {
        const fetchExpenseClaims = async () => {
            try {
                const claims = await api.getExpenseClaims(currentUser.tenantId!, { employee_id: currentUser.id });
                setRequests(claims);
            } catch (error) {
                console.error('Failed to fetch expense claims:', error);
                // OFFLINE FALLBACK: Try to load from local IndexedDB
                try {
                    const localExpenses = await offlineStorage.getExpensesByUser(currentUser.tenantId!, currentUser.id);
                    if (localExpenses.length > 0) {
                        setRequests(localExpenses.map(exp => ({
                            id: exp.id,
                            employee_id: exp.employee_id || exp.userId,
                            employee_name: exp.employee_name || currentUser.name,
                            description: exp.description,
                            amount: exp.amount,
                            expense_date: exp.expense_date || exp.date,
                            status: exp.synced ? exp.status : 'Pending Sync',
                            receipt_url: exp.receiptUrl
                        })));
                        setMessage({ type: 'success', text: '📴 Offline - Showing local expense data' });
                    } else {
                        setMessage({ type: 'error', text: 'Failed to load expense claims' });
                    }
                } catch (offlineError) {
                    console.error('Failed to load from offline storage:', offlineError);
                    setMessage({ type: 'error', text: 'Failed to load expense claims. Please check your connection.' });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchExpenseClaims();
    }, [currentUser.tenantId, currentUser.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const expenseData = {
                employee_id: currentUser.id,
                employee_name: currentUser.name,
                description,
                amount: parseFloat(amount),
                expense_date: date,
                receipt_url: receipt ? URL.createObjectURL(receipt) : undefined,
            };

            try {
                const newClaim = await api.createExpenseClaim(currentUser.tenantId!, expenseData);
                setRequests(prev => [newClaim, ...prev]);
                setMessage({ type: 'success', text: 'Expense claim submitted successfully!' });
            } catch (apiError) {
                console.warn('API submission failed, saving offline:', apiError);
                
                // OFFLINE FALLBACK: Save to IndexedDB
                const offlineExpense = {
                    id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    userId: currentUser.id,
                    companyId: currentUser.tenantId!,
                    amount: parseFloat(amount),
                    category: 'General',
                    description: description,
                    date: date,
                    receiptUrl: receipt ? URL.createObjectURL(receipt) : undefined,
                    synced: false,
                    createdAt: new Date().toISOString(),
                    employee_id: currentUser.id,
                    employee_name: currentUser.name,
                    expense_date: date,
                    status: 'Pending Sync'
                };
                
                await offlineStorage.saveExpense(offlineExpense);
                
                // Add to local state for immediate display
                setRequests(prev => [{
                    id: offlineExpense.id,
                    employee_id: offlineExpense.employee_id,
                    employee_name: offlineExpense.employee_name,
                    description: offlineExpense.description,
                    amount: offlineExpense.amount,
                    expense_date: offlineExpense.expense_date,
                    status: 'Pending Sync',
                    receipt_url: offlineExpense.receiptUrl
                }, ...prev]);
                
                setMessage({ type: 'success', text: '📴 Offline - Expense saved locally. Will sync when online.' });
            }

            // Reset form
            setDescription('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setReceipt(null);
        } catch (error) {
            console.error('Failed to submit expense claim:', error);
            setMessage({ type: 'error', text: 'Failed to submit expense claim' });
        }
    };

    const handleCancelExpense = async (expenseId: string) => {
        const performCancel = async () => {
            setConfirmationDialog({ isVisible: false, message: '', onConfirm: () => {} });

            try {
                await api.updateExpenseClaim(currentUser.tenantId!, expenseId, {
                    status: 'cancelled',
                    reviewed_by: currentUser.id
                });

                // Update local state
                setRequests(prev => prev.map(req => 
                    req.id === expenseId ? { ...req, status: 'cancelled' } : req
                ));

                setMessage({ type: 'success', text: 'Expense claim cancelled successfully!' });
            } catch (error) {
                console.error('Failed to cancel expense claim:', error);
                setMessage({ type: 'error', text: 'Failed to cancel expense claim. Please try again.' });
            }
        };

        setConfirmationDialog({
            isVisible: true,
            message: 'Are you sure you want to cancel this expense claim?',
            onConfirm: performCancel
        });
    };

    return (
        <>
            {message && <MessageOverlay message={message} onClose={() => setMessage(null)} />}
            <ConfirmationDialog
                isVisible={confirmationDialog.isVisible}
                message={confirmationDialog.message}
                onConfirm={confirmationDialog.onConfirm}
                onCancel={() => setConfirmationDialog({ isVisible: false, message: '', onConfirm: () => {} })}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-4 sm:p-6 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-primary to-amber-600 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-90">
                            <span className="text-2xl">💰</span>
                        </div>
                        <h2 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">Submit Expense Claim</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5">
                         <div>
                            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} required placeholder="e.g., Client Lunch" className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"/>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">Amount (GHS)</label>
                                <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="150.00" step="0.01" className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"/>
                            </div>
                            <div>
                                <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="receipt" className="block text-sm font-semibold text-gray-700 mb-2">Upload Receipt</label>
                            <input type="file" id="receipt" onChange={e => setReceipt(e.target.files ? e.target.files[0] : null)} accept="image/*" className="block w-full text-sm text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-primary file:to-amber-600 file:text-white hover:file:shadow-lg file:transition-all cursor-pointer"/>
                        </div>
                        <button type="submit" className="w-full bg-gradient-to-r from-primary to-amber-600 hover:shadow-lg text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2">
                            <span>💸</span>
                            Submit Claim
                        </button>
                    </form>
                </div>
                 <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-xl">
                    <button 
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} 
                        className="w-full flex justify-between items-center mb-4 group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-primary to-amber-600 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-90">
                                <span className="text-xl">📊</span>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">My Expense Claims</h3>
                        </div>
                        <div className="text-gray-500 group-hover:text-primary transition-colors">{isHistoryExpanded ? '▲' : '▼'}</div>
                    </button>
                    
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="text-gray-500 mt-2">Loading expense claims...</p>
                        </div>
                    ) : isHistoryExpanded ? (
                        <div className="space-y-3 animate-fade-in-down">
                            {sortedExpenseYears.length > 0 ? sortedExpenseYears.map(year => {
                                const isYearExpanded = expandedYears.has(year);
                                const months = Object.keys(requestsByYearAndMonth[year]).sort((a, b) => {
                                    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                    return monthOrder.indexOf(b) - monthOrder.indexOf(a);
                                });
                                
                                return (
                                    <div key={year} className="border-b pb-3 last:border-b-0">
                                        <button
                                            onClick={() => {
                                                const newExpanded = new Set(expandedYears);
                                                if (isYearExpanded) {
                                                    newExpanded.delete(year);
                                                } else {
                                                    newExpanded.add(year);
                                                }
                                                setExpandedYears(newExpanded);
                                            }}
                                            className="w-full flex justify-between items-center p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 hover:shadow-md rounded-xl transition-all border border-gray-200"
                                        >
                                            <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2"><span className="text-xl">📅</span> {year}</h4>
                                            <div className="text-gray-600">{isYearExpanded ? '▲' : '▼'}</div>
                                        </button>
                                        
                                        {isYearExpanded && (
                                            <div className="mt-2 ml-4 space-y-2 animate-fade-in-down">
                                                {months.map(month => {
                                                    const monthKey = `${year}-${month}`;
                                                    const isMonthExpanded = expandedMonths.has(monthKey);
                                                    const expenses = requestsByYearAndMonth[year][month];
                                                    
                                                    return (
                                                        <div key={monthKey}>
                                                            <button
                                                                onClick={() => {
                                                                    const newExpanded = new Set(expandedMonths);
                                                                    if (isMonthExpanded) {
                                                                        newExpanded.delete(monthKey);
                                                                    } else {
                                                                        newExpanded.add(monthKey);
                                                                    }
                                                                    setExpandedMonths(newExpanded);
                                                                }}
                                                                className="w-full flex justify-between items-center p-3 bg-white hover:bg-gradient-to-r hover:from-white hover:to-gray-50 rounded-lg transition-all border border-gray-200 shadow-sm hover:shadow"
                                                            >
                                                                <span className="font-semibold text-gray-700 flex items-center gap-2"><span className="text-lg">📆</span> {month} <span className="ml-1 px-2 py-0.5 bg-gradient-to-r from-primary to-amber-600 text-white text-xs rounded-full">{expenses.length}</span></span>
                                                                <div className="text-gray-600">{isMonthExpanded ? '▲' : '▼'}</div>
                                                            </button>
                                                            
                                                            {isMonthExpanded && (
                                                                <div className="mt-2 ml-6 space-y-2 animate-fade-in-down">
                                                                    {expenses.map(req => {
                                                                        const StatusIcon = statusInfo[req.status].icon;
                                                                        const statusGradients: Record<string, string> = {
                                                                            'pending': 'from-yellow-50 to-yellow-100/50',
                                                                            'approved': 'from-green-50 to-green-100/50',
                                                                            'rejected': 'from-red-50 to-red-100/50',
                                                                            'cancelled': 'from-gray-50 to-gray-100/50',
                                                                            'Pending Sync': 'from-blue-50 to-blue-100/50'
                                                                        };
                                                                        return (
                                                                            <div key={req.id} className={`p-4 border border-gray-200 rounded-xl bg-gradient-to-br ${statusGradients[req.status] || 'from-white to-gray-50'} shadow-sm hover:shadow-md transition-all`}>
                                                                                <div className="flex items-start space-x-3">
                                                                                    <div className={`p-3 rounded-xl shadow-md backdrop-blur-sm bg-white/50 ${statusInfo[req.status].color}`}>
                                                                                        <StatusIcon className="h-5 w-5" />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <div className="flex justify-between items-center">
                                                                                            <p className="font-bold text-gray-800">{req.description}</p>
                                                                                            <p className={`font-bold text-lg ${statusInfo[req.status].color}`}>{formatCurrency(req.amount)}</p>
                                                                                        </div>
                                                                                        <div className="flex justify-between items-center text-sm mt-2">
                                                                                            <p className="text-gray-600 flex items-center gap-1"><span>📅</span> {new Date(req.expense_date).toLocaleDateString()}</p>
                                                                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-white/80 shadow-sm ${statusInfo[req.status].color}`}>
                                                                                                {req.status}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                {req.status === 'pending' && (
                                                                                    <div className="mt-3 flex justify-end">
                                                                                        <button
                                                                                            onClick={() => handleCancelExpense(req.id)}
                                                                                            className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-xs font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                                                                                            title="Cancel expense claim"
                                                                                        >
                                                                                            <XIcon className="h-3.5 w-3.5" />
                                                                                            Cancel Request
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : (
                                <p className="text-gray-500 text-center py-8">You have no expense claims.</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4 text-sm">Click to view expense history</p>
                    )}
                 </div>
            </div>
        </>
    );
};

export default Expenses;
