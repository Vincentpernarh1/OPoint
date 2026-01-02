
import React, { useState, useEffect, useMemo } from 'react';
import { LeaveRequest, User, RequestStatus, LeaveType, UserRole } from '../types';
import { BriefcaseIcon, PencilIcon, TrashIcon, ChevronDownIcon } from './Icons';
import Notification from './Notification';
import Calendar from './Calendar';
import EditLeaveRequestModal from './EditLeaveRequestModal';
import PullToRefreshIndicator from './PullToRefreshIndicator';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import { useRefreshable } from '../hooks/useRefreshable';
import './LeaveManagement.css';

interface LeaveManagementProps {
    currentUser: User;
}

const statusColorMap: Record<RequestStatus, string> = {
    [RequestStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [RequestStatus.APPROVED]: 'bg-green-100 text-green-800',
    [RequestStatus.REJECTED]: 'bg-red-100 text-red-800',
    [RequestStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
};

const LeaveManagement = ({ currentUser }: LeaveManagementProps) => {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.ANNUAL);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [numDays, setNumDays] = useState<string>('');
    const [reason, setReason] = useState('');
    const [notification, setNotification] = useState<string | null>(null);
    const [displayedDate, setDisplayedDate] = useState(new Date());
    const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
    const [userBalance, setUserBalance] = useState({ 
        annual: { remaining: 0, used: 0, total: 0 }, 
        maternity: { remaining: 0, used: 0, total: 0 }, 
        sick: { remaining: 0, used: 0, total: 0 } 
    });

    // Group requests by year and month
    const requestsByYearAndMonth = useMemo(() => {
        const grouped: Record<string, Record<string, LeaveRequest[]>> = {};
        requests.forEach(req => {
            const date = new Date(req.startDate);
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

    const sortedLeaveYears = useMemo(() => {
        return Object.keys(requestsByYearAndMonth).sort((a, b) => parseInt(b) - parseInt(a));
    }, [requestsByYearAndMonth]);

    // Calculate actual used days from approved leave requests based on passed dates
    const calculateUsedDays = (requests: LeaveRequest[], leaveType: LeaveType): number => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
        
        return requests
            .filter(req => 
                req.leaveType === leaveType && 
                req.status === RequestStatus.APPROVED
            )
            .reduce((total, req) => {
                const startDate = new Date(req.startDate);
                const endDate = new Date(req.endDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                
                // Only count days that have already passed
                if (startDate > today) {
                    // Leave hasn't started yet
                    return total;
                }
                
                // Calculate how many days have actually passed
                const effectiveEndDate = endDate < today ? endDate : today;
                const daysPassed = Math.ceil((effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                
                return total + Math.max(0, daysPassed);
            }, 0);
    };

    const monthsOfService = useMemo(() => {
        const hireDate = new Date(currentUser.hireDate);
        if (isNaN(hireDate.getTime())) {
            console.warn('Invalid hire date for user:', currentUser.hireDate);
            return 0; // Default to 0 if invalid
        }
        const diff = new Date().getTime() - hireDate.getTime();
        return diff / (1000 * 60 * 60 * 24 * 30.44); // Average days in month
    }, [currentUser.hireDate]);

    const isEligibleForAnnualLeave = monthsOfService >= 12;

    // Refresh function for pull-to-refresh
    const fetchData = async () => {
        if (!currentUser.tenantId) {
            console.error('No tenantId available');
            setLoading(false);
            return;
        }
        
        const tenantId = currentUser.tenantId;
        
        try {
            setLoading(true);
            
            // Fetch leave requests
            const data = await api.getLeaveRequests(tenantId, { userId: currentUser.id });
            const transformedData: LeaveRequest[] = data.map((item: any) => {
                const startDate = new Date(item.start_date);
                const endDate = new Date(item.end_date);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    console.warn('Invalid date in leave request:', item);
                    return null;
                }
                
                return {
                    id: item.id,
                    userId: item.employee_id,
                    employeeName: item.employee_name,
                    leaveType: item.leave_type as LeaveType,
                    startDate: startDate,
                    endDate: endDate,
                    reason: item.reason,
                    status: item.status as RequestStatus
                };
            }).filter(Boolean) as LeaveRequest[];
            
            // CACHE THE LEAVE REQUESTS for offline use
            try {
                await offlineStorage.cacheData('leaveRequests', transformedData, tenantId, currentUser.id);
            } catch (cacheError) {
                console.warn('Failed to cache leave requests:', cacheError);
            }
            
            // OFFLINE ENHANCEMENT: Merge with unsynced local leaves
            try {
                const localLeaves = await offlineStorage.getLeaveRequestsByUser(tenantId, currentUser.id);
                const unsyncedLeaves = localLeaves.filter(l => !l.synced).map(l => ({
                    id: l.id,
                    userId: l.userId,
                    employeeName: l.employeeName || currentUser.name,
                    leaveType: l.leaveType as LeaveType,
                    startDate: new Date(l.startDate),
                    endDate: new Date(l.endDate),
                    reason: l.reason,
                    status: '⏳ Pending Sync' as RequestStatus
                }));
                setRequests([...unsyncedLeaves, ...transformedData]);
            } catch (offlineErr) {
                console.warn('Could not load local leaves:', offlineErr);
                setRequests(transformedData);
            }

            // Fetch leave balances
            const balanceData = await api.getLeaveBalances(tenantId, currentUser.id);
            
            if (balanceData && balanceData.length > 0) {
                // Group balances by type for easier access
                const balanceMap: Record<string, any> = {};
                balanceData.forEach((b: any) => {
                    balanceMap[b.leave_type] = b;
                });
                
                // CACHE THE BALANCE DATA for offline use
                try {
                    await offlineStorage.cacheData('leaveBalances', balanceData, tenantId, currentUser.id);
                } catch (cacheError) {
                    console.warn('Failed to cache leave balances:', cacheError);
                }
                
                // Calculate used days based on actual passed dates from approved leave requests
                const annualUsed = calculateUsedDays(transformedData, LeaveType.ANNUAL);
                const maternityUsed = calculateUsedDays(transformedData, LeaveType.MATERNITY);
                const sickUsed = calculateUsedDays(transformedData, LeaveType.SICK);
                
                const annualTotal = balanceMap['annual']?.total_days || 0;
                const maternityTotal = balanceMap['maternity']?.total_days || 0;
                const sickTotal = balanceMap['sick']?.total_days || 0;
                
                
                setUserBalance({
                    annual: { 
                        total: annualTotal,
                        remaining: annualTotal - annualUsed, 
                        used: annualUsed 
                    },
                    maternity: { 
                        total: maternityTotal,
                        remaining: maternityTotal - maternityUsed, 
                        used: maternityUsed 
                    },
                    sick: { 
                        total: sickTotal,
                        remaining: sickTotal - sickUsed, 
                        used: sickUsed 
                    }
                });
            } else {
                console.warn('No leave balance data found. The system should auto-initialize balances on next request.');
                // Keep balances at 0 - they should be auto-initialized by the backend
            }
        } catch (error) {
            console.error('Error fetching leave data:', error);
            // OFFLINE FALLBACK: Try to show cached leave requests first, then local unsynced leaves
            try {
                // Try to get cached API data
                const cachedData = await offlineStorage.getCachedData('leaveRequests', tenantId, currentUser.id);
                let cachedLeaves: LeaveRequest[] = [];
                
                if (cachedData && Array.isArray(cachedData)) {
                    cachedLeaves = cachedData.map((item: any) => ({
                        id: item.id,
                        userId: item.userId,
                        employeeName: item.employeeName,
                        leaveType: item.leaveType as LeaveType,
                        startDate: new Date(item.startDate),
                        endDate: new Date(item.endDate),
                        reason: item.reason,
                        status: item.status as RequestStatus
                    }));
                }
                
                // Merge with unsynced local leaves
                const localLeaves = await offlineStorage.getLeaveRequestsByUser(tenantId, currentUser.id);
                const unsyncedLeaves = localLeaves.filter(l => !l.synced).map(l => ({
                    id: l.id,
                    userId: l.userId,
                    employeeName: l.employeeName || currentUser.name,
                    leaveType: l.leaveType as LeaveType,
                    startDate: new Date(l.startDate),
                    endDate: new Date(l.endDate),
                    reason: l.reason,
                    status: '⏳ Pending Sync' as RequestStatus
                }));
                
                const allLeaves = [...unsyncedLeaves, ...cachedLeaves];
                
                if (allLeaves.length > 0) {
                    setRequests(allLeaves);
                    setNotification('📴 Offline - Showing cached leave data');
                } else {
                    setNotification('📴 Offline - No cached leave data. Connect to internet to load your leave history.');
                }
                
                // Try to load cached balance data and calculate offline
                try {
                    const cachedBalanceData = await offlineStorage.getCachedData('leaveBalances', tenantId, currentUser.id);
                    if (cachedBalanceData && Array.isArray(cachedBalanceData) && cachedBalanceData.length > 0) {
                        // Group balances by type
                        const balanceMap: Record<string, any> = {};
                        cachedBalanceData.forEach((b: any) => {
                            balanceMap[b.leave_type] = b;
                        });
                        
                        // Calculate used days from cached/offline leave requests
                        const annualUsed = calculateUsedDays(allLeaves, LeaveType.ANNUAL);
                        const maternityUsed = calculateUsedDays(allLeaves, LeaveType.MATERNITY);
                        const sickUsed = calculateUsedDays(allLeaves, LeaveType.SICK);
                        
                        const annualTotal = balanceMap['annual']?.total_days || 0;
                        const maternityTotal = balanceMap['maternity']?.total_days || 0;
                        const sickTotal = balanceMap['sick']?.total_days || 0;
                        
                        
                        setUserBalance({
                            annual: { 
                                total: annualTotal,
                                remaining: annualTotal - annualUsed, 
                                used: annualUsed 
                            },
                            maternity: { 
                                total: maternityTotal,
                                remaining: maternityTotal - maternityUsed, 
                                used: maternityUsed 
                            },
                            sick: { 
                                total: sickTotal,
                                remaining: sickTotal - sickUsed, 
                                used: sickUsed 
                            }
                        });
                    }
                } catch (balanceCacheError) {
                    console.warn('Could not load cached balance data:', balanceCacheError);
                }
            } catch (offlineError) {
                console.error('Failed to load from offline storage:', offlineError);
                setNotification('Failed to load leave data. Please check your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    const { containerRef, isRefreshing, pullDistance, pullProgress } = useRefreshable(fetchData);

    // Recalculate balances when requests change (e.g., after approval/cancellation)
    useEffect(() => {
        if (userBalance.annual.total > 0 || userBalance.maternity.total > 0 || userBalance.sick.total > 0) {
            // Only recalculate if we have total balance data
            const annualUsed = calculateUsedDays(requests, LeaveType.ANNUAL);
            const maternityUsed = calculateUsedDays(requests, LeaveType.MATERNITY);
            const sickUsed = calculateUsedDays(requests, LeaveType.SICK);
            
            setUserBalance(prev => ({
                annual: { 
                    total: prev.annual.total,
                    remaining: prev.annual.total - annualUsed, 
                    used: annualUsed 
                },
                maternity: { 
                    total: prev.maternity.total,
                    remaining: prev.maternity.total - maternityUsed, 
                    used: maternityUsed 
                },
                sick: { 
                    total: prev.sick.total,
                    remaining: prev.sick.total - sickUsed, 
                    used: sickUsed 
                }
            }));
        }
    }, [requests]);

    useEffect(() => {
        if (!isEligibleForAnnualLeave && leaveType === LeaveType.ANNUAL) {
            setLeaveType(LeaveType.SICK); // Default to sick leave if not eligible for annual
        }
    }, [isEligibleForAnnualLeave, leaveType]);

    // Validate restrictions when leave type changes
    useEffect(() => {
        const currentDays = parseInt(numDays, 10);
        // If switching to non-maternity leave and days > 30, cap it
        if (leaveType !== LeaveType.MATERNITY && !isNaN(currentDays) && currentDays > 30) {
            const maxDays = 30;
            setNumDays(maxDays.toString());
            setNotification("Leave duration adjusted to 30 days (limit for Annual/Sick leave).");
            
            if (startDate) {
                const newEndDate = new Date(startDate);
                newEndDate.setDate(newEndDate.getDate() + maxDays - 1);
                setEndDate(newEndDate);
            }
        }
    }, [leaveType, numDays, startDate]);

    // Sync numDays from date changes
    useEffect(() => {
        if (startDate && endDate) {
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setNumDays(diffDays.toString());
        } else {
            // Only clear numDays if we don't have a valid range. 
            // We avoid clearing it if the user is currently typing (which is handled by handleNumDaysChange logic flow)
            // But if startDate is cleared by other means, numDays should clear.
            if (!startDate && !endDate && numDays !== '') {
                // Check if user is typing... simpler to just rely on handleNumDaysChange for typing flow
                // This effect runs when dates change via Calendar click
            }
        }
    }, [startDate, endDate]);
    
     // Sync endDate from numDays changes
    const handleNumDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        
        // Allow user to clear the input
        if (val === '') {
            setNumDays('');
            setEndDate(null);
            return;
        }

        let days = parseInt(val, 10);
        
        // Ensure valid number
        if (isNaN(days)) return;
        
        // Prevent negative numbers (take absolute value)
        if (days < 0) days = Math.abs(days);
        
        // Prevent 0 if desired, though 0 might be a transient state while typing. 
        // Let's enforce minimum 1 for calculation logic but allow 0 in state if necessary? 
        // Better to just ensure if they enter 0, it doesn't break logic. 
        // For standard UI, usually min is 1.
        if (days === 0) days = 1;

        // Restriction: Only Maternity leave can exceed 30 days
        if (leaveType !== LeaveType.MATERNITY && days > 30) {
            setNotification("Maximum 30 days allowed for this leave type.");
            days = 30;
        }

        setNumDays(days.toString());
        
        // Calculate new End Date
        let anchorDate = startDate;
        // If no start date selected yet, default to Today
        if (!anchorDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to midnight
            anchorDate = today;
            setStartDate(anchorDate);
        }

        const newEndDate = new Date(anchorDate);
        newEndDate.setDate(newEndDate.getDate() + days - 1);
        setEndDate(newEndDate);
    };

    const handleDateClick = (date: Date) => {
        // Normalize clicked date to midnight to ensure consistent calculations
        const clickedDate = new Date(date);
        clickedDate.setHours(0, 0, 0, 0);

        // Prevent selecting dates in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (clickedDate < today) {
            setNotification('Cannot select dates in the past');
            return;
        }

        if (!startDate || clickedDate < startDate || (startDate && endDate)) {
            setStartDate(clickedDate);
            setEndDate(null);
            setNumDays('1'); // Reset days to 1 when starting new selection
        } else if (startDate && !endDate) {
            setEndDate(clickedDate);
            // numDays will update via useEffect
        }
    };

    // Fetch leave requests and balances for current user
    useEffect(() => {
        fetchData();
    }, [currentUser.tenantId, currentUser.id]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!startDate || !endDate) return;

        console.log('Submitting leave request for user:', currentUser.id, 'tenant:', currentUser.tenantId, 'role:', currentUser.role);

        if (!currentUser.tenantId) {
            console.error('No tenantId for user:', currentUser);
            setNotification('Error: No tenant context. Please log out and log back in.');
            return;
        }

        const submitLeaveRequest = async () => {
            const tenantId = currentUser.tenantId!; // Already checked above
            
            try {
                if (!startDate || !endDate) {
                    throw new Error('Start date and end date are required');
                }

                // Validate dates are not in the past
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (startDate < today) {
                    throw new Error('Start date cannot be in the past');
                }

                if (endDate < startDate) {
                    throw new Error('End date must be after start date');
                }

                if (!reason.trim()) {
                    throw new Error('Reason is required');
                }

                const leaveData = {
                    user_id: currentUser.id,
                    leave_type: leaveType,
                    start_date: startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
                    end_date: endDate.toISOString().split('T')[0],
                    reason: reason.trim(),
                    employee_name: currentUser.name
                };

                console.log('Sending leave data:', JSON.stringify(leaveData, null, 2));

                try {
                    await api.createLeaveRequest(tenantId, leaveData);
                    
                    // Refresh the leave requests
                    const data = await api.getLeaveRequests(tenantId, { userId: currentUser.id });
                    const transformedData: LeaveRequest[] = data.map((item: any) => ({
                        id: item.id,
                        userId: item.employee_id,
                        employeeName: item.employee_name,
                        leaveType: item.leave_type as LeaveType,
                        startDate: new Date(item.start_date),
                        endDate: new Date(item.end_date),
                        reason: item.reason,
                        status: item.status as RequestStatus
                    }));
                    setRequests(transformedData);

                    setNotification('✅ Leave request submitted successfully!');
                } catch (apiError) {
                    console.warn('API submission failed, saving offline:', apiError);
                    
                    // OFFLINE FALLBACK: Save to IndexedDB
                    const offlineLeaveRequest = {
                        id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        userId: currentUser.id,
                        companyId: tenantId,
                        leaveType: leaveData.leave_type,
                        startDate: leaveData.start_date,
                        endDate: leaveData.end_date,
                        reason: leaveData.reason,
                        status: 'Pending',
                        synced: false,
                        createdAt: new Date().toISOString(),
                        employeeName: currentUser.name
                    };
                    
                    await offlineStorage.saveLeaveRequest(offlineLeaveRequest);
                    
                    // Add to local state for immediate display
                    const newRequest: LeaveRequest = {
                        id: offlineLeaveRequest.id,
                        userId: offlineLeaveRequest.userId,
                        employeeName: offlineLeaveRequest.employeeName,
                        leaveType: offlineLeaveRequest.leaveType as LeaveType,
                        startDate: new Date(offlineLeaveRequest.startDate),
                        endDate: new Date(offlineLeaveRequest.endDate),
                        reason: offlineLeaveRequest.reason,
                        status: '⏳ Pending Sync' as RequestStatus
                    };
                    setRequests(prev => [newRequest, ...prev]);
                    
                    setNotification('📴 Offline - Leave request saved locally. Will sync when online.');
                }

                // Reset form
                setStartDate(null);
                setEndDate(null);
                setReason('');
                setNumDays('');
            } catch (error: any) {
                console.error('Failed to submit leave request:', error);
                console.error('Error details:', error.message);
                console.error('Error stack:', error.stack);
                
                // Try to get more details from the response
                let errorMessage = 'Failed to submit leave request';
                if (error.message && error.message.includes('Failed to create leave request')) {
                    errorMessage = 'Server rejected the request. Check console for details.';
                }
                
                setNotification(`${errorMessage}: ${error.message || 'Unknown error'}`);
            }
        };

        submitLeaveRequest();
    };
    
    const handleCancelRequest = async (requestId: string) => {
        if(window.confirm('Are you sure you want to cancel this leave request?')) {
            if (!currentUser.tenantId) {
                setNotification('Error: No tenant context');
                return;
            }
            
            const tenantId = currentUser.tenantId;
            
            try {
                await api.updateLeaveRequest(tenantId, requestId, { status: 'cancelled' });
                
                // Refresh the leave requests
                const data = await api.getLeaveRequests(tenantId, { userId: currentUser.id });
                const transformedData: LeaveRequest[] = data.map((item: any) => {
                    const startDate = new Date(item.start_date);
                    const endDate = new Date(item.end_date);
                    
                    // Validate dates
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                        console.warn('Invalid date in refreshed leave request:', item);
                        return null; // Skip invalid requests
                    }
                    
                    return {
                        id: item.id,
                        userId: item.employee_id,
                        leaveType: item.leave_type as LeaveType,
                        startDate: startDate,
                        endDate: endDate,
                        reason: item.reason,
                        status: item.status as RequestStatus
                    };
                }).filter(Boolean) as LeaveRequest[]; // Remove null entries
                setRequests(transformedData);
                
                setNotification('Leave request cancelled.');
            } catch (error) {
                console.error('Failed to cancel leave request:', error);
                setNotification('Failed to cancel leave request');
            }
        }
    };

    const handleUpdateRequest = (updatedRequest: LeaveRequest) => {
        setRequests(prev => prev.map(req => req.id === updatedRequest.id ? updatedRequest : req));
        setEditingRequest(null);
        setNotification('Leave request updated successfully!');
    };

    return (
        <>
            {notification && <Notification message={notification} type="success" onClose={() => setNotification(null)} />}
            {editingRequest && (
                <EditLeaveRequestModal 
                    requestToEdit={editingRequest}
                    onClose={() => setEditingRequest(null)}
                    onSubmit={handleUpdateRequest}
                    isEligibleForAnnualLeave={isEligibleForAnnualLeave}
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
                
                <div className="space-y-8">
                    {/* Modern Header Section */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 sm:p-8 shadow-2xl">
                        <div className="relative z-10">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Leave Management</h1>
                            <p className="text-primary-light text-base sm:text-lg opacity-90">
                                Manage your time off and track your leave balances
                            </p>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24"></div>
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mb-16"></div>
                    </div>

                    {/* Leave Balances - Modern Gradient Cards */}
                    <div>
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-6 flex items-center">
                            <span className="w-1 h-6 sm:h-8 bg-gradient-to-b from-primary to-primary-dark rounded-full mr-3"></span>
                            Your Leave Balances
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                            {/* Annual Leave Card */}
                            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 p-3 sm:p-4 md:p-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 animate-fade-in">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                            <span className="text-lg sm:text-xl">🏖️</span>
                                        </div>
                                        <span className="text-white/80 text-xs font-medium">Annual</span>
                                    </div>
                                    <div className="flex items-baseline justify-center gap-2 mb-2 sm:mb-3">
                                        <p className="text-3xl sm:text-4xl font-extrabold text-white">{userBalance.annual.remaining}</p>
                                        <p className="text-white/90 text-sm sm:text-base font-semibold">Days Available</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-white/80 text-xs">Used</span>
                                            <span className="text-white font-bold text-sm">{userBalance.annual.used} days</span>
                                        </div>
                                        <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="leave-progress-bar bg-white h-full rounded-full"
                                                data-progress={userBalance.annual.total > 0 ? Math.min(Math.round((userBalance.annual.used / userBalance.annual.total) * 100), 100) : 0}
                                            ></div>
                                        </div>
                                        <p className="text-white/70 text-xs mt-1">{userBalance.annual.used} of {userBalance.annual.total} days used</p>
                                    </div>
                                </div>
                            </div>

                            {/* Maternity Leave Card */}
                            <div className="group relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600 p-3 sm:p-4 md:p-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 animate-fade-in [animation-delay:100ms]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                            <span className="text-lg sm:text-xl">👶</span>
                                        </div>
                                        <span className="text-white/80 text-xs font-medium">Maternity</span>
                                    </div>
                                    <div className="flex items-baseline justify-center gap-2 mb-2 sm:mb-3">
                                        <p className="text-3xl sm:text-4xl font-extrabold text-white">{Math.floor(userBalance.maternity.remaining / 30)}</p>
                                        <p className="text-white/90 text-sm sm:text-base font-semibold">Months Available</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-white/80 text-xs">Used</span>
                                            <span className="text-white font-bold text-sm">{userBalance.maternity.used} days</span>
                                        </div>
                                        <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="leave-progress-bar bg-white h-full rounded-full"
                                                data-progress={userBalance.maternity.total > 0 ? Math.min(Math.round((userBalance.maternity.used / userBalance.maternity.total) * 100), 100) : 0}
                                            ></div>
                                        </div>
                                        <p className="text-white/70 text-xs mt-1">{userBalance.maternity.used} of {userBalance.maternity.total} days used</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sick Leave Card */}
                            <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 p-3 sm:p-4 md:p-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 animate-fade-in [animation-delay:200ms]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                            <span className="text-lg sm:text-xl">🏥</span>
                                        </div>
                                        <span className="text-white/80 text-xs font-medium">Sick</span>
                                    </div>
                                    <div className="flex items-baseline justify-center gap-2 mb-2 sm:mb-3">
                                        <p className="text-3xl sm:text-4xl font-extrabold text-white">{userBalance.sick.remaining}</p>
                                        <p className="text-white/90 text-sm sm:text-base font-semibold">Days Available</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-white/80 text-xs">Used</span>
                                            <span className="text-white font-bold text-sm">{userBalance.sick.used} days</span>
                                        </div>
                                        <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="leave-progress-bar bg-white h-full rounded-full"
                                                data-progress={userBalance.sick.total > 0 ? Math.min(Math.round((userBalance.sick.used / userBalance.sick.total) * 100), 100) : 0}
                                            ></div>
                                        </div>
                                        <p className="text-white/70 text-xs mt-1">{userBalance.sick.used} of {userBalance.sick.total} days used</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
                    {/* Request Form - Modern Design */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                            <div className="bg-gradient-to-r from-primary to-primary-dark p-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                        <span className="text-2xl">📝</span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Request Leave</h2>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="leaveType" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                    <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                                    Leave Type
                                </label>
                                <select id="leaveType" value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)} className="mt-1 block w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 font-medium">
                                    <option value={LeaveType.ANNUAL} disabled={!isEligibleForAnnualLeave}>🏖️ Annual Leave</option>
                                    <option value={LeaveType.SICK}>🏥 Sick Leave</option>
                                    <option value={LeaveType.MATERNITY}>👶 Maternity Leave</option>
                                </select>
                                {!isEligibleForAnnualLeave && (
                                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-xs text-amber-700 font-medium">ℹ️ Annual leave is available after 12 months of service.</p>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                        Start Date
                                    </label>
                                    <div className="relative">
                                        <input type="text" id="startDate" readOnly value={startDate ? startDate.toLocaleDateString() : 'Select below'} className="mt-1 block w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl shadow-sm font-medium text-gray-700" />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xl">📅</div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                        End Date
                                    </label>
                                    <div className="relative">
                                        <input type="text" id="endDate" readOnly value={endDate ? endDate.toLocaleDateString() : 'Auto-calculated'} className="mt-1 block w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl shadow-sm font-medium text-gray-700" />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xl">📅</div>
                                    </div>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="numDays" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                    Number of Days
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        id="numDays" 
                                        name="numDays" 
                                        value={numDays} 
                                        onChange={handleNumDaysChange} 
                                        min="1"
                                        placeholder="Enter number of days" 
                                        className="mt-1 block w-full px-4 py-3 pl-12 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔢</div>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="reason" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                    Reason <span className="text-gray-400 text-xs ml-1">(optional)</span>
                                </label>
                                <textarea id="reason" name="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for your leave request..." className="mt-1 block w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 font-medium resize-none"></textarea>
                            </div>
                            <button 
                                type="submit" 
                                disabled={!startDate || !endDate} 
                                className="w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
                            >
                                <span>Submit Request</span>
                                <span className="text-xl">🚀</span>
                            </button>
                        </form>
                            </div>
                        </div>
                    </div>

                    {/* Calendar - Modern Design */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                        <span className="text-2xl">📅</span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Select Dates</h2>
                                </div>
                                <p className="text-white/80 text-sm mt-2">Click to select your leave period on the calendar</p>
                            </div>
                            <div className="p-6">
                                <Calendar 
                                    requests={requests}
                                    displayedDate={displayedDate}
                                    setDisplayedDate={setDisplayedDate}
                                    startDate={startDate}
                                    endDate={endDate}
                                    onDateClick={handleDateClick}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Request History - Modern Design */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <button
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        className="w-full flex justify-between items-center p-6 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-300"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center shadow-md">
                                <span className="text-xl">📋</span>
                            </div>
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800">My Requests</h3>
                        </div>
                        <ChevronDownIcon className={`h-6 w-6 text-gray-600 transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isHistoryExpanded && (
                        <div className="p-6 pt-2 space-y-3 animate-fade-in-down">
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary"></div>
                                    <p className="text-gray-500 mt-4 font-medium">Loading leave requests...</p>
                                </div>
                            ) : requests.length > 0 ? (
                                <div className="space-y-4">
                                    {sortedLeaveYears.map(year => (
                                        <div key={year} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                                            <button
                                                onClick={() => {
                                                    const newExpanded = new Set(expandedYears);
                                                    if (newExpanded.has(year)) {
                                                        newExpanded.delete(year);
                                                    } else {
                                                        newExpanded.add(year);
                                                    }
                                                    setExpandedYears(newExpanded);
                                                }}
                                                className="w-full px-5 py-4 bg-gradient-to-r from-gray-50 to-white hover:from-primary/5 hover:to-primary/10 transition-all duration-300 flex justify-between items-center"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                                                        <span className="text-white text-sm font-bold">{year.slice(2)}</span>
                                                    </div>
                                                    <span className="font-bold text-gray-800 text-lg">{year}</span>
                                                </div>
                                                <ChevronDownIcon className={`h-5 w-5 text-gray-600 transition-transform duration-300 ${expandedYears.has(year) ? 'rotate-180' : ''}`} />
                                            </button>

                                            {expandedYears.has(year) && requestsByYearAndMonth[year] && (
                                                <div className="p-2 space-y-2">
                                                    {Object.keys(requestsByYearAndMonth[year] || {})
                                                        .sort((a, b) => {
                                                            const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                                            return monthOrder.indexOf(b) - monthOrder.indexOf(a);
                                                        })
                                                        .map(month => {
                                                            const monthKey = `${year}-${month}`;
                                                            return (
                                                                <div key={monthKey} className="border border-gray-200 rounded-lg overflow-hidden">
                                                                    <button
                                                                        onClick={() => {
                                                                            const newExpanded = new Set(expandedMonths);
                                                                            if (newExpanded.has(monthKey)) {
                                                                                newExpanded.delete(monthKey);
                                                                            } else {
                                                                                newExpanded.add(monthKey);
                                                                            }
                                                                            setExpandedMonths(newExpanded);
                                                                        }}
                                                                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 flex justify-between items-center"
                                                                    >
                                                                        <div className="flex items-center space-x-2">
                                                                            <span className="text-lg">📅</span>
                                                                            <span className="font-semibold text-gray-700">{month}</span>
                                                                        </div>
                                                                        <ChevronDownIcon className={`h-4 w-4 text-gray-600 transition-transform duration-300 ${expandedMonths.has(monthKey) ? 'rotate-180' : ''}`} />
                                                                    </button>

                                                                    {expandedMonths.has(monthKey) && (
                                                                        <div className="p-2 space-y-2">
                                                                            {requestsByYearAndMonth[year][month].map(req => (
                                                                                <div key={req.id} className="group p-3 sm:p-4 border-2 border-gray-200 rounded-xl flex items-center space-x-3 sm:space-x-4 bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-white hover:border-primary/30 hover:shadow-md transition-all duration-300">
                                                                                    <div className="bg-gradient-to-br from-primary to-primary-dark p-2 sm:p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                                                                                        <BriefcaseIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex justify-between items-center gap-2 mb-1.5 sm:mb-2">
                                                                                            <p className="font-bold text-gray-800 text-sm sm:text-base truncate">{req.leaveType}</p>
                                                                                            <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-bold rounded-full shadow-sm whitespace-nowrap ${statusColorMap[req.status] || 'bg-gray-100 text-gray-800'}`}>
                                                                                                {req.status}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2">
                                                                                            <span className="text-xs sm:text-sm flex-shrink-0">📅</span>
                                                                                            <p className="text-xs sm:text-sm font-semibold text-gray-600 truncate">
                                                                                                {new Date(req.startDate).toLocaleDateString('en-US', {month:'short', day:'numeric'})} - {new Date(req.endDate).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}
                                                                                            </p>
                                                                                        </div>
                                                                                        {req.reason && (
                                                                                            <p className="text-xs sm:text-sm text-gray-500 italic line-clamp-1">"{req.reason}"</p>
                                                                                        )}
                                                                                    </div>
                                                                                    {req.status === RequestStatus.PENDING && (
                                                                                        <div className="flex space-x-1.5 sm:space-x-2 flex-shrink-0">
                                                                                            <button title="Edit" onClick={() => setEditingRequest(req)} className="p-1.5 sm:p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary hover:text-white transition-all duration-200 transform hover:scale-110">
                                                                                                <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                                                            </button>
                                                                                            <button title="Cancel" onClick={() => handleCancelRequest(req.id)} className="p-1.5 sm:p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-200 transform hover:scale-110">
                                                                                                <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">📭</span>
                                    </div>
                                    <p className="text-gray-500 font-medium text-lg">No leave requests yet</p>
                                    <p className="text-gray-400 text-sm mt-2">Submit your first leave request above</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                </div>
            </div>
        </>
    );
};

export default LeaveManagement;
