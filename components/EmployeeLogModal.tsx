

import React, { useState, useMemo, useEffect } from 'react';
import { User, TimeEntry, TimeEntryType } from '../types';
import { XIcon, CameraIcon, MapPinIcon } from './Icons';
import ImagePreviewModal from './ImagePreviewModal';
import { api } from '../services/api';

const formatDuration = (ms: number, withSign = false) => {
    if (isNaN(ms)) return "00:00:00";
    const isNegative = ms < 0;
    if (isNegative) ms = -ms;
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const sign = isNegative ? '-' : (withSign ? '+' : '');

    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

interface EmployeeLogModalProps {
    user: User;
    date?: Date; // Optional date for filtering
    onClose: () => void;
    adjustment?: any;
}

const EmployeeLogModal = ({ user, date, onClose, adjustment }: EmployeeLogModalProps) => {
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const dateToUse = adjustment?.originalClockIn ? new Date(adjustment.originalClockIn) : date;

    useEffect(() => {
        const fetchTimeEntries = async () => {
            if (!user.tenantId) {
                setError('Invalid user data');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const dateString = dateToUse ? dateToUse.toISOString().split('T')[0] : undefined;
                const rawEntries = await api.getTimeEntries(user.tenantId, user.id, dateString);
                const entries = rawEntries.map((entry: any) => ({
                    ...entry,
                    type: entry.type === 'clock_in' ? TimeEntryType.CLOCK_IN : TimeEntryType.CLOCK_OUT,
                    timestamp: new Date(entry.timestamp)
                }));
                setTimeEntries(entries);
            } catch (err) {
                console.error('Failed to fetch time entries:', err);
                setError('Failed to load time entries');
                setTimeEntries([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTimeEntries();
    }, [user, dateToUse]);

    const userTimeEntries = useMemo(() => {
        return timeEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [timeEntries]);

    const monthlyWorkHistory = useMemo(() => {
        const entriesByDate = timeEntries.reduce((acc, entry) => {
            const dateKey = new Date(entry.timestamp).toDateString();
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(entry);
            return acc;
        }, {} as Record<string, TimeEntry[]>);

        const dailySummaries = Object.keys(entriesByDate).map(dateKey => {
            const dayEntries = entriesByDate[dateKey].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            const clockIns = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_IN).map(e => new Date(e.timestamp));
            const clockOuts = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_OUT).map(e => new Date(e.timestamp));
            
            let totalWorkedMs = 0;
            if (clockIns.length > 0 && clockOuts.length > 0) {
                const earliestIn = new Date(Math.min(...clockIns.map(d => d.getTime())));
                const latestOut = new Date(Math.max(...clockOuts.map(d => d.getTime())));
                totalWorkedMs = latestOut.getTime() - earliestIn.getTime();
            }
            
            return {
                date: new Date(dateKey),
                worked: totalWorkedMs
            };
        });

        const months = dailySummaries.reduce((acc, day) => {
            const monthKey = `${day.date.getFullYear()}-${(day.date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!acc[monthKey]) {
                acc[monthKey] = 0;
            }
            acc[monthKey] += day.worked;
            return acc;
        }, {} as Record<string, number>);

        return Object.keys(months)
            .map(monthKey => ({
                month: monthKey,
                totalWorked: months[monthKey]
            }))
            .sort((a, b) => b.month.localeCompare(a.month));
    }, [timeEntries]);

    const currentMonthTotal = useMemo(() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthData = monthlyWorkHistory.find(m => m.month === currentMonth);
        return monthData ? monthData.totalWorked : 0;
    }, [monthlyWorkHistory]);

    const title = dateToUse 
        ? `Time Log for ${user.name} on ${dateToUse.toLocaleDateString()}`
        : `Full Time Log for ${user.name}`;

    return (
        <>
            {previewImageUrl && <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} isSecureContext={true} />}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative" onClick={e => e.stopPropagation()}>
                    <button  title="Close" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6"/>
                    </button>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
                    {adjustment && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-md border">
                            <h4 className="font-semibold text-gray-800 mb-2">Time Adjustment Request</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Reason:</strong> {adjustment.adjustment_reason}</p>
                                {adjustment.originalClockIn && <p><strong>Original Clock In:</strong> {adjustment.originalClockIn.toLocaleString()}</p>}
                                {adjustment.originalClockOut && <p><strong>Original Clock Out:</strong> {adjustment.originalClockOut.toLocaleString()}</p>}
                                <p><strong>Requested Clock In:</strong> {adjustment.requestedClockIn.toLocaleString()}</p>
                                {adjustment.requestedClockOut && <p><strong>Requested Clock Out:</strong> {adjustment.requestedClockOut.toLocaleString()}</p>}
                                <p><strong>Status:</strong> {adjustment.adjustment_status}</p>
                            </div>
                        </div>
                    )}
                    {!dateToUse && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-md border">
                            <h4 className="font-semibold text-gray-800 mb-2">Monthly Summary</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Total Hours This Month:</strong> {formatDuration(currentMonthTotal)}</p>
                                <div className="mt-2">
                                    <strong>Monthly History:</strong>
                                    <ul className="list-disc list-inside mt-1">
                                        {monthlyWorkHistory.slice(0, 5).map(month => (
                                            <li key={month.month}>
                                                {new Date(month.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}: {formatDuration(month.totalWorked)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="max-h-[70vh] overflow-y-auto">
                        {loading ? (
                            <div className="text-center py-10">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <p className="mt-2 text-gray-500">Loading time entries...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-10">
                                <p className="text-red-500">{error}</p>
                            </div>
                        ) : userTimeEntries.length > 0 ? (
                            <ul className="space-y-3">
                                {userTimeEntries.map(entry => (
                                    <li key={entry.id} className="p-3 bg-gray-50 rounded-md border">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-gray-700">{entry.type}</p>
                                            <p className="text-sm font-medium text-gray-600">{entry.timestamp.toLocaleString()}</p>
                                        </div>
                                        <div className="mt-2 text-sm text-gray-500 space-y-1">
                                            {entry.location && (
                                                <div className="flex items-center">
                                                    <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                                                    <span>{entry.location}</span>
                                                </div>
                                            )}
                                            {entry.photoUrl && (
                                                <div className="flex items-center">
                                                    <CameraIcon className="h-4 w-4 mr-2 text-gray-400" />
                                                    <button onClick={() => setPreviewImageUrl(entry.photoUrl!)} className="text-primary hover:underline">
                                                        View Photo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 py-10">No time entries found for this period.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default EmployeeLogModal;