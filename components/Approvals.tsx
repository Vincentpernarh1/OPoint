
import React, { useState, useEffect, useMemo } from 'react';
import { USERS, LEAVE_REQUESTS, ADJUSTMENT_REQUESTS, EXPENSE_REQUESTS, PROFILE_UPDATE_REQUESTS } from '../constants';
import { LeaveRequest, AdjustmentRequest, RequestStatus, User, ExpenseRequest, ProfileUpdateRequest, LeaveType, UserRole } from '../types';
import { CheckIcon, XIcon } from './Icons';
import EmployeeLogModal from './EmployeeLogModal';
import { api } from '../services/api';

interface ViewingLogState {
    user: User;
    date: Date;
}

interface ApprovalsProps {
    currentUser: User;
}

const getUser = (userId: string): User | undefined => USERS.find(u => u.id === userId);

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);

const Approvals = ({ currentUser }: ApprovalsProps) => {
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequest[]>(ADJUSTMENT_REQUESTS.filter(r => r.status === RequestStatus.PENDING));
    const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>(EXPENSE_REQUESTS.filter(r => r.status === RequestStatus.PENDING));
    const [profileRequests, setProfileRequests] = useState<ProfileUpdateRequest[]>(PROFILE_UPDATE_REQUESTS.filter(r => r.status === RequestStatus.PENDING));
    
    const [activeTab, setActiveTab] = useState('leave');
    const [viewingLog, setViewingLog] = useState<ViewingLogState | null>(null);
    const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaveRequests = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await api.getLeaveRequests(currentUser.tenantId, { status: 'pending' });
                // Transform the data to match the LeaveRequest interface
                const transformedData: LeaveRequest[] = data.map((item: any) => ({
                    id: item.id,
                    userId: item.employee_id, // Database uses employee_id
                    employeeName: item.employee_name, // Include employee name
                    leaveType: item.leave_type as LeaveType,
                    startDate: new Date(item.start_date),
                    endDate: new Date(item.end_date),
                    reason: item.reason,
                    status: item.status as RequestStatus
                }));
                setLeaveRequests(transformedData);
            } catch (err) {
                console.error('Failed to fetch leave requests:', err);
                setError('Failed to load leave requests');
                // Fallback to mock data
                setLeaveRequests(LEAVE_REQUESTS.filter(r => r.status === RequestStatus.PENDING));
            } finally {
                setLoading(false);
            }
        };

        fetchLeaveRequests();
    }, [currentUser.tenantId]);

    const handleAction = async (idOrSetter: string | ((prev: any[]) => any[]), actionOrId: 'approve' | 'reject' | 'cancel' | string, action?: 'approve' | 'reject' | 'cancel') => {
        // Handle leave requests: handleAction(id, action)
        if (typeof idOrSetter === 'string' && typeof actionOrId === 'string' && (actionOrId === 'approve' || actionOrId === 'reject' || actionOrId === 'cancel')) {
            const id = idOrSetter;
            const actionType = actionOrId;
            try {
                const status = actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'cancelled';
                await api.updateLeaveRequest(currentUser.tenantId, id, { 
                    status
                });
                
                // Remove from local state
                setLeaveRequests(prev => prev.filter(req => req.id !== id));
            } catch (err) {
                console.error(`Failed to ${actionType} leave request:`, err);
                setError(`Failed to ${actionType} leave request`);
            }
        }
        // Handle other requests: handleAction(setStateFunction, id)
        else if (typeof idOrSetter === 'function' && typeof actionOrId === 'string') {
            const setStateFunction = idOrSetter;
            const id = actionOrId;
            // For mock data, just remove from local state
            setStateFunction((prev: any[]) => prev.filter(req => req.id !== id));
        }
    };

    const handleViewLog = (userId: string, date: Date) => {
        const user = getUser(userId);
        if (user) {
            setViewingLog({ user, date });
        }
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
        { id: 'leave', label: 'Leave', count: leaveRequests.length },
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
                            <div className="flex justify-end">
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
                                        <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center bg-slate-50">
                                            <div>
                                                <p className="font-semibold">{req.employeeName || getUser(req.userId)?.name}</p>
                                                <p className="text-sm text-gray-600">{req.leaveType}: {new Date(req.startDate).toLocaleDateString('en-US')} - {new Date(req.endDate).toLocaleDateString('en-US')}</p>
                                                <p className="text-xs text-gray-500 mt-1">{req.reason}</p>
                                            </div>
                                            <div className="flex space-x-2">
                                                {currentUser.role === UserRole.ADMIN ? (
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
                                                ) : (
                                                    <button 
                                                        title="Cancel leave request"
                                                        onClick={() => handleAction(req.id, 'cancel')} 
                                                        className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
                                                    >
                                                        <XIcon className="h-5 w-5"/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredLeaveRequests.length === 0 && <p className="text-gray-500 text-center py-8">No pending leave requests found.</p>}
                                </>
                            )}
                        </div>
                    )}
                    {activeTab === 'adjustments' && (
                         <div className="space-y-4">
                            {adjustmentRequests.map(req => (
                                <div key={req.id} className="p-4 border rounded-lg flex flex-col items-stretch bg-slate-50">
                                    <div className="flex justify-between items-start w-full">
                                        <div>
                                            <p className="font-semibold">{getUser(req.userId)?.name}</p>
                                            <p className="text-sm text-gray-600">{new Date(req.date).toLocaleDateString('en-US')}: {req.adjustedTime}</p>
                                            <p className="text-xs text-gray-500 mt-1">{req.reason}</p>
                                        </div>
                                        <div className="flex space-x-2 flex-shrink-0">
                                            {currentUser.role === UserRole.ADMIN ? (
                                                <>
                                                    <button title="Approve time adjustment" onClick={() => handleAction(setAdjustmentRequests, req.id)} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><CheckIcon className="h-5 w-5"/></button>
                                                    <button title="Reject time adjustment" onClick={() => handleAction(setAdjustmentRequests, req.id)} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><XIcon className="h-5 w-5"/></button>
                                                </>
                                            ) : (
                                                <button title="Cancel time adjustment" onClick={() => handleAction(setAdjustmentRequests, req.id)} className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"><XIcon className="h-5 w-5"/></button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t text-left"><button onClick={() => handleViewLog(req.userId, req.date)} className="text-sm font-medium text-primary hover:underline">View Activity for this Day</button></div>
                                </div>
                            ))}
                            {adjustmentRequests.length === 0 && <p className="text-gray-500 text-center py-8">No pending time adjustment requests.</p>}
                        </div>
                    )}
                    {activeTab === 'expenses' && (
                        <div className="space-y-4">
                            {expenseRequests.map(req => (
                                <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center bg-slate-50">
                                    <div>
                                        <p className="font-semibold">{getUser(req.userId)?.name}</p>
                                        <p className="text-sm text-gray-600">{req.description} - <span className="font-bold">{formatCurrency(req.amount)}</span></p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(req.date).toLocaleDateString('en-US')}</p>
                                        {req.receiptUrl && <a href={req.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View Receipt</a>}
                                    </div>
                                    <div className="flex space-x-2">
                                        {currentUser.role === UserRole.ADMIN ? (
                                            <>
                                                <button title="Approve expense claim" onClick={() => handleAction(setExpenseRequests, req.id)} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><CheckIcon className="h-5 w-5"/></button>
                                                <button title="Reject expense claim" onClick={() => handleAction(setExpenseRequests, req.id)} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><XIcon className="h-5 w-5"/></button>
                                            </>
                                        ) : (
                                            <button title="Cancel expense claim" onClick={() => handleAction(setExpenseRequests, req.id)} className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"><XIcon className="h-5 w-5"/></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {expenseRequests.length === 0 && <p className="text-gray-500 text-center py-8">No pending expense claims.</p>}
                        </div>
                    )}
                    {activeTab === 'profile' && (
                         <div className="space-y-4">
                            {profileRequests.map(req => (
                                <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center bg-slate-50">
                                    <div>
                                        <p className="font-semibold">{getUser(req.userId)?.name}</p>
                                        <div className="text-sm text-gray-600 mt-1 space-y-1">{renderFieldChanges(req.fields)}</div>
                                    </div>
                                    <div className="flex space-x-2">
                                        {currentUser.role === UserRole.ADMIN ? (
                                            <>
                                                <button title="Approve profile update" onClick={() => handleAction(setProfileRequests, req.id)} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"><CheckIcon className="h-5 w-5"/></button>
                                                <button title="Reject profile update" onClick={() => handleAction(setProfileRequests, req.id)} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><XIcon className="h-5 w-5"/></button>
                                            </>
                                        ) : (
                                            <button title="Cancel profile update" onClick={() => handleAction(setProfileRequests, req.id)} className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"><XIcon className="h-5 w-5"/></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {profileRequests.length === 0 && <p className="text-gray-500 text-center py-8">No pending profile update requests.</p>}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Approvals;
