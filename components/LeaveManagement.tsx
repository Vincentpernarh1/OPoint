
import React, { useState, useEffect, useMemo } from 'react';
import { LeaveRequest, User, RequestStatus, LeaveType, LeaveBalance, UserRole } from '../types';
import { LEAVE_REQUESTS, LEAVE_BALANCES } from '../constants';
import { BriefcaseIcon, PencilIcon, TrashIcon } from './Icons';
import Notification from './Notification';
import Calendar from './Calendar';
import EditLeaveRequestModal from './EditLeaveRequestModal';
import { api } from '../services/api';

interface LeaveManagementProps {
    currentUser: User;
}

const statusColorMap: Record<RequestStatus, string> = {
    [RequestStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [RequestStatus.APPROVED]: 'bg-green-100 text-green-800',
    [RequestStatus.REJECTED]: 'bg-red-100 text-red-800',
};

const LeaveManagement = ({ currentUser }: LeaveManagementProps) => {
    const [requests, setRequests] = useState<LeaveRequest[]>(LEAVE_REQUESTS.filter(r => r.userId === currentUser.id));
    const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.ANNUAL);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [numDays, setNumDays] = useState<string>('');
    const [reason, setReason] = useState('');
    const [notification, setNotification] = useState<string | null>(null);
    const [displayedDate, setDisplayedDate] = useState(new Date());
    const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);

    const userBalance = useMemo(() => {
        return LEAVE_BALANCES.find(b => b.userId === currentUser.id) || { userId: currentUser.id, annual: 0, maternity: 0, sick: 0 };
    }, [currentUser.id]);

    const monthsOfService = useMemo(() => {
        const diff = new Date().getTime() - new Date(currentUser.hireDate).getTime();
        return diff / (1000 * 60 * 60 * 24 * 30.44); // Average days in month
    }, [currentUser.hireDate]);

    const isEligibleForAnnualLeave = monthsOfService >= 12;

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

        if (!startDate || clickedDate < startDate || (startDate && endDate)) {
            setStartDate(clickedDate);
            setEndDate(null);
            setNumDays('1'); // Reset days to 1 when starting new selection
        } else if (startDate && !endDate) {
            setEndDate(clickedDate);
            // numDays will update via useEffect
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!startDate || !endDate) return;
        
        const newRequest: LeaveRequest = {
            id: `lr-${Date.now()}`,
            userId: currentUser.id,
            leaveType,
            startDate,
            endDate,
            reason,
            status: RequestStatus.PENDING,
        };
        setRequests(prev => [newRequest, ...prev].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        
        // Notify HR/Admin
        const message = `New Leave Request: ${currentUser.name} requested ${leaveType} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.`;
        api.sendNotification(message, [UserRole.ADMIN, UserRole.HR]);

        // Reset form
        setStartDate(null);
        setEndDate(null);
        setReason('');
        setNumDays('');

        setNotification('Leave request submitted successfully!');
    };
    
    const handleCancelRequest = (requestId: string) => {
        if(window.confirm('Are you sure you want to cancel this leave request?')) {
            setRequests(prev => prev.filter(req => req.id !== requestId));
            setNotification('Leave request cancelled.');
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
            <div className="space-y-8">
                {/* Leave Balances */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">My Leave Balances</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="bg-white p-4 rounded-xl shadow-lg text-center">
                            <p className="text-sm font-medium text-gray-500">Annual Leave</p>
                            <p className="text-3xl font-bold text-primary">{userBalance.annual} days</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-lg text-center">
                            <p className="text-sm font-medium text-gray-500">Maternity Leave</p>
                            <p className="text-3xl font-bold text-pink-500">{userBalance.maternity} weeks</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-lg text-center">
                            <p className="text-sm font-medium text-gray-500">Sick Leave</p>
                            <p className="text-3xl font-bold text-amber-500">{userBalance.sick} days</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Request Form */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Request Leave</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700">Leave Type</label>
                                <select id="leaveType" value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                                    <option value={LeaveType.ANNUAL} disabled={!isEligibleForAnnualLeave}>Annual Leave</option>
                                    <option value={LeaveType.SICK}>Sick Leave</option>
                                    <option value={LeaveType.MATERNITY}>Maternity Leave</option>
                                </select>
                                {!isEligibleForAnnualLeave && (
                                    <p className="text-xs text-amber-600 mt-1">Annual leave is available after 12 months of service.</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                                    <input type="text" id="startDate" readOnly value={startDate ? startDate.toLocaleDateString() : 'Select on calendar'} className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                                    <input type="text" id="endDate" readOnly value={endDate ? endDate.toLocaleDateString() : 'Auto-calculated'} className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="numDays" className="block text-sm font-medium text-gray-700">Number of Days</label>
                                <input 
                                    type="number" 
                                    id="numDays" 
                                    name="numDays" 
                                    value={numDays} 
                                    onChange={handleNumDaysChange} 
                                    min="1"
                                    placeholder="e.g., 5" 
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                />
                            </div>
                            <div>
                                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason (optional)</label>
                                <textarea id="reason" name="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></textarea>
                            </div>
                            <button type="submit" disabled={!startDate || !endDate} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300">Submit Request</button>
                        </form>
                    </div>

                    {/* Calendar */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
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

                {/* Request History */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">My Requests</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {requests.length > 0 ? requests.map(req => (
                            <div key={req.id} className="p-3 border rounded-lg flex items-center space-x-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className="bg-primary-light p-2.5 rounded-full">
                                    <BriefcaseIcon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-gray-700">{req.leaveType}</p>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColorMap[req.status]}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600 mt-1">
                                        {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">{req.reason || 'No reason provided.'}</p>
                                </div>
                                {req.status === RequestStatus.PENDING && (
                                     <div className="flex space-x-2">
                                        <button onClick={() => setEditingRequest(req)} className="p-2 text-gray-500 rounded-full hover:bg-gray-200 hover:text-primary transition-colors">
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleCancelRequest(req.id)} className="p-2 text-gray-500 rounded-full hover:bg-gray-200 hover:text-red-500 transition-colors">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-8">You have no leave requests.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LeaveManagement;
