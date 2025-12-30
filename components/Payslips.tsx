
import React, { useState, useMemo, useEffect } from 'react';
import { User, Payslip, UserRole, View } from '../types';
import { PAYSCLIP_HISTORY, USERS } from '../constants';
import { TrendingUpIcon, TrendingDownIcon, LogoIcon, ChevronDownIcon, ArrowLeftIcon, SmartphoneIcon, SearchIcon } from './Icons';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';

interface PayslipsProps {
    currentUser: User;
    onViewChange: (view: View) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);
};

const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const groupPayslipsByYear = (payslips: Partial<Payslip>[]) => {
    return payslips.reduce((acc, payslip) => {
        const year = new Date(payslip.payDate!).getFullYear().toString();
        if (!acc[year]) {
            acc[year] = [];
        }
        acc[year].push(payslip);
        return acc;
    }, {} as Record<string, Partial<Payslip>[]>);
};


const PayslipDetailView = ({ employee, onViewChange, isManager }: { employee: User, onViewChange: (view: View) => void, isManager: boolean }) => {
    const [userPayslipHistory, setUserPayslipHistory] = useState<Partial<Payslip>[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    
    const [selectedPayslipId, setSelectedPayslipId] = useState<Partial<Payslip> | null>(null);
    const [payslipData, setPayslipData] = useState<Payslip | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

    // Fetch payslip history on component mount
    useEffect(() => {
        const fetchPayslipHistory = async () => {
            setLoadingHistory(true);
            setHistoryError(null);
            try {
                const history = await api.getPayslipHistory(employee.id, employee.tenantId || '');
                
                // If no payroll history exists, generate a current month payslip
                let payslipHistory = history.map(record => ({
                    id: record.id,
                    userId: record.user_id,
                    payDate: new Date(record.created_at),
                    payPeriodStart: new Date(record.created_at), // Approximate
                    payPeriodEnd: new Date(record.created_at),
                    basicSalary: record.amount, // This is net pay, but we'll use it as reference
                })).sort((a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime());
                
                // If no history, create a current month entry
                if (payslipHistory.length === 0) {
                    const currentDate = new Date();
                    const currentMonthEntry = {
                        id: `${employee.id}_${currentDate.toISOString().split('T')[0]}`,
                        userId: employee.id,
                        payDate: currentDate,
                        payPeriodStart: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                        payPeriodEnd: currentDate,
                        basicSalary: employee.basicSalary || 0,
                    };
                    payslipHistory = [currentMonthEntry];
                }
                
                setUserPayslipHistory(payslipHistory);
                if (payslipHistory.length > 0) {
                    setSelectedPayslipId(payslipHistory[0]);
                }
                // NOTE: Don't cache incomplete history here - full payslips are cached when details are fetched
            } catch (err) {
                console.error('Payslip fetch error:', err);
                // OFFLINE FALLBACK: Try to load cached payslips
                try {
                    const cachedPayslips = await offlineStorage.getCachedPayslips(employee.id, employee.tenantId || '');
                    if (cachedPayslips.length > 0) {
                        // Convert cached full payslips to history list format
                        const payslipHistory = cachedPayslips.map(p => ({
                            id: p.id,
                            userId: p.userId,
                            payDate: new Date(p.payDate),
                            payPeriodStart: new Date(p.payDate),
                            payPeriodEnd: new Date(p.payDate),
                            basicSalary: p.basicSalary
                        })).sort((a, b) => b.payDate.getTime() - a.payDate.getTime());
                        
                        setUserPayslipHistory(payslipHistory);
                        if (payslipHistory.length > 0) {
                            setSelectedPayslipId(payslipHistory[0]);
                        }
                        setHistoryError('📴 Offline - Showing cached payslip history');
                    } else {
                        setHistoryError('📴 Offline - No cached payslip data. Please connect to internet and load payslips first.');
                        // Fallback: create a current month entry with employee data
                        const currentDate = new Date();
                        const fallbackEntry = {
                            id: `${employee.id}_${currentDate.toISOString().split('T')[0]}`,
                            userId: employee.id,
                            payDate: currentDate,
                            payPeriodStart: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                            payPeriodEnd: currentDate,
                            basicSalary: employee.basicSalary || 0,
                        };
                        setUserPayslipHistory([fallbackEntry]);
                        setSelectedPayslipId(fallbackEntry);
                    }
                } catch (cacheErr) {
                    console.error('Failed to load cached payslips:', cacheErr);
                    setHistoryError('Failed to load payslip data. Please check your connection.');
                    // Fallback: create a current month entry with employee data
                    const currentDate = new Date();
                    const fallbackEntry = {
                        id: `${employee.id}_${currentDate.toISOString().split('T')[0]}`,
                        userId: employee.id,
                        payDate: currentDate,
                        payPeriodStart: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                        payPeriodEnd: currentDate,
                        basicSalary: employee.basicSalary || 0,
                    };
                    setUserPayslipHistory([fallbackEntry]);
                    setSelectedPayslipId(fallbackEntry);
                }
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchPayslipHistory();
    }, [employee.id, employee.tenantId, employee.basicSalary]);

    useEffect(() => {
        if (!selectedPayslipId) return;
        
        const fetchPayslip = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Use query param for date to prevent URL encoding issues with ISO strings
                const dateParam = new Date(selectedPayslipId.payDate!).toISOString();
                // CHANGED: Use local API service instead of fetch
                const data = await api.getPayslip(selectedPayslipId.userId!, dateParam, employee.tenantId || '');
                setPayslipData(data);
                
                // CACHE THE FULL PAYSLIP DATA for offline use
                try {
                    await offlineStorage.cachePayslip(data, selectedPayslipId.userId!, employee.tenantId || '');
                    console.log('Cached payslip details for offline use');
                } catch (cacheErr) {
                    console.warn('Failed to cache payslip details:', cacheErr);
                }
            } catch (err) {
                console.error('Payslip details fetch error:', err);
                
                // OFFLINE FALLBACK: Try to load cached payslip details
                try {
                    const dateParam = new Date(selectedPayslipId.payDate!).toISOString();
                    const cachedPayslip = await offlineStorage.getCachedPayslip(
                        selectedPayslipId.userId!,
                        dateParam,
                        employee.tenantId || ''
                    );
                    
                    if (cachedPayslip) {
                        setPayslipData(cachedPayslip);
                        setError('📴 Offline - Showing cached payslip data');
                    } else {
                        // Check if this is a salary setup error
                        if (err instanceof Error && err.message.includes('salary not set')) {
                            setError('Employee salary not set. Please contact an administrator to set the salary.');
                        } else {
                            setError('📴 Offline - No cached data for this payslip. Please connect to internet to load payslip details.');
                        }
                    }
                } catch (cacheErr) {
                    console.error('Failed to load cached payslip:', cacheErr);
                    // Check if this is a salary setup error
                    if (err instanceof Error && err.message.includes('salary not set')) {
                        setError('Employee salary not set. Please contact an administrator to set the salary.');
                    } else {
                        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
                    }
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchPayslip();
    }, [selectedPayslipId]);

    const groupedPayslips = useMemo(() => groupPayslipsByYear(userPayslipHistory), [userPayslipHistory]);
    const sortedYears = useMemo(() => Object.keys(groupedPayslips).sort((a, b) => parseInt(b) - parseInt(a)), [groupedPayslips]);

    const handleDownloadCSV = () => {
        if (!payslipData) return;
        
        const headers = ['Description', 'Amount (GHS)'];
        const rows = [
            ['EARNINGS', ''],
            ['Basic Salary', payslipData.basicSalary.toFixed(2)],
            ['', ''],
            ['DEDUCTIONS', ''],
            ['SSNIT Employee (5.5%)', payslipData.ssnitEmployee.toFixed(2)],
            ['P.A.Y.E Tax', payslipData.paye.toFixed(2)],
            ...payslipData.otherDeductions.map(d => [d.description, d.amount.toFixed(2)]),
            ['', ''],
            ['SUMMARY', ''],
            ['Gross Pay', payslipData.grossPay.toFixed(2)],
            ['Total Deductions', payslipData.totalDeductions.toFixed(2)],
            ['Net Pay', payslipData.netPay.toFixed(2)],
        ];

        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `payslip_${employee.name.replace(' ','_')}_${formatDate(payslipData.payDate)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loadingHistory) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <LogoIcon className="h-12 w-12 mx-auto animate-pulse text-primary" />
                    <p className="mt-4 text-gray-600 font-medium">Loading Payslip History...</p>
                </div>
            </div>
        );
    }

    if (historyError && userPayslipHistory.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Error Loading Payslips</h2>
                    <p className="text-gray-500 mt-2">{historyError}</p>
                </div>
            </div>
        );
    }

    if (userPayslipHistory.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">No Payslips Available</h2>
                    <p className="text-gray-500 mt-2">There are no payslips to display for {employee.name}.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {isLoading && (
                 <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl animate-fade-in text-center">
                    <LogoIcon className="h-12 w-12 mx-auto animate-pulse text-primary" />
                    <p className="mt-4 text-gray-600 font-medium">Loading Payslip...</p>
                 </div>
            )}
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">
                <p><strong>Error:</strong> {error}</p>
            </div>}

            {!isLoading && !error && payslipData && (
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl animate-fade-in">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start border-b pb-6 mb-6">
                        <div className='mb-4 md:mb-0'>
                            <h1 className="text-3xl font-bold text-gray-900">Payslip</h1>
                            <p className="text-gray-500">{employee.name}</p>
                        </div>
                        <div className="text-left md:text-right w-full md:w-auto">
                             <div className="flex items-center md:justify-end space-x-2">
                                 <LogoIcon className="h-7 w-7" />
                                 <span className="text-lg font-bold text-gray-700">Opoint</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Pay Date: <span className="font-medium text-gray-700">{formatDate(payslipData.payDate)}</span></p>
                            <p className="text-sm text-gray-500">Pay Period: <span className="font-medium text-gray-700">{formatDate(payslipData.payPeriodStart)} - {formatDate(payslipData.payPeriodEnd)}</span></p>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center">
                        <div className="bg-green-50 p-4 rounded-lg"><p className="text-sm font-medium text-green-700 uppercase">Gross Pay</p><p className="text-3xl font-bold text-green-600">{formatCurrency(payslipData.grossPay)}</p></div>
                        <div className="bg-red-50 p-4 rounded-lg"><p className="text-sm font-medium text-red-700 uppercase">Total Deductions</p><p className="text-3xl font-bold text-red-600">{formatCurrency(payslipData.totalDeductions)}</p></div>
                        <div className="bg-primary-light p-4 rounded-lg border-2 border-primary"><p className="text-sm font-medium text-primary uppercase">Net Pay</p><p className="text-3xl font-bold text-primary">{formatCurrency(payslipData.netPay)}</p></div>
                    </div>
                    
                    {/* Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Earnings</h3>
                                <div className="flex justify-between items-center text-sm p-2"><p className="text-gray-600">Basic Salary</p><p className="font-medium text-gray-800">{formatCurrency(payslipData.basicSalary)}</p></div>
                                {payslipData.hoursDeduction && (
                                    <div className="flex justify-between items-center text-sm p-2 bg-orange-50 border border-orange-200 rounded-md mt-2">
                                        <p className="text-orange-700 text-xs">
                                            <span className="font-medium">Deduction from Basic Salary:</span><br/>
                                            {payslipData.hoursDeduction.description}
                                        </p>
                                        <p className="font-medium text-orange-700">-{formatCurrency(payslipData.hoursDeduction.amount)}</p>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm p-2 mt-2 border-t-2 font-bold"><p className="text-gray-800">Total Earnings (Gross Pay)</p><p className="text-gray-900">{formatCurrency(payslipData.grossPay)}</p></div>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Deductions</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50"><p className="text-gray-600">SSNIT Employee Contribution (5.5%)</p><p className="font-medium text-gray-800">{formatCurrency(payslipData.ssnitEmployee)}</p></div>
                                    <div className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50"><p className="text-gray-600">P.A.Y.E Tax</p><p className="font-medium text-gray-800">{formatCurrency(payslipData.paye)}</p></div>
                                    {payslipData.otherDeductions.map((item, index) => (<div key={index} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50"><p className="text-gray-600">{item.description}</p><p className="font-medium text-gray-800">{formatCurrency(item.amount)}</p></div>))}
                                </div>
                                <div className="flex justify-between items-center text-sm p-2 mt-2 border-t-2 font-bold"><p className="text-gray-800">Total Deductions</p><p className="text-gray-900">{formatCurrency(payslipData.totalDeductions)}</p></div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-lg">
                             <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Employer Contributions</h3>
                             <p className="text-xs text-gray-500 mb-3">This is the cost to the company and is not deducted from your salary.</p>
                             <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center p-2 rounded-md"><p className="text-gray-600">SSNIT Employer Contribution (13%)</p><p className="font-medium text-gray-800">{formatCurrency(payslipData.ssnitEmployer)}</p></div>
                                <div className="flex justify-between items-center p-2 mt-2 border-t-2 font-bold"><p className="text-gray-800">Total SSNIT Contribution</p><p className="text-gray-900">{formatCurrency(payslipData.ssnitEmployee + payslipData.ssnitEmployer)}</p></div>
                             </div>
                             <div className="text-xs text-gray-500 mt-2 pl-2 space-y-1">
                                <div className="flex justify-between"><span>Tier 1 (to SSNIT):</span><span>{formatCurrency(payslipData.ssnitTier1)}</span></div>
                                <div className="flex justify-between"><span>Tier 2 (to Private Fund):</span><span>{formatCurrency(payslipData.ssnitTier2)}</span></div>
                             </div>
                        </div>
                    </div>
                    {/* Actions */}
                    <div className="mt-8 border-t pt-6 flex flex-col sm:flex-row justify-end items-center gap-4">
                        <button onClick={handleDownloadCSV} className="w-full sm:w-auto text-sm bg-slate-100 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors">
                            Download Payslip (CSV)
                        </button>
                        {isManager && (
                            <button onClick={() => onViewChange('payroll')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                <SmartphoneIcon className="h-5 w-5" />
                                <span>Pay with Mobile Money</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <div className="mt-8 bg-white rounded-xl shadow-lg">
                <button onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} className="w-full flex justify-between items-center text-left p-6">
                    <h2 className="text-xl font-bold text-gray-800">Pay History</h2>
                    <ChevronDownIcon className={`h-6 w-6 text-gray-600 transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isHistoryExpanded && (
                    <div className="px-6 pb-6 border-t animate-fade-in-down">
                        {sortedYears.map(year => (
                            <div key={year} className="mt-4">
                                <h3 className="font-semibold text-lg text-gray-700 mb-2">{year}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {groupedPayslips[year].map(p => (
                                        <button key={p.id} onClick={() => { setSelectedPayslipId(p); setIsHistoryExpanded(false); }}
                                            className={`w-full text-left p-3 rounded-md transition-colors text-sm ${selectedPayslipId?.id === p.id ? 'bg-primary text-white font-semibold shadow' : 'bg-gray-100 hover:bg-primary-light hover:text-primary text-gray-700'}`}>
                                            <p>Pay Date: {formatDate(p.payDate!)}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


const Payslips = ({ currentUser, onViewChange }: PayslipsProps) => {
    const isManager = [UserRole.ADMIN, UserRole.HR, UserRole.PAYMENTS].includes(currentUser.role);
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [employees, setEmployees] = useState<User[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);

    // Helper function to get user initials
    const getUserInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    };

    // Fetch employees on component mount
    useEffect(() => {
        const fetchEmployees = async () => {
            setLoadingEmployees(true);
            try {
                const data = await api.getUsers(currentUser.tenantId || '');
                setEmployees(data);
            } catch (error) {
                console.error('Failed to fetch employees:', error);
                // Fallback to mock data
                setEmployees(USERS.filter(u => u.tenantId === currentUser.tenantId));
            } finally {
                setLoadingEmployees(false);
            }
        };

        if (isManager) {
            fetchEmployees();
        }
    }, [currentUser.tenantId, isManager]);

    // Debounce search query with 300ms delay
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Filter employees based on debounced search query and current user's company
    const filteredEmployees = useMemo(() => {
        // Filter by company first
        const companyEmployees = employees;
        
        // Then filter by search query
        if (!debouncedSearchQuery.trim()) return companyEmployees;
        return companyEmployees.filter(user => 
            user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            user.team.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        );
    }, [debouncedSearchQuery, employees]);

    if (isManager && !selectedEmployee) {
        if (loadingEmployees) {
            return (
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="text-center py-12">
                        <LogoIcon className="h-12 w-12 mx-auto animate-pulse text-primary" />
                        <p className="mt-4 text-gray-600 font-medium">Loading Employees...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Select Employee to View Payslips</h2>
                    <div className="relative flex-shrink-0 sm:w-80">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, team, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredEmployees.length > 0 ? (
                        filteredEmployees.map(user => (
                            <button key={user.id} onClick={() => setSelectedEmployee(user)} className="p-4 border rounded-lg text-center hover:shadow-lg hover:border-primary transition-all duration-200">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name} className="w-16 h-16 rounded-full mx-auto mb-3" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-primary text-white flex items-center justify-center text-lg font-bold">
                                        {getUserInitials(user.name)}
                                    </div>
                                )}
                                <p className="font-semibold text-gray-800">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.team}</p>
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <p className="text-lg">No employees found</p>
                            <p className="text-sm mt-2">Try adjusting your search query</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    const employeeToView = isManager ? selectedEmployee! : currentUser;

    return (
        <div>
            {isManager && (
                <button onClick={() => setSelectedEmployee(null)} className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-primary mb-6">
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span>Back to Employee List</span>
                </button>
            )}
            <PayslipDetailView employee={employeeToView} onViewChange={onViewChange} isManager={isManager} />
        </div>
    );
};

export default Payslips;
