
import React, { useState, useEffect } from 'react';
import { AdjustmentRequest } from '../types';
import { XIcon } from './Icons';

interface ManualAdjustmentModalProps {
    onClose: () => void;
    onSubmit: (adjustment: Omit<AdjustmentRequest, 'id' | 'userId' | 'status'>) => void;
    date: string;
    existingClockIn?: Date;
    existingClockOut?: Date;
}

const ManualAdjustmentModal = ({ onClose, onSubmit, date, existingClockIn, existingClockOut }: ManualAdjustmentModalProps) => {
    const [requestedClockIn, setRequestedClockIn] = useState(existingClockIn ? existingClockIn.toTimeString().slice(0, 5) : '');
    const [requestedClockOut, setRequestedClockOut] = useState(existingClockOut ? existingClockOut.toTimeString().slice(0, 5) : '');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!requestedClockIn || !requestedClockOut || !reason.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        const dateObj = new Date(date);
        const reqIn = new Date(dateObj);
        const [inH, inM] = requestedClockIn.split(':').map(Number);
        reqIn.setHours(inH, inM, 0, 0);

        const reqOut = new Date(dateObj);
        const [outH, outM] = requestedClockOut.split(':').map(Number);
        reqOut.setHours(outH, outM, 0, 0);

        if (reqOut <= reqIn) {
            setError('Clock out time must be after clock in time.');
            return;
        }

        setError('');

        onSubmit({
            date: date, // Use the date prop directly, it's already in YYYY-MM-DD format
            originalClockIn: existingClockIn,
            originalClockOut: existingClockOut,
            requestedClockIn: reqIn,
            requestedClockOut: reqOut,
            reason: reason.trim()
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto relative animate-fade-in-down" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center" title="Close modal">
                    <XIcon className="h-6 w-6"/>
                </button>

                <div className="text-center mb-6">
                     <h3 className="text-xl font-bold text-gray-800">Request Time Adjustment</h3>
                     <p className="text-gray-500 text-sm mt-1">
                         {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                     </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="requested-clock-in" className="block text-sm font-bold text-gray-700 mb-1">Requested Clock In</label>
                        <input
                            id="requested-clock-in"
                            type="time"
                            value={requestedClockIn}
                            onChange={e => setRequestedClockIn(e.target.value)}
                            className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-mono text-center"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="requested-clock-out" className="block text-sm font-bold text-gray-700 mb-1">Requested Clock Out</label>
                        <input
                            id="requested-clock-out"
                            type="time"
                            value={requestedClockOut}
                            onChange={e => setRequestedClockOut(e.target.value)}
                            className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-mono text-center"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="adjustment-reason" className="block text-sm font-bold text-gray-700 mb-1">Reason</label>
                        <textarea
                            id="adjustment-reason"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={3}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm"
                            placeholder="Explain why this adjustment is needed..."
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="py-2.5 px-5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                        <button
                            type="submit"
                            className="py-2.5 px-5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover shadow-md transition-colors"
                        >
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManualAdjustmentModal;
