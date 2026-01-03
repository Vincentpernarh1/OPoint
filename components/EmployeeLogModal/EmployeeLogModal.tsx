

import React, { useState, useMemo, useEffect } from 'react';
import { User, TimeEntry, TimeEntryType } from '../../types';
import { XIcon, CameraIcon, MapPinIcon } from "../Icons/Icons";
import ImagePreviewModal from "../ImagePreviewModal/ImagePreviewModal";
import { api } from '../../services/api';
import './EmployeeLogModal.css';

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
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const dateToUse = adjustment?.originalClockIn ? new Date(adjustment.originalClockIn) : date;

    useEffect(() => {
        const fetchData = async () => {
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

                if (!dateToUse) {
                    // Fetch adjustments for full log
                    const adjustmentData = await api.getTimeAdjustmentRequests(user.tenantId!, { userId: user.id });
                    setAdjustments(adjustmentData);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load time entries');
                setTimeEntries([]);
                setAdjustments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, dateToUse]);

    const userTimeEntries = useMemo(() => {
        return timeEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [timeEntries]);

    const dailyLogs = useMemo(() => {
        const entriesByDate = timeEntries.reduce((acc, entry) => {
            const dateKey = new Date(entry.timestamp).toDateString();
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(entry);
            return acc;
        }, {} as Record<string, TimeEntry[]>);

        return Object.keys(entriesByDate)
            .map(dateKey => {
                const dayEntries = entriesByDate[dateKey].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                const clockIns = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_IN);
                const clockOuts = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_OUT);

                // Check for approved adjustment
                const dateStr = new Date(dateKey).toISOString().split('T')[0];
                const approvedAdjustment = adjustments.find(adj => 
                    adj.adjustment_status === 'Approved' && 
                    (adj.requested_date === dateStr || new Date(adj.requested_clock_in).toDateString() === dateKey)
                );

                let displayClockIn: Date | undefined;
                let displayClockOut: Date | undefined;

                if (approvedAdjustment) {
                    displayClockIn = new Date(approvedAdjustment.requested_clock_in);
                    displayClockOut = approvedAdjustment.requested_clock_out ? new Date(approvedAdjustment.requested_clock_out) : undefined;
                } else {
                    displayClockIn = clockIns.length > 0 ? clockIns[0].timestamp : undefined;
                    displayClockOut = clockOuts.length > 0 ? clockOuts[clockOuts.length - 1].timestamp : undefined;
                }

                const totalWorkedMs = displayClockIn && displayClockOut ? displayClockOut.getTime() - displayClockIn.getTime() : 0;

                return {
                    date: new Date(dateKey),
                    clockIn: displayClockIn,
                    clockOut: displayClockOut,
                    totalWorked: totalWorkedMs,
                    entries: dayEntries,
                    hasAdjustment: !!approvedAdjustment
                };
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [timeEntries, adjustments]);

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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-2 sm:p-4" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-xl p-2 sm:p-3 md:p-6 w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-4xl relative max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                    <button  title="Close" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                        <XIcon className="h-6 w-6"/>
                    </button>
                    <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4 text-gray-800">{title}</h3>
                    <div className="scroll-container employee-log-modal-scroll">
                    {adjustment && (
                        <div className="mb-2 sm:mb-4 p-2 sm:p-4 bg-blue-50 rounded-md border">
                            <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Time Adjustment Request</h4>
                            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
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
                        <div className="mb-2 sm:mb-4 p-2 sm:p-4 bg-blue-50 rounded-md border">
                            <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Monthly Summary</h4>
                            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                                <p><strong>Total Hours This Month:</strong> {formatDuration(currentMonthTotal)}</p>
                                <div className="mt-1 sm:mt-2">
                                    <strong className="text-xs sm:text-sm">Monthly History:</strong>
                                    <ul className="list-disc list-inside mt-1 text-xs sm:text-sm">
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
                        {loading ? (
                            <div className="text-center py-10">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <p className="mt-2 text-gray-500">Loading time entries...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-10">
                                <p className="text-red-500">{error}</p>
                            </div>
                        ) : dailyLogs.length > 0 ? (
                            <div className="space-y-2 sm:space-y-4">
                                {dailyLogs.map(day => (
                                    <div key={day.date.toISOString()} className="p-1 sm:p-2 md:p-4 bg-gray-50 rounded-md border">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1 sm:mb-2 gap-1">
                                            <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                                                <span className="sm:hidden">{day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                <span className="hidden sm:inline">{day.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            </h4>
                                            <div className="text-xs sm:text-sm text-gray-600">
                                                Total: {formatDuration(day.totalWorked)}
                                                {day.hasAdjustment && <span className="ml-1 sm:ml-2 text-green-600">(Adj)</span>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 md:gap-4 text-xs sm:text-sm">
                                            <div>
                                                <strong>Clock In:</strong> {day.clockIn ? day.clockIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                                            </div>
                                            <div>
                                                <strong>Clock Out:</strong> {day.clockOut ? day.clockOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                                            </div>
                                        </div>
                                        {day.entries.some(e => e.location) && (
                                            <div className="mt-0.5 sm:mt-1 md:mt-2 text-xs sm:text-sm text-gray-500">
                                                <strong>Location:</strong> {day.entries.find(e => e.location)?.location}
                                            </div>
                                        )}
                                        {day.entries.some(e => e.photoUrl) && (
                                            <div className="mt-0.5 sm:mt-1 md:mt-2">
                                                <button 
                                                    onClick={() => setPreviewImageUrl(day.entries.find(e => e.photoUrl)?.photoUrl!)} 
                                                    className="text-primary hover:underline text-xs sm:text-sm"
                                                >
                                                    View Photo
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
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