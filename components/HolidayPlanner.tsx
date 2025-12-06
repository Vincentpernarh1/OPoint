import React, { useState, useEffect, useMemo } from 'react';
import { LeaveRequest, User, RequestStatus, LeaveType, LeaveBalance } from '../types';
import { LEAVE_REQUESTS, LEAVE_BALANCES } from '../constants';
import { BriefcaseIcon } from './Icons';
import Notification from './Notification';

interface LeaveManagementProps {
    currentUser: User;
}

const statusColorMap: Record<RequestStatus, string> = {
    [RequestStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [RequestStatus.APPROVED]: 'bg-green-100 text-green-800',
    [RequestStatus.REJECTED]: 'bg-red-100 text-red-800',
};

// Helper to format date to YYYY-MM-DD for input fields
const toInputDate = (date: Date): string => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

const LeaveManagement = ({ currentUser }: LeaveManagementProps) => {
    const [requests, setRequests] = useState<LeaveRequest[]>(LEAVE_REQUESTS.filter(r => r.userId === currentUser.id));
    const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.ANNUAL);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [notification, setNotification] = useState<string | null>(null);

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

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!startDate || !endDate) return;
        
        const newRequest: LeaveRequest = {
            id: `lr-${Date.now()}`,
            userId: currentUser.id,
            leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            status: RequestStatus.PENDING,
        };
        setRequests(prev => [newRequest, ...prev].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        
        // Reset form
        setStartDate('');
        setEndDate('');
        setReason('');

        setNotification('Leave request submitted successfully!');
    };

    return (
        <>
            {notification && <Notification message={notification} type="success" onClose={() => setNotification(null)} />}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Leave Balances */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow-md text-center">
                            <p className="text-sm font-medium text-gray-500">Annual Leave</p>
                            <p className="text-3xl font-bold text-primary">{userBalance.annual} days</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-md text-center">
                            <p className="text-sm font-medium text-gray-500">Maternity Leave</p>
                            <p className="text-3xl font-bold text-pink-500">{userBalance.maternity} weeks</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-md text-center">
                            <p className="text-sm font-medium text-gray-500">Sick Leave</p>
                            <p className="text-3xl font-bold text-amber-500">{userBalance.sick} days</p>
                        </div>
                    </div>
                </div>

                {/* Request Form */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
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
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                            <input type="date" id="startDate" name="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                            <input type="date" id="endDate" name="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason (optional)</label>
                            <textarea id="reason" name="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></textarea>
                        </div>
                        <button type="submit" disabled={!startDate || !endDate} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300">Submit Request</button>
                    </form>
                </div>

                {/* Request History */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">My Requests</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {requests.length > 0 ? requests.map(req => (
                            <div key={req.id} className="p-3 border rounded-lg flex items-start space-x-3 bg-gray-50">
                                <div className="bg-primary-light p-2.5 rounded-full mt-1">
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