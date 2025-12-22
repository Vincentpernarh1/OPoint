

import React, { useState, useMemo, useEffect } from 'react';
import { User, TimeEntry } from '../types';
import { XIcon, CameraIcon, MapPinIcon } from './Icons';
import ImagePreviewModal from './ImagePreviewModal';
import { api } from '../services/api';

interface EmployeeLogModalProps {
    user: User;
    date?: Date; // Optional date for filtering
    onClose: () => void;
}

const EmployeeLogModal = ({ user, date, onClose }: EmployeeLogModalProps) => {
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTimeEntries = async () => {
            try {
                setLoading(true);
                setError(null);
                const dateString = date ? date.toISOString().split('T')[0] : undefined;
                const entries = await api.getTimeEntries(user.tenantId, user.id, dateString);
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
    }, [user, date]);

    const userTimeEntries = useMemo(() => {
        return timeEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [timeEntries]);

    const title = date 
        ? `Time Log for ${user.name} on ${date.toLocaleDateString()}`
        : `Full Time Log for ${user.name}`;

    return (
        <>
            {previewImageUrl && <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} isSecureContext={true} />}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative" onClick={e => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6"/>
                    </button>
                    <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
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