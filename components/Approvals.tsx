
import React, { useState, useEffect, useMemo } from 'react';
import { USERS, LEAVE_REQUESTS, ADJUSTMENT_REQUESTS, EXPENSE_REQUESTS, PROFILE_UPDATE_REQUESTS } from '../constants';
import { LeaveRequest, AdjustmentRequest, RequestStatus, User, ExpenseRequest, ProfileUpdateRequest, LeaveType, UserRole } from '../types';
import { CheckIcon, XIcon } from './Icons';
import EmployeeLogModal from './EmployeeLogModal';
import PullToRefreshIndicator from './PullToRefreshIndicator';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import { useRefreshable } from '../hooks/useRefreshable';

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
    const isAdmin = useMemo(() => currentUser.role === UserRole.ADMIN, [currentUser.role]);
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
    
    const [activeTab, setActiveTab] = useState('leave');
    const [viewingLog, setViewingLog] = useState<ViewingLogState | null>(null);
    const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('All');
    const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('Pending');
    const [adjustmentStatusFilter, setAdjustmentStatusFilter] = useState<string>('Pending');
    const [profileStatusFilter, setProfileStatusFilter] = useState<string>('Pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const leaveStatusValue = leaveStatusFilter === 'All' ? undefined : leaveStatusFilter;
            const userFilter = isAdmin ? undefined : currentUser.id;
            
            // Build filters object conditionally to avoid passing undefined values
            const leaveFilters: { status?: string; userId?: string } = {};
            if (leaveStatusValue !== undefined) leaveFilters.status = leaveStatusValue;
            if (userFilter !== undefined) leaveFilters.userId = userFilter;
            
            // Fetch leave requests
            const leaveData = await api.getLeaveRequests(currentUser.tenantId!, leaveFilters);
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
            const adjustmentStatusValue = adjustmentStatusFilter === 'All' ? undefined : adjustmentStatusFilter;
            const adjustmentUserFilter = isAdmin ? undefined : currentUser.id;
            
            const adjustmentFilters: { status?: string; userId?: string } = {};
            if (adjustmentStatusValue !== undefined) adjustmentFilters.status = adjustmentStatusValue;
            if (adjustmentUserFilter !== undefined) adjustmentFilters.userId = adjustmentUserFilter;
            
            const adjustmentData = await api.getTimeAdjustmentRequests(currentUser.tenantId!, adjustmentFilters);
            
            // For non-admin, no need to filter out own requests since we already filtered at DB
            const filteredAdjustmentData = isAdmin ? adjustmentData.filter((item: any) => item.employee_id !== currentUser.id) : adjustmentData;
            
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
                    requestedClockIn2: item.requested_clock_in_2 ? new Date(item.requested_clock_in_2) : undefined,
                    requestedClockOut2: item.requested_clock_out_2 ? new Date(item.requested_clock_out_2) : undefined,
                    reason: item.adjustment_reason,
                    status: item.adjustment_status as RequestStatus,
                    reviewedBy: item.adjustment_reviewed_by,
                    reviewedAt: item.adjustment_reviewed_at ? new Date(item.adjustment_reviewed_at) : undefined
                } as AdjustmentRequest;
            });
            
            // Fetch profile update requests
            const profileStatusValue = profileStatusFilter === 'All' ? undefined : profileStatusFilter;
            const profileUserFilter = isAdmin ? undefined : currentUser.id;
            
            const profileFilters: { status?: string; userId?: string } = {};
            if (profileStatusValue !== undefined) profileFilters.status = profileStatusValue;
            if (profileUserFilter !== undefined) profileFilters.userId = profileUserFilter;
            
            const profileData = await api.getProfileUpdateRequests(currentUser.tenantId!, profileFilters);

            // Fetch expense claims
            const expenseStatusValue = isAdmin ? 'pending' : undefined;
            const expenseUserFilter = isAdmin ? undefined : currentUser.id;
            
            const expenseFilters: { status?: string; employee_id?: string } = {};
            if (expenseStatusValue !== undefined) expenseFilters.status = expenseStatusValue;
            if (expenseUserFilter !== undefined) expenseFilters.employee_id = expenseUserFilter;
            
            const expenseData = await api.getExpenseClaims(currentUser.tenantId!, expenseFilters);
            
            // Use only API data - cache for offline use
            await offlineStorage.cacheData(`approval_leaves_${leaveStatusFilter}`, transformedLeaveData, currentUser.tenantId!);
            await offlineStorage.cacheData(`approval_adjustments_${adjustmentStatusFilter}`, transformedAdjustmentData, currentUser.tenantId!);
            await offlineStorage.cacheData(`approval_profiles_${profileStatusFilter}`, profileData, currentUser.tenantId!);
            await offlineStorage.cacheData(`approval_expenses`, expenseData, currentUser.tenantId!);
            
            setLeaveRequests(transformedLeaveData);
            setAdjustmentRequests(transformedAdjustmentData);
            setProfileRequests(profileData);
            setExpenseRequests(expenseData);
        } catch (err) {
            console.error('Failed to fetch requests:', err);
            // OFFLINE FALLBACK: Try to load cached data
            try {
                const cachedLeaves = await offlineStorage.getCachedData(`approval_leaves_${leaveStatusFilter}`, currentUser.tenantId!) || [];
                const cachedAdjustments = await offlineStorage.getCachedData(`approval_adjustments_${adjustmentStatusFilter}`, currentUser.tenantId!) || [];
                const cachedProfiles = await offlineStorage.getCachedData(`approval_profiles_${profileStatusFilter}`, currentUser.tenantId!) || [];
                const cachedExpenses = await offlineStorage.getCachedData(`approval_expenses`, currentUser.tenantId!) || [];
                
                setLeaveRequests(cachedLeaves);
                setAdjustmentRequests(cachedAdjustments);
                setProfileRequests(cachedProfiles);
                setExpenseRequests(cachedExpenses);
                
                const hasCache = cachedLeaves.length || cachedAdjustments.length || cachedProfiles.length || cachedExpenses.length;
                if (hasCache) {
                    setError('📴 Offline - Showing cached approval data');
                } else {
                    setError('📴 Offline - No cached data available. Please connect to internet and load data first.');
                }
            } catch (cacheErr) {
                console.error('Failed to load cached data:', cacheErr);
                setError('Failed to load requests. Please check your connection.');
                // Show empty arrays on error
                setLeaveRequests([]);
                setAdjustmentRequests([]);
                setProfileRequests([]);
                setExpenseRequests([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Pull-to-refresh functionality
    const { containerRef, isRefreshing, pullDistance, pullProgress } = useRefreshable(fetchRequests);

    useEffect(() => {


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
                await api.updateLeaveRequest(currentUser.tenantId!, id, {
                    status
                });

                // Note: We no longer update leave balance immediately on approval.
                // Leave balances will be calculated dynamically based on actual passed dates
                // of approved leave requests. See LeaveManagement component for calculation logic.

                // Update status in local state - if not found, it might have been removed by polling, which is fine
                setLeaveRequests(prev => {
                    const updated = prev.map(req =>
                        req.id === id ? { ...req, status: status as RequestStatus } : req
                    );
                    
                    // Also update cache so changes persist across navigation
                    offlineStorage.cacheData('leaveRequests', updated, currentUser.tenantId!, currentUser.id)
                        .catch(e => console.warn('Failed to update cache after action:', e));
                    
                    return updated;
                });
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
                await api.updateTimeAdjustmentRequest(currentUser.tenantId!, id, updateData);
                console.log('API call successful');
                
                // Dispatch event to notify TimeClock to refresh and invalidate cache
                if (adjustmentRequest) {
                    const event = new CustomEvent('adjustment-approved', {
                        detail: {
                            userId: adjustmentRequest.userId,
                            date: adjustmentRequest.date,
                            status: status
                        }
                    });
                    window.dispatchEvent(event);
                }
                
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
                
                // Immediately refetch to get fresh data from server
                await fetchRequests();
            } catch (err) {
                console.error(`Failed to ${actionType} time adjustment request:`, err);
                setError(`Failed to ${actionType} time adjustment request`);
            }
        }
        // Handle profile update requests: handleAction(id, action, 'profile')
        else if (typeof idOrSetter === 'string' && typeof actionOrId === 'string' && (actionOrId === 'approve' || actionOrId === 'reject' || actionOrId === 'cancel') && action === 'profile') {
            const id = idOrSetter;
            const actionType = actionOrId;
            try {
                if (actionType === 'approve') {
                    await api.approveProfileUpdateRequest(currentUser.tenantId!, id, currentUser.id);

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
                } else if (actionType === 'reject') {
                    await api.rejectProfileUpdateRequest(currentUser.tenantId!, id, currentUser.id);
                } else if (actionType === 'cancel') {
                    await api.cancelProfileUpdateRequest(currentUser.tenantId!, id, currentUser.id);
                }

                // Update status in local state
                setProfileRequests(prev => prev.map(req =>
                    req.id === id ? {
                        ...req,
                        status: actionType === 'approve' ? 'Approved' : actionType === 'reject' ? 'Rejected' : 'Cancelled',
                        reviewed_by: actionType === 'cancel' ? currentUser.id : currentUser.id,
                        reviewed_at: new Date().toISOString()
                    } : req
                ));
            } catch (err) {
                console.error(`Failed to ${actionType} profile update request:`, err);
                setError(`Failed to ${actionType} profile update request`);
            }
        }
        // Handle expense claims: handleAction(id, action, 'expense')
        else if (typeof idOrSetter === 'string' && typeof actionOrId === 'string' && (actionOrId === 'approve' || actionOrId === 'reject' || actionOrId === 'cancel') && action === 'expense') {
            const id = idOrSetter;
            const actionType = actionOrId;
            try {
                const status = actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'cancelled';
                await api.updateExpenseClaim(currentUser.tenantId!, id, {
                    status,
                    reviewed_by: currentUser.id
                });

                // Update status in local state
                setExpenseRequests(prev => prev.map(req =>
                    req.id === id ? {
                        ...req,
                        status,
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
                tenantId: currentUser.tenantId!,
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
            <div ref={containerRef} className="h-full overflow-auto">
                {/* Pull-to-refresh indicator */}
                {(pullDistance > 0 || isRefreshing) && (
                    <PullToRefreshIndicator 
                        isRefreshing={isRefreshing}
                        pullDistance={pullDistance}
                        pullProgress={pullProgress}
                    />
                )}
                
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl shadow-xl overflow-hidden mb-8">
                    <div className="px-6 py-8 sm:px-8">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                                <div className="text-3xl">✅</div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Approvals</h1>
                                <p className="text-white/90 text-sm mt-1">Review and manage pending requests</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Modern Tabs */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                        <nav className="flex space-x-2 px-6 py-4 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                            {tabs.map(tab => (
                                <button 
                                    key={tab.id} 
                                    onClick={() => setActiveTab(tab.id)} 
                                    className={`${
                                        activeTab === tab.id 
                                            ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg scale-105' 
                                            : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md'
                                    } flex-shrink-0 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 transform flex items-center space-x-2`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`${
                                        activeTab === tab.id 
                                            ? 'bg-white/30 text-white' 
                                            : 'bg-primary/10 text-primary'
                                    } px-2.5 py-0.5 rounded-full text-xs font-bold`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>
                    {/* Tab Content */}
                    <div className="p-6 sm:p-8">
                        {activeTab === 'leave' && (
                            <div className="space-y-6">
                                {error && (
                                    <div className="bg-gradient-to-r from-red-50 to-red-100/50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl shadow-sm">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg">⚠️</span>
                                            <span className="font-medium">{error}</span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Modern Filters */}
                                <div className="flex flex-col sm:flex-row justify-end gap-3">
                                    <select 
                                        title="Filter by status"
                                        value={leaveStatusFilter} 
                                        onChange={(e) => setLeaveStatusFilter(e.target.value)}
                                        className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <option value="All">📊 All Statuses</option>
                                        <option value="Pending">⏳ Pending</option>
                                        <option value="Approved">✅ Approved</option>
                                        <option value="Rejected">❌ Rejected</option>
                                    </select>
                                    <select 
                                        title="Filter by leave type"
                                        value={leaveTypeFilter} 
                                        onChange={(e) => setLeaveTypeFilter(e.target.value)}
                                        className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <option value="All">🏖️ All Leave Types</option>
                                        <option value={LeaveType.ANNUAL}>🌴 {LeaveType.ANNUAL}</option>
                                        <option value={LeaveType.SICK}>🤒 {LeaveType.SICK}</option>
                                        <option value={LeaveType.MATERNITY}>👶 {LeaveType.MATERNITY}</option>
                                    </select>
                                </div>
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                        <p className="text-gray-600 mt-4 font-medium">Loading requests...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid gap-4">
                                            {filteredLeaveRequests.map((req, index) => {
                                                const days = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                                return (
                                                <div 
                                                    key={req.id} 
                                                    className={`group p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border ${
                                                        req.status === RequestStatus.APPROVED 
                                                            ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 border-green-200' 
                                                            : req.status === RequestStatus.REJECTED 
                                                            ? 'bg-gradient-to-br from-red-50 to-rose-50/50 border-red-200' 
                                                            : 'bg-gradient-to-br from-white to-blue-50/30 border-blue-100'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="bg-white rounded-full p-2 shadow-sm">
                                                                    <span className="text-2xl">
                                                                        {req.leaveType === LeaveType.ANNUAL ? '🌴' : 
                                                                         req.leaveType === LeaveType.SICK ? '🤒' : 
                                                                         req.leaveType === LeaveType.MATERNITY ? '👶' : '🏖️'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-lg font-bold text-gray-900">{req.employeeName}</p>
                                                                    <p className="text-sm text-gray-600 font-medium">{req.leaveType}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="pl-14 space-y-1">
                                                                <div className="flex items-center space-x-2 text-sm text-gray-700">
                                                                    <span className="font-semibold">📅</span>
                                                                    <span>{new Date(req.startDate).toLocaleDateString('en-US')} - {new Date(req.endDate).toLocaleDateString('en-US')}</span>
                                                                </div>
                                                                <div className="flex items-center space-x-2 text-sm text-gray-700">
                                                                    <span className="font-semibold">⏱️</span>
                                                                    <span className="font-medium">{days} {days === 1 ? 'day' : 'days'}</span>
                                                                </div>
                                                                {req.reason && (
                                                                    <div className="flex items-start space-x-2 text-sm text-gray-600 mt-2">
                                                                        <span className="font-semibold mt-0.5">💬</span>
                                                                        <span className="italic">{req.reason}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex space-x-2 flex-shrink-0 ml-4">
                                                            {currentUser.role === UserRole.ADMIN && req.status === RequestStatus.PENDING ? (
                                                                <>
                                                                    <button 
                                                                        title="Approve leave request"
                                                                        onClick={() => handleAction(req.id, 'approve')} 
                                                                        className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200 group-hover:animate-pulse"
                                                                    >
                                                                        <CheckIcon className="h-6 w-6"/>
                                                                    </button>
                                                                    <button 
                                                                        title="Reject leave request"
                                                                        onClick={() => handleAction(req.id, 'reject')} 
                                                                        className="p-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200"
                                                                    >
                                                                        <XIcon className="h-6 w-6"/>
                                                                    </button>
                                                                </>
                                                            ) : req.status === RequestStatus.PENDING && currentUser.role !== UserRole.ADMIN ? (
                                                                <button 
                                                                    title="Cancel leave request"
                                                                    onClick={() => handleAction(req.id, 'cancel')} 
                                                                    className="p-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200"
                                                                >
                                                                    <XIcon className="h-6 w-6"/>
                                                                </button>
                                                            ) : (
                                                                <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                                                                    req.status === RequestStatus.APPROVED 
                                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                                                        : req.status === RequestStatus.REJECTED 
                                                                        ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' 
                                                                        : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                                                }`}>
                                                                    {req.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                            })}
                                        </div>
                                        {filteredLeaveRequests.length === 0 && (
                                            <div className="text-center py-16">
                                                <div className="text-6xl mb-4">📭</div>
                                                <p className="text-gray-500 text-lg font-medium">No leave requests found</p>
                                                <p className="text-gray-400 text-sm mt-2">All caught up!</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {activeTab === 'adjustments' && (
                            <div className="space-y-6">
                                {/* Modern Filter */}
                                <div className="flex justify-end">
                                    <select 
                                        title="Filter by status"
                                        value={adjustmentStatusFilter} 
                                        onChange={(e) => setAdjustmentStatusFilter(e.target.value)}
                                        className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <option value="All">📊 All Statuses</option>
                                        <option value="Pending">⏳ Pending</option>
                                        <option value="Approved">✅ Approved</option>
                                        <option value="Rejected">❌ Rejected</option>
                                    </select>
                                </div>
                                
                                <div className="grid gap-4">
                                    {adjustmentRequests.map(req => {
                                        const displayDate = localDateFromYMD(req.date) || (req.requestedClockIn ? new Date(req.requestedClockIn) : (req.requestedClockOut ? new Date(req.requestedClockOut) : (req.originalClockIn ? new Date(req.originalClockIn) : undefined)));
                                        return (
                                            <div 
                                                key={req.id} 
                                                className={`group p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border ${
                                                    req.status === RequestStatus.APPROVED 
                                                        ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 border-green-200' 
                                                        : req.status === RequestStatus.REJECTED 
                                                        ? 'bg-gradient-to-br from-red-50 to-rose-50/50 border-red-200' 
                                                        : 'bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="bg-white rounded-full p-2 shadow-sm">
                                                                <span className="text-2xl">⏰</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-lg font-bold text-gray-900">{req.employeeName || getUser(req.userId)?.name || `User ${req.userId}`}</p>
                                                                <p className="text-sm text-gray-600 font-medium">{displayDate ? displayDate.toLocaleDateString('en-US') : '—'}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="pl-14 space-y-1">
                                                            {(() => {
                                                                const requestedIn = req.requestedClockIn ? new Date(req.requestedClockIn) : (req.originalClockIn ? new Date(req.originalClockIn) : undefined);
                                                                const requestedOut = req.requestedClockOut ? new Date(req.requestedClockOut) : (req.originalClockOut ? new Date(req.originalClockOut) : undefined);
                                                                const requestedIn2 = req.requestedClockIn2 ? new Date(req.requestedClockIn2) : undefined;
                                                                const requestedOut2 = req.requestedClockOut2 ? new Date(req.requestedClockOut2) : undefined;
                                                                const hasBreakSession = requestedIn2 || requestedOut2;
                                                                
                                                                return (
                                                                    <div className="text-sm text-gray-700 space-y-1">
                                                                        {hasBreakSession ? (
                                                                            <>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="font-semibold">🔵 Session 1:</span>
                                                                                    <span>{requestedIn ? requestedIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} - {requestedOut ? requestedOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="font-semibold">🟢 Session 2:</span>
                                                                                    <span>{requestedIn2 ? requestedIn2.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} - {requestedOut2 ? requestedOut2.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <div className="flex items-center space-x-2">
                                                                                <span className="font-semibold">🕐 Requested:</span>
                                                                                <span>{requestedIn ? requestedIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} - {requestedOut ? requestedOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                            
                                                            {req.reason && (
                                                                <div className="flex items-start space-x-2 text-sm text-gray-600 mt-2">
                                                                    <span className="font-semibold mt-0.5">💬</span>
                                                                    <span className="italic">{req.reason}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex space-x-2 flex-shrink-0 ml-4">
                                                        {currentUser.role === UserRole.ADMIN && req.status === RequestStatus.PENDING ? (
                                                            <>
                                                                <button 
                                                                    title="Approve time adjustment" 
                                                                    onClick={() => handleAction(req.id, 'approve', 'adjustment')} 
                                                                    className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200 group-hover:animate-pulse"
                                                                >
                                                                    <CheckIcon className="h-6 w-6"/>
                                                                </button>
                                                                <button 
                                                                    title="Reject time adjustment" 
                                                                    onClick={() => handleAction(req.id, 'reject', 'adjustment')} 
                                                                    className="p-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200"
                                                                >
                                                                    <XIcon className="h-6 w-6"/>
                                                                </button>
                                                            </>
                                                        ) : req.status === RequestStatus.PENDING && currentUser.role !== UserRole.ADMIN ? (
                                                            <button 
                                                                title="Cancel time adjustment" 
                                                                onClick={() => handleAction(req.id, 'cancel', 'adjustment')} 
                                                                className="p-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200"
                                                            >
                                                                <XIcon className="h-6 w-6"/>
                                                            </button>
                                                        ) : (
                                                            <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                                                                req.status === RequestStatus.APPROVED 
                                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                                                    : req.status === RequestStatus.REJECTED 
                                                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' 
                                                                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                                            }`}>
                                                                {req.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <button 
                                                        onClick={() => handleViewLog(req)} 
                                                        className="text-sm font-semibold text-primary hover:text-purple-600 flex items-center space-x-2 transition-colors"
                                                    >
                                                        <span>📊</span>
                                                        <span>View Activity for this Day</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {adjustmentRequests.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="text-6xl mb-4">📭</div>
                                        <p className="text-gray-500 text-lg font-medium">No time adjustment requests found</p>
                                        <p className="text-gray-400 text-sm mt-2">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'expenses' && (
                            <div className="space-y-6">
                                <div className="grid gap-4">
                                    {expenseRequests.map(req => (
                                        <div 
                                            key={req.id} 
                                            className="group p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-amber-50/30 border border-amber-100"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="bg-white rounded-full p-2 shadow-sm">
                                                            <span className="text-2xl">💰</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-bold text-gray-900">{req.employee_name}</p>
                                                            <p className="text-sm text-gray-600 font-medium">{req.description}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="pl-14 space-y-1">
                                                        <div className="flex items-center space-x-2 text-lg">
                                                            <span className="font-bold text-green-600">{formatCurrency(req.amount)}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                            <span className="font-semibold">📅</span>
                                                            <span>{new Date(req.expense_date).toLocaleDateString('en-US')}</span>
                                                        </div>
                                                        {req.receipt_url && (
                                                            <a 
                                                                href={req.receipt_url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="flex items-center space-x-2 text-sm font-semibold text-primary hover:text-purple-600 mt-2 transition-colors"
                                                            >
                                                                <span>🧾</span>
                                                                <span>View Receipt</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex space-x-2 flex-shrink-0 ml-4">
                                                    {currentUser.role === UserRole.ADMIN && req.status === 'pending' ? (
                                                        <>
                                                            <button 
                                                                title="Approve expense claim" 
                                                                onClick={() => handleAction(req.id, 'approve', 'expense')} 
                                                                className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200 group-hover:animate-pulse"
                                                            >
                                                                <CheckIcon className="h-6 w-6"/>
                                                            </button>
                                                            <button 
                                                                title="Reject expense claim" 
                                                                onClick={() => handleAction(req.id, 'reject', 'expense')} 
                                                                className="p-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200"
                                                            >
                                                                <XIcon className="h-6 w-6"/>
                                                            </button>
                                                        </>
                                                    ) : req.status === 'pending' && currentUser.role !== UserRole.ADMIN ? (
                                                        <button 
                                                            title="Cancel expense claim" 
                                                            onClick={() => handleAction(req.id, 'cancel', 'expense')} 
                                                            className="p-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200"
                                                        >
                                                            <XIcon className="h-6 w-6"/>
                                                        </button>
                                                    ) : (
                                                        <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                                                            req.status === 'approved' 
                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                                                : req.status === 'rejected' 
                                                                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' 
                                                                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                                        }`}>
                                                            {req.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {expenseRequests.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="text-6xl mb-4">📭</div>
                                        <p className="text-gray-500 text-lg font-medium">No expense claims found</p>
                                        <p className="text-gray-400 text-sm mt-2">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                {/* Modern Filter */}
                                <div className="flex justify-end">
                                    <select
                                        title="Filter by status"
                                        value={profileStatusFilter}
                                        onChange={(e) => setProfileStatusFilter(e.target.value)}
                                        className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <option value="All">📊 All Statuses</option>
                                        <option value="Pending">⏳ Pending</option>
                                        <option value="Approved">✅ Approved</option>
                                        <option value="Rejected">❌ Rejected</option>
                                    </select>
                                </div>
                                
                                <div className="grid gap-4">
                                    {profileRequests.map(req => (
                                        <div 
                                            key={req.id} 
                                            className="group p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-100"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="bg-white rounded-full p-2 shadow-sm">
                                                            <span className="text-2xl">👤</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-bold text-gray-900">{req.employee_name}</p>
                                                            <p className="text-sm text-gray-600 font-medium">Profile Update Request</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="pl-14 space-y-2">
                                                        <div className="bg-white/70 p-3 rounded-xl border border-indigo-100">
                                                            <p className="text-xs text-gray-500 font-semibold mb-2">📝 FIELD</p>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {req.field_name === 'mobile_money_number' ? 'Mobile Money Number' : req.field_name}
                                                            </p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                                                                <p className="text-xs text-red-600 font-semibold mb-1">❌ CURRENT</p>
                                                                <p className="text-sm text-gray-700">{req.current_value || 'Not set'}</p>
                                                            </div>
                                                            <div className="bg-green-50/50 p-3 rounded-xl border border-green-100">
                                                                <p className="text-xs text-green-600 font-semibold mb-1">✅ REQUESTED</p>
                                                                <p className="text-sm text-gray-700 font-medium">{req.requested_value}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-2">
                                                            <span>📅</span>
                                                            <span>Requested: {new Date(req.requested_at).toLocaleDateString()}</span>
                                                        </div>
                                                        {req.reviewed_at && (
                                                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                                <span>✓</span>
                                                                <span>Reviewed: {new Date(req.reviewed_at).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex space-x-2 flex-shrink-0 ml-4">
                                                    {currentUser.role === UserRole.ADMIN && (req.status === 'Pending' || req.status === 'pending') ? (
                                                        <>
                                                            <button
                                                                title="Approve profile update"
                                                                onClick={() => handleAction(req.id, 'approve', 'profile')}
                                                                className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200 group-hover:animate-pulse"
                                                            >
                                                                <CheckIcon className="h-6 w-6"/>
                                                            </button>
                                                            <button
                                                                title="Reject profile update"
                                                                onClick={() => handleAction(req.id, 'reject', 'profile')}
                                                                className="p-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200"
                                                            >
                                                                <XIcon className="h-6 w-6"/>
                                                            </button>
                                                        </>
                                                    ) : (req.status === 'Pending' || req.status === 'pending') && currentUser.role !== UserRole.ADMIN ? (
                                                        <button
                                                            title="Cancel profile update"
                                                            onClick={() => handleAction(req.id, 'cancel', 'profile')}
                                                            className="p-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl hover:shadow-lg hover:scale-110 transition-all duration-200"
                                                        >
                                                            <XIcon className="h-6 w-6"/>
                                                        </button>
                                                    ) : (
                                                        <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                                                            req.status === 'Approved' || req.status === 'approved' 
                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                                                : req.status === 'Rejected' || req.status === 'rejected' 
                                                                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' 
                                                                : 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white'
                                                        }`}>
                                                            {req.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {profileRequests.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="text-6xl mb-4">📭</div>
                                        <p className="text-gray-500 text-lg font-medium">No profile update requests found</p>
                                        <p className="text-gray-400 text-sm mt-2">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </>
    );
};

export default Approvals;
