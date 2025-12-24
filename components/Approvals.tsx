
import React, { useState, useEffect, useMemo } from 'react';
import { USERS, LEAVE_REQUESTS, ADJUSTMENT_REQUESTS, EXPENSE_REQUESTS, PROFILE_UPDATE_REQUESTS } from '../constants';
import { LeaveRequest, AdjustmentRequest, RequestStatus, User, ExpenseRequest, ProfileUpdateRequest, LeaveType, UserRole } from '../types';
import { CheckIcon, XIcon } from './Icons';
import EmployeeLogModal from './EmployeeLogModal';
import { api } from '../services/api';

interface ViewingLogState {
    user: User;
    date: Date;
    adjustment?: any;
}

interface ApprovalsProps {
    currentUser: User;
}

const getUser = (userId: string): User | undefined => USERS.find(u => u.id === userId);

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);

const Approvals = ({ currentUser }: ApprovalsProps) => {
    // Helper to format/normalize server-provided dates to local YYYY-MM-DD
    const canonicalDate = (d: Date | string | undefined) => {
        if (!d) return '';
        try {
            const dt = d instanceof Date ? d : new Date(d);
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    };

    // Build a local Date from a YYYY-MM-DD string (avoids UTC midnight shift)
    const localDateFromYMD = (ymd: string | undefined | null) => {
        if (!ymd) return undefined;
        const parts = String(ymd).split('-').map(p => parseInt(p, 10));
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        // Fallback
        return new Date(ymd);
    };
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequest[]>([]);
    const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
    const [profileRequests, setProfileRequests] = useState<any[]>([]);
    const [profileStatusFilter, setProfileStatusFilter] = useState<string>('Pending');
    
    const [activeTab, setActiveTab] = useState('leave');
    const [viewingLog, setViewingLog] = useState<ViewingLogState | null>(null);
    const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('All');
    const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('Pending');
    const [adjustmentStatusFilter, setAdjustmentStatusFilter] = useState<string>('Pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Fetch leave requests
                const leaveData = await api.getLeaveRequests(currentUser.tenantId, { 
                    status: leaveStatusFilter === 'All' ? undefined : leaveStatusFilter 
                });
                const transformedLeaveData: LeaveRequest[] = leaveData.map((item: any) => ({
                    id: item.id,
                    userId: item.employee_id,
                    employeeName: item.employee_name,
                    leaveType: item.leave_type as LeaveType,
                    startDate: new Date(item.start_date),
                    endDate: new Date(item.end_date),
                    reason: item.reason,
                    status: item.status as RequestStatus
                }));
                
                // Fetch time adjustment requests
                const adjustmentData = await api.getTimeAdjustmentRequests(currentUser.tenantId, { 
                    status: adjustmentStatusFilter === 'All' ? undefined : adjustmentStatusFilter 
                });


                console.log("<Mnual checking : ",adjustmentData);
                
                // Filter out adjustment requests from the current user to prevent self-approval
                const filteredAdjustmentData = adjustmentData.filter((item: any) => item.employee_id !== currentUser.id);
                
                const transformedAdjustmentData: AdjustmentRequest[] = filteredAdjustmentData.map((item: any) => {
                    // Determine a safe date string (YYYY-MM-DD) without constructing Dates from null
                    const dateFromRequestedClockIn = item.requested_clock_in ? canonicalDate(new Date(item.requested_clock_in)) : '';
                    const dateFromRequestedClockOut = item.requested_clock_out ? canonicalDate(new Date(item.requested_clock_out)) : '';
                    const dateFromClockIn = item.clock_in ? canonicalDate(new Date(item.clock_in)) : '';
                    const dateStr = item.requested_date || dateFromRequestedClockIn || dateFromRequestedClockOut || dateFromClockIn || '';

                    return {
                        id: item.id,
                        userId: item.employee_id,
                        employeeName: item.employee_name,
                        date: dateStr,
                        originalClockIn: item.clock_in ? new Date(item.clock_in) : undefined,
                        originalClockOut: item.clock_out ? new Date(item.clock_out) : undefined,
                        requestedClockIn: item.requested_clock_in ? new Date(item.requested_clock_in) : undefined,
                        requestedClockOut: item.requested_clock_out ? new Date(item.requested_clock_out) : undefined,
                        reason: item.adjustment_reason,
                        status: item.adjustment_status as RequestStatus,
                        reviewedBy: item.adjustment_reviewed_by,
                        reviewedAt: item.adjustment_reviewed_at ? new Date(item.adjustment_reviewed_at) : undefined
                    } as AdjustmentRequest;
                });
                
                // Fetch profile update requests
                const profileData = await api.getProfileUpdateRequests(currentUser.tenantId, {
                    status: profileStatusFilter === 'All' ? undefined : profileStatusFilter
                });

                // Fetch expense claims
                const expenseData = await api.getExpenseClaims(currentUser.tenantId, {
                    status: 'pending' // Only show pending for approval
                });
                
                // Use only API data - no mock data fallback
                setLeaveRequests(transformedLeaveData);
                setAdjustmentRequests(transformedAdjustmentData);
                setProfileRequests(profileData);
                setExpenseRequests(expenseData);
            } catch (err) {
                console.error('Failed to fetch requests:', err);
                setError('Failed to load requests');
                // No mock data fallback - show empty arrays on error
                setLeaveRequests([]);
                setAdjustmentRequests([]);
                setProfileRequests([]);
                setExpenseRequests([]);
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        fetchRequests();

        // Set up polling every 30 seconds for real-time updates
        const pollInterval = setInterval(fetchRequests, 30000);

        // Cleanup interval on unmount
        return () => clearInterval(pollInterval);
    }, [currentUser.tenantId, leaveStatusFilter, adjustmentStatusFilter, profileStatusFilter]);

    const handleAction = async (idOrSetter: string | ((prev: any[]) => any[]), actionOrId: 'approve' | 'reject' | 'cancel' | string, action?: 'approve' | 'reject' | 'cancel' | 'adjustment' | 'profile' | 'expense') => {
        // Handle leave requests: handleAction(id, action) - no third parameter
        if (typeof idOrSetter === 'string' && typeof actionOrId === 'string' && (actionOrId === 'approve' || actionOrId === 'reject' || actionOrId === 'cancel') && !action) {
            const id = idOrSetter;
            const actionType = actionOrId;
            try {
                const status = actionType === 'approve' ? 'Approved' : actionType === 'reject' ? 'Rejected' : 'Cancelled';

                // Make API call directly without checking local state first
                await api.updateLeaveRequest(currentUser.tenantId, id, {
                    status
                });

                // If approved, update leave balance
                if (actionType === 'approve') {
                    // Get the leave request details from local state for balance calculation
                    const leaveRequest = leaveRequests.find(req => req.id === id);
                    if (leaveRequest) {
                        try {
                            // Calculate number of days
                            const startDate = new Date(leaveRequest.startDate);
                            const endDate = new Date(leaveRequest.endDate);
                            const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates

                            await api.updateLeaveBalance(currentUser.tenantId, leaveRequest.userId, leaveRequest.leaveType, daysCount);
                        } catch (balanceError) {
                            console.warn('Could not update leave balance (table may not exist yet):', balanceError);
                            // Don't fail the approval if balance update fails
                        }
                    }
                }

                // Update status in local state - if not found, it might have been removed by polling, which is fine
                setLeaveRequests(prev => prev.map(req =>
                    req.id === id ? { ...req, status: status as RequestStatus } : req
                ));
            } catch (err) {
                console.error(`Failed to ${actionType} leave request:`, err);
                setError(`Failed to ${actionType} leave request`);
            }
        }
        // Handle time adjustment requests: handleAction(id, action, 'adjustment')
        else if (typeof idOrSetter === 'string' && typeof actionOrId === 'string' && (actionOrId === 'approve' || actionOrId === 'reject' || actionOrId === 'cancel') && action === 'adjustment') {
            const id = idOrSetter;
            const actionType = actionOrId;
            try {
                const status = actionType === 'approve' ? 'Approved' : actionType === 'reject' ? 'Rejected' : 'Cancelled';
                
                // Get the adjustment request to access requested times
                const adjustmentRequest = adjustmentRequests.find(req => req.id === id);
                
                const updateData: any = { 
                    status,
                    reviewed_by: currentUser.id
                };
                
                // If approving, include the requested times
                if (actionType === 'approve' && adjustmentRequest) {
                    updateData.requested_clock_in = adjustmentRequest.requestedClockIn.toISOString();
                    updateData.requested_clock_out = adjustmentRequest.requestedClockOut.toISOString();
                    // Also include an explicit date-only field so server can persist the intended local date
                    updateData.requested_date = adjustmentRequest.date;
                }
                
                console.log('Calling update API with:', updateData);
                await api.updateTimeAdjustmentRequest(currentUser.tenantId, id, updateData);
                console.log('API call successful');
                
                // Update status in local state instead of removing
                setAdjustmentRequests(prev => prev.map(req => 
                    req.id === id ? { 
                        ...req, 
                        status: status as RequestStatus,
                        reviewedBy: currentUser.id,
                        reviewedAt: new Date()
                    } : req
                ));
                console.log('Updated local state');
            } catch (err) {
                console.error(`Failed to ${actionType} time adjustment request:`, err);
                setError(`Failed to ${actionType} time adjustment request`);
            }
        }
        // Handle profile update requests: handleAction(id, action, 'profile')
        else if (typeof idOrSetter === 'string' && typeof actionOrId === 'string' && (actionOrId === 'approve' || actionOrId === 'reject') && action === 'profile') {
            const id = idOrSetter;
            const actionType = actionOrId;
            try {
                if (actionType === 'approve') {
                    await api.approveProfileUpdateRequest(currentUser.tenantId, id, currentUser.id);

                    // Emit a global event so other parts of the app can refresh stale user data
                    try {
                        const req = profileRequests.find(r => r.id === id);
                        if (req) {
                            const evt = new CustomEvent('employee-updated', { detail: { userId: req.employee_id, field: req.field_name, value: req.requested_value } });
                            window.dispatchEvent(evt);
                        } else {
                            // Fallback: dispatch a generic employee-updated event without details
                            window.dispatchEvent(new CustomEvent('employee-updated'));
                        }
                    } catch (ex) {
                        // Non-fatal: continue even if event dispatch fails
                        console.warn('Could not dispatch employee-updated event', ex);
                    }
                } else {
                    await api.rejectProfileUpdateRequest(currentUser.tenantId, id, currentUser.id);
                }

                // Update status in local state
                setProfileRequests(prev => prev.map(req =>
                    req.id === id ? {
                        ...req,
                        status: actionType === 'approve' ? 'Approved' : 'Rejected',
                        reviewed_by: currentUser.id,
                        reviewed_at: new Date().toISOString()
                    } : req
                ));
            } catch (err) {
                console.error(`Failed to ${actionType} profile update request:`, err);
                setError(`Failed to ${actionType} profile update request`);
            }
        }
        // Handle expense claims: handleAction(id, action, 'expense')
        else if (typeof idOrSetter === 'string' && typeof actionOrId === 'string' && (actionOrId === 'approve' || actionOrId === 'reject') && action === 'expense') {
            const id = idOrSetter;
            const actionType = actionOrId;
            try {
                const status = actionType === 'approve' ? 'approved' : 'rejected';
                await api.updateExpenseClaim(currentUser.tenantId, id, {
                    status,
                    reviewed_by: currentUser.id
                });

                // Update status in local state
                setExpenseRequests(prev => prev.map(req =>
                    req.id === id ? {
                        ...req,
                        status: status as RequestStatus,
                        reviewed_by: currentUser.id,
                        reviewed_at: new Date().toISOString()
                    } : req
                ));
            } catch (err) {
                console.error(`Failed to ${actionType} expense claim:`, err);
                setError(`Failed to ${actionType} expense claim`);
            }
        }
        // Handle other requests: handleAction(setStateFunction, id)
        else if (typeof idOrSetter === 'function' && typeof actionOrId === 'string') {
            const setStateFunction = idOrSetter as React.Dispatch<React.SetStateAction<any[]>>;
            const id = actionOrId;
            // For mock data, just remove from local state
            setStateFunction((prev: any[]) => prev.filter(req => req.id !== id));
        }
    };

    const handleViewLog = (req: any) => {
        let user = getUser(req.userId);
        if (!user) {
            // Create a temporary user object for API-based users
            user = {
                id: req.userId,
                name: req.employeeName || 'Unknown Employee',
                email: '',
                role: UserRole.EMPLOYEE,
                avatarUrl: '',
                team: '',
                tenantId: currentUser.tenantId,
                basicSalary: 0,
                hireDate: new Date(),
            };
        }
        const localDate = localDateFromYMD(req.date) || new Date(req.date);
        setViewingLog({ user, date: localDate, adjustment: req });
    };
    
    const renderFieldChanges = (fields: Partial<User>) => {
        return Object.entries(fields).map(([key, value]) => (
            <div key={key} className="text-xs">
                <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {String(value)}
            </div>
        ));
    };

    const filteredLeaveRequests = useMemo(() => {
        if (leaveTypeFilter === 'All') return leaveRequests;
        return leaveRequests.filter(req => req.leaveType === leaveTypeFilter);
    }, [leaveRequests, leaveTypeFilter]);

    const tabs = [
        { id: 'leave', label: 'Leave', count: filteredLeaveRequests.length },
        { id: 'adjustments', label: 'Time Adjustments', count: adjustmentRequests.length },
        { id: 'expenses', label: 'Expense Claims', count: expenseRequests.length },
        { id: 'profile', label: 'Profile Updates', count: profileRequests.length },
    ];

    return (
        <>
            {viewingLog && (
                <EmployeeLogModal 
                    user={viewingLog.user} 
                    date={viewingLog.date} 
                    onClose={() => setViewingLog(null)} 
                />
            )}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Approval Requests</h2>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                        {tabs.map(tab => (
                             <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="mt-6">
                    {activeTab === 'leave' && (
                        <div className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}
                            <div className="flex justify-end space-x-4">
                                <select 
                                    title="Filter by status"
                                    value={leaveStatusFilter} 
                                    onChange={(e) => setLeaveStatusFilter(e.target.value)}
                                    className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md border"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                                <select 
                                    title="Filter by leave type"
                                    value={leaveTypeFilter} 
                                    onChange={(e) => setLeaveTypeFilter(e.target.value)}
                                    className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md border"
                                >
                                    <option value="All">All Leave Types</option>
                                    <option value={LeaveType.ANNUAL}>{LeaveType.ANNUAL}</option>
                                    <option value={LeaveType.SICK}>{LeaveType.SICK}</option>
                                    <option value={LeaveType.MATERNITY}>{LeaveType.MATERNITY}</option>
                                </select>
                            </div>
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <p className="mt-2 text-gray-500">Loading leave requests...</p>
                                </div>
                            ) : (
                                <>
                                    {filteredLeaveRequests.map(req => (
                                        <div key={req.id} className={`p-4 border rounded-lg flex justify-between items-center ${req.status === RequestStatus.APPROVED ? 'bg-green-50 border-green-200' : req.status === RequestStatus.REJECTED ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                                            <div>
                                                <p className="font-semibold">{req.employeeName || getUser(req.userId)?.name}</p>
                                                <p className="text-sm text-gray-600">{req.leaveType}: {new Date(req.startDate).toLocaleDateString('en-US')} - {new Date(req.endDate).toLocaleDateString('en-US')}</p>
                                                <p className="text-xs text-gray-500 mt-1">{req.reason}</p>
                                                <p className={`text-xs font-semibold mt-1 ${req.status === RequestStatus.APPROVED ? 'text-green-600' : req.status === RequestStatus.REJECTED ? 'text-red-600' : 'text-blue-600'}`}>
                                                    Status: {req.status}
                                                </p>
                                            </div>
                                            <div className="flex space-x-2">
                                                {currentUser.role === UserRole.ADMIN && req.status === RequestStatus.PENDING ? (
                                                    <>
                                                        <button 
                                                            title="Approve leave request"
                                                            onClick={() => handleAction(req.id, 'approve')} 
                                                            className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"
                                                        >
                                                            <CheckIcon className="h-5 w-5"/>
                                                        </button>
                                                        <button 
                                                            title="Reject leave request"
                                                            onClick={() => handleAction(req.id, 'reject')} 
                                                            className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                                        >
                                                            <XIcon className="h-5 w-5"/>
                                                        </button>
                                                    </>
                                                ) : req.status === RequestStatus.PENDING && currentUser.role !== UserRole.ADMIN ? (
                                                    <button 
                                                        title="Cancel leave request"
                                                        onClick={() => handleAction(req.id, 'cancel')} 
                                                        className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
                                                    >
                                                        <XIcon className="h-5 w-5"/>
                                                    </button>
                                                ) : (
                                                    <span className={`text-xs px-2 py-1 rounded ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-800' : req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {req.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredLeaveRequests.length === 0 && <p className="text-gray-500 text-center py-8">No leave requests found.</p>}
                                </>
                            )}
                        </div>
                    )}
                    {activeTab === 'adjustments' && (
                         <div className="space-y-4">
                            <div className="flex justify-end">
                                <select 
                                    title="Filter by status"
                                    value={adjustmentStatusFilter} 
                                    onChange={(e) => setAdjustmentStatusFilter(e.target.value)}
                                    className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md border"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                            {adjustmentRequests.map(req => {
                                const displayDate = localDateFromYMD(req.date) || (req.requestedClockIn ? new Date(req.requestedClockIn) : (req.requestedClockOut ? new Date(req.requestedClockOut) : (req.originalClockIn ? new Date(req.originalClockIn) : undefined)));
                                return (
                                    <div key={req.id} className={`p-4 border rounded-lg flex flex-col items-stretch ${req.status === RequestStatus.APPROVED ? 'bg-green-50 border-green-200' : req.status === RequestStatus.REJECTED ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                                        <div className="flex justify-between items-start w-full">
                                            <div>
                                                <p className="font-semibold">{req.employeeName || getUser(req.userId)?.name || `User ${req.userId}`}</p>
                                                <p className="text-sm text-gray-600">{displayDate ? displayDate.toLocaleDateString('en-US') : '—'}</p>
                                                {(() => {
                                                    const requestedIn = req.requestedClockIn ? new Date(req.requestedClockIn) : (req.originalClockIn ? new Date(req.originalClockIn) : undefined);
                                                    const requestedOut = req.requestedClockOut ? new Date(req.requestedClockOut) : (req.originalClockOut ? new Date(req.originalClockOut) : undefined);
                                                    const usedFallback = !req.requestedClockIn && (req.originalClockIn || req.originalClockOut);
                                                    return (
                                                        <p className="text-sm text-gray-600">
                                                            Requested: {requestedIn ? requestedIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} - {requestedOut ? requestedOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                        </p>
                                                    );
                                                })()}
                                                
                                                <p className="text-xs text-gray-500 mt-1">{req.reason}</p>
                                                <p className={`text-xs font-semibold mt-1 ${req.status === RequestStatus.APPROVED ? 'text-green-600' : req.status === RequestStatus.REJECTED ? 'text-red-600' : 'text-blue-600'}`}>
                                                    Status: {req.status}
                                                </p>
                                            </div>
                                            <div className="flex space-x-2 flex-shrink-0">
                                                {currentUser.role === UserRole.ADMIN && req.status === RequestStatus.PENDING ? (
                                                    <>
                                                        <button title="Approve time adjustment" onClick={() => handleAction(req.id, 'approve', 'adjustment')} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><CheckIcon className="h-5 w-5"/></button>
                                                        <button title="Reject time adjustment" onClick={() => handleAction(req.id, 'reject', 'adjustment')} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><XIcon className="h-5 w-5"/></button>
                                                    </>
                                                ) : req.status === RequestStatus.PENDING && currentUser.role !== UserRole.ADMIN ? (
                                                    <button title="Cancel time adjustment" onClick={() => handleAction(req.id, 'cancel', 'adjustment')} className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"><XIcon className="h-5 w-5"/></button>
                                                ) : (
                                                    <span className={`text-xs px-2 py-1 rounded ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-800' : req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {req.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t text-left"><button onClick={() => handleViewLog(req)} className="text-sm font-medium text-primary hover:underline">View Activity for this Day</button></div>
                                    </div>
                                );
                            })}
                            {adjustmentRequests.length === 0 && <p className="text-gray-500 text-center py-8">No time adjustment requests found.</p>}
                        </div>
                    )}
                    {activeTab === 'expenses' && (
                        <div className="space-y-4">
                            {expenseRequests.map(req => (
                                <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center bg-slate-50">
                                    <div>
                                        <p className="font-semibold">{req.employee_name}</p>
                                        <p className="text-sm text-gray-600">{req.description} - <span className="font-bold">{formatCurrency(req.amount)}</span></p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(req.expense_date).toLocaleDateString('en-US')}</p>
                                        {req.receipt_url && <a href={req.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View Receipt</a>}
                                    </div>
                                    <div className="flex space-x-2">
                                        {currentUser.role === UserRole.ADMIN && req.status === 'pending' ? (
                                            <>
                                                <button title="Approve expense claim" onClick={() => handleAction(req.id, 'approve', 'expense')} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><CheckIcon className="h-5 w-5"/></button>
                                                <button title="Reject expense claim" onClick={() => handleAction(req.id, 'reject', 'expense')} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><XIcon className="h-5 w-5"/></button>
                                            </>
                                        ) : req.status === 'pending' && currentUser.role !== UserRole.ADMIN ? (
                                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">Pending</span>
                                        ) : (
                                            <span className={`text-xs px-2 py-1 rounded ${req.status === 'approved' ? 'bg-green-100 text-green-800' : req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {req.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {expenseRequests.length === 0 && <p className="text-gray-500 text-center py-8">No pending expense claims.</p>}
                        </div>
                    )}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <div className="flex justify-end space-x-4">
                                <select
                                    title="Filter by status"
                                    value={profileStatusFilter}
                                    onChange={(e) => setProfileStatusFilter(e.target.value)}
                                    className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md border"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                            {profileRequests.map(req => (
                                <div key={req.id} className="p-4 border rounded-lg bg-slate-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-semibold">{req.employee_name}</p>
                                            <div className="text-sm text-gray-600 mt-1">
                                                <p><span className="font-medium">Field:</span> {req.field_name === 'mobile_money_number' ? 'Mobile Money Number' : req.field_name}</p>
                                                <p><span className="font-medium">Current:</span> {req.current_value || 'Not set'}</p>
                                                <p><span className="font-medium">Requested:</span> {req.requested_value}</p>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Requested on {new Date(req.requested_at).toLocaleDateString()}
                                            </p>
                                            {req.reviewed_at && (
                                                <p className="text-xs text-gray-500">
                                                    Reviewed on {new Date(req.reviewed_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex space-x-2 flex-shrink-0">
                                            {currentUser.role === UserRole.ADMIN && (req.status === 'Pending' || req.status === 'pending') ? (
                                                <>
                                                    <button
                                                        title="Approve profile update"
                                                        onClick={() => handleAction(req.id, 'approve', 'profile')}
                                                        className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"
                                                    >
                                                        <CheckIcon className="h-5 w-5"/>
                                                    </button>
                                                    <button
                                                        title="Reject profile update"
                                                        onClick={() => handleAction(req.id, 'reject', 'profile')}
                                                        className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                                    >
                                                        <XIcon className="h-5 w-5"/>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    req.status === 'Approved' || req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    req.status === 'Rejected' || req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {profileRequests.length === 0 && <p className="text-gray-500 text-center py-8">No profile update requests found.</p>}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Approvals;
