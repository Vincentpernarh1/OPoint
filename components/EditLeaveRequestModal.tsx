import React, { useState } from 'react';
import { LeaveRequest, LeaveType } from '../types';
import { XIcon } from './Icons';

interface EditLeaveRequestModalProps {
    requestToEdit: LeaveRequest;
    onClose: () => void;
    onSubmit: (updatedRequest: LeaveRequest) => void;
    isEligibleForAnnualLeave: boolean;
}

const toInputDate = (date: Date): string => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

const EditLeaveRequestModal = ({ requestToEdit, onClose, onSubmit, isEligibleForAnnualLeave }: EditLeaveRequestModalProps) => {
    const [leaveType, setLeaveType] = useState(requestToEdit.leaveType);
    const [startDate, setStartDate] = useState(toInputDate(requestToEdit.startDate));
    const [endDate, setEndDate] = useState(toInputDate(requestToEdit.endDate));
    const [reason, setReason] = useState(requestToEdit.reason);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) {
            setError('Start and End dates are required.');
            return;
        }
        
        const updatedRequest: LeaveRequest = {
            ...requestToEdit,
            leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
        };
        onSubmit(updatedRequest);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" title="Close modal">
                    <XIcon className="h-6 w-6"/>
                </button>
                <h3 className="text-xl font-semibold mb-4">Edit Leave Request</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="edit-leaveType" className="block text-sm font-medium text-gray-700">Leave Type</label>
                        <select id="edit-leaveType" value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                            <option value={LeaveType.ANNUAL} disabled={!isEligibleForAnnualLeave}>Annual Leave</option>
                            <option value={LeaveType.SICK}>Sick Leave</option>
                            <option value={LeaveType.MATERNITY}>Maternity Leave</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="edit-startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input type="date" id="edit-startDate" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                    </div>
                     <div>
                        <label htmlFor="edit-endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                        <input type="date" id="edit-endDate" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                    </div>
                    <div>
                        <label htmlFor="edit-reason" className="block text-sm font-medium text-gray-700">Reason</label>
                        <textarea id="edit-reason" value={reason} onChange={e => setReason(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></textarea>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditLeaveRequestModal;