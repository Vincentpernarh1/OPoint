
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimeEntry, TimeEntryType, User, Announcement, AdjustmentRequest, RequestStatus } from '../types';
import { TIME_ENTRIES, ADJUSTMENT_REQUESTS } from '../constants';
import { MapPinIcon, ArrowUpRightIcon, ArrowDownLeftIcon, MegaphoneIcon, ClockIcon, XIcon } from './Icons';
import CameraModal from './CameraModal';
import ImagePreviewModal from './ImagePreviewModal';
import ManualAdjustmentModal from './ManualAdjustmentModal';
import Notification from './Notification';
import { offlineStorage } from '../services/offlineStorage';
import { api } from '../services/api';
import './TimeClock.css';


interface TimeClockProps {
    currentUser: User;
    isOnline: boolean;
    announcements?: Announcement[];
}

// Wrapper for geolocation to convert it to a Promise
const getCurrentPosition = (options?: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
};

const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
    try {
        // Use OpenStreetMap Nominatim API for reverse geocoding
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'en-US,en;q=0.9', // Request English results
                }
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding service unavailable');
        }

        const data = await response.json();
        const addr = data.address;

        if (!addr) {
            return `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
        }

        // prioritized address components for a readable short format
        const components = [
            addr.road || addr.pedestrian || addr.building, // Street/Place
            addr.neighbourhood || addr.suburb || addr.district || addr.quarter, // Neighborhood
            addr.city || addr.town || addr.village || addr.municipality // City
        ].filter(Boolean); // Remove empty values

        // If we found specific components, join them
        if (components.length > 0) {
            // Deduplicate components (sometimes neighborhood and city are same)
            const uniqueComponents = [...new Set(components)];
            return uniqueComponents.join(', ');
        }
        
        // Fallback to display_name if available, otherwise coordinates
        if (data.display_name) {
             const shortName = data.display_name.split(',').slice(0, 3).join(',');
             return shortName;
        }

        return `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;

    } catch (error) {
        console.warn("Reverse geocoding failed, falling back to coordinates:", error);
        return `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
    }
};

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

const TimeClock = ({ currentUser, isOnline, announcements = [] }: TimeClockProps) => {
    const [time, setTime] = useState(new Date());
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequest[]>(ADJUSTMENT_REQUESTS.filter(r => r.userId === currentUser.id));
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [currentActionType, setCurrentActionType] = useState<TimeEntryType | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    
    // Changed to store both date and entries for the adjustment modal
    const [adjustmentTarget, setAdjustmentTarget] = useState<{date: string, clockIn?: Date, clockOut?: Date} | null>(null);
    
    const [notification, setNotification] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const progressBarRef = useRef<HTMLDivElement>(null);
    
    const latestAnnouncement = useMemo(() => announcements.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0], [announcements]);

    // Load entries
    useEffect(() => {
        try {
            // Load from constants/mock data (in real app, this would be from API)
            const serverEntries = TIME_ENTRIES.filter(e => e.userId === currentUser.id);
            
            // Filter out future entries
            const now = new Date();
            const validEntries = serverEntries.filter(e => e.timestamp <= now);
            
            // Sort
            validEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            
            setTimeEntries(validEntries);
        } catch (error) {
            console.error("Failed to load time entries", error);
            setTimeEntries([]);
        }
    }, [currentUser.id]);

    // Sync data when online status changes
    useEffect(() => {
        if (isOnline) {
            // Sync offline data
            const syncData = async () => {
                const unsynced = await offlineStorage.getUnsyncedTimePunches(currentUser.tenantId || '');
                if (unsynced.length > 0) {
                    console.log("Syncing offline time punches...", unsynced);
                    // Here you would call the API to sync each punch
                    // For now, just mark as synced and delete
                    for (const punch of unsynced) {
                        await offlineStorage.markTimePunchSynced(punch.id);
                        await offlineStorage.deleteTimePunch(punch.id);
                    }
                    setNotification(`${unsynced.length} offline record(s) synced successfully!`);
                }
            };
            syncData();
        }
    }, [isOnline, currentUser.tenantId]);

    const lastEntry = useMemo(() => {
        if (timeEntries.length === 0) return null;
        return timeEntries[0]; // Already sorted
    }, [timeEntries]);

    const isClockedIn = lastEntry?.type === TimeEntryType.CLOCK_IN;

     const dailyWorkHistory = useMemo(() => {
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
                const dayEntries = entriesByDate[dateKey].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                
                // Find earliest clock-in and latest clock-out
                const clockIns = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_IN).map(e => new Date(e.timestamp));
                const clockOuts = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_OUT).map(e => new Date(e.timestamp));
                
                let totalWorkedMs = 0;
                if (clockIns.length > 0 && clockOuts.length > 0) {
                    const earliestIn = new Date(Math.min(...clockIns.map(d => d.getTime())));
                    const latestOut = new Date(Math.max(...clockOuts.map(d => d.getTime())));
                    totalWorkedMs = latestOut.getTime() - earliestIn.getTime();
                } else if (clockIns.length > 0 && dateKey === time.toDateString()) {
                    // Current day, clocked in but not out yet
                    const earliestIn = new Date(Math.min(...clockIns.map(d => d.getTime())));
                    totalWorkedMs = time.getTime() - earliestIn.getTime();
                }
                
                const requiredMs = 8 * 60 * 60 * 1000;
                const balanceMs = totalWorkedMs - requiredMs;

                return {
                    date: new Date(dateKey),
                    entries: dayEntries.reverse(),
                    summary: { worked: totalWorkedMs, balance: balanceMs },
                };
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [timeEntries, time]);

    const todaySummary = useMemo(() => {
        const todayHistory = dailyWorkHistory.find(d => d.date.toDateString() === time.toDateString());
        return todayHistory ? todayHistory.summary : { worked: 0, balance: -8 * 3600 * 1000 };
    }, [dailyWorkHistory, time]);

    useEffect(() => {
        const loadTimeEntries = async () => {
            try {
                const punches = await offlineStorage.getTimePunches(currentUser.tenantId || '', currentUser.id);
                const entries: TimeEntry[] = punches.map(p => ({
                    id: p.id,
                    userId: p.userId,
                    type: p.type === 'clock_in' ? TimeEntryType.CLOCK_IN : TimeEntryType.CLOCK_OUT,
                    timestamp: new Date(p.timestamp),
                    location: p.location || 'Location unavailable',
                    photoUrl: p.photoUrl,
                    synced: p.synced
                }));
                setTimeEntries(entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
            } catch (error) {
                console.error('Failed to load time entries:', error);
            }
        };
        loadTimeEntries();
    }, [currentUser.id, currentUser.tenantId]);

    useEffect(() => {
        const syncUnsyncedPunches = async () => {
            if (!isOnline) return;
            try {
                const unsynced = await offlineStorage.getUnsyncedTimePunches(currentUser.tenantId || '');
                for (const punch of unsynced) {
                    try {
                        await api.saveTimePunch(currentUser.tenantId || '', {
                            userId: punch.userId,
                            companyId: punch.companyId,
                            type: punch.type,
                            timestamp: punch.timestamp,
                            location: punch.location,
                            photoUrl: punch.photoUrl
                        });
                        await offlineStorage.markTimePunchSynced(punch.id);
                    } catch (syncError) {
                        console.error('Failed to sync punch:', punch.id, syncError);
                    }
                }
            } catch (error) {
                console.error('Failed to sync unsynced punches:', error);
            }
        };
        syncUnsyncedPunches();
    }, [isOnline, currentUser.tenantId]);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleClockAction = (type: TimeEntryType) => {
        setCurrentActionType(type);
        setIsCameraOpen(true);
    };
    
    const handleCapture = (photoUrl: string) => {
        if(currentActionType) {
            createTimeEntry(currentActionType, photoUrl);
        }
        setIsCameraOpen(false);
        setCurrentActionType(null);
    };

    const saveNewEntry = async (newEntry: TimeEntry) => {
        if (!isOnline) {
            // Save to offline storage
            await offlineStorage.saveTimePunch({
                id: newEntry.id,
                userId: newEntry.userId,
                companyId: currentUser.tenantId || '',
                type: newEntry.type === TimeEntryType.CLOCK_IN ? 'clock_in' : 'clock_out',
                timestamp: newEntry.timestamp.toISOString(),
                location: newEntry.location,
                photoUrl: newEntry.photoUrl,
                synced: false,
                createdAt: new Date().toISOString()
            });
        } else {
            // Online: try to sync immediately
            try {
                await api.saveTimePunch(currentUser.tenantId || '', {
                    userId: newEntry.userId,
                    companyId: currentUser.tenantId || '',
                    type: newEntry.type === TimeEntryType.CLOCK_IN ? 'clock_in' : 'clock_out',
                    timestamp: newEntry.timestamp.toISOString(),
                    location: newEntry.location,
                    photoUrl: newEntry.photoUrl
                });
                // Mark as synced
                await offlineStorage.saveTimePunch({
                    id: newEntry.id,
                    userId: newEntry.userId,
                    companyId: currentUser.tenantId || '',
                    type: newEntry.type === TimeEntryType.CLOCK_IN ? 'clock_in' : 'clock_out',
                    timestamp: newEntry.timestamp.toISOString(),
                    location: newEntry.location,
                    photoUrl: newEntry.photoUrl,
                    synced: true,
                    createdAt: new Date().toISOString()
                });
            } catch (error) {
                console.error('Failed to sync online:', error);
                // Save offline
                await offlineStorage.saveTimePunch({
                    id: newEntry.id,
                    userId: newEntry.userId,
                    companyId: currentUser.tenantId || '',
                    type: newEntry.type === TimeEntryType.CLOCK_IN ? 'clock_in' : 'clock_out',
                    timestamp: newEntry.timestamp.toISOString(),
                    location: newEntry.location,
                    photoUrl: newEntry.photoUrl,
                    synced: false,
                    createdAt: new Date().toISOString()
                });
            }
        }
        // Always update local state
        setTimeEntries(prevEntries => {
            const updatedEntries = [newEntry, ...prevEntries];
            updatedEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            return updatedEntries;
        });
    };

    const createTimeEntry = async (type: TimeEntryType, photoUrl?: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setLocationError(null);

        // Use a local variable to prevent race condition issues with state updates
        let processingComplete = false;

        // Check geolocation permission first
        if ('permissions' in navigator) {
            try {
                const permission = await navigator.permissions.query({ name: 'geolocation' });
                if (permission.state === 'denied') {
                    setLocationError("Location permission denied. Please enable location access in browser settings for localhost. Entry saved locally.");
                    const newEntry: TimeEntry = {
                        id: `te-${Date.now()}`,
                        userId: currentUser.id,
                        type,
                        timestamp: new Date(),
                        location: 'Location unavailable',
                        photoUrl,
                        synced: isOnline
                    };
                    saveNewEntry(newEntry);
                    setIsProcessing(false);
                    return;
                }
            } catch (permError) {
                console.warn("Permission query failed:", permError);
            }
        }

        try {
            // Create a timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Timeout")), 5000)
            );

            // Race between geolocation and timeout
            const position = await Promise.race([
                getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }),
                timeoutPromise
            ]) as GeolocationPosition;

            if (processingComplete) return; // Guard clause

            const { latitude, longitude } = position.coords;
            console.log('Geolocation coordinates:', latitude, longitude);
            
            let locationName = '';
            try {
                locationName = await getAddressFromCoordinates(latitude, longitude);
            } catch {
                locationName = `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
            }

            const newEntry: TimeEntry = {
                id: `te-${Date.now()}`,
                userId: currentUser.id,
                type,
                timestamp: new Date(),
                location: locationName,
                photoUrl,
                synced: isOnline
            };

            saveNewEntry(newEntry);

        } catch (error) {
            console.warn("Geolocation failed or timed out:", error);
            if (processingComplete) return;

            const newEntry: TimeEntry = {
                id: `te-${Date.now()}`,
                userId: currentUser.id,
                type,
                timestamp: new Date(),
                location: 'Location unavailable',
                photoUrl,
                synced: isOnline
            };
            setLocationError("Could not verify location. Entry saved locally.");
            saveNewEntry(newEntry);
        } finally {
            processingComplete = true;
            setIsProcessing(false);
        }
    };

    const handleAdjustmentSubmit = async (adjustment: Omit<AdjustmentRequest, 'id' | 'userId' | 'status'>) => {
        try {
            // Create new adjustment request via API
            await api.createTimeAdjustmentRequest(currentUser.tenantId || '', {
                userId: currentUser.id,
                date: adjustment.date.toISOString().split('T')[0], // YYYY-MM-DD
                originalClockIn: adjustment.originalClockIn?.toISOString(),
                originalClockOut: adjustment.originalClockOut?.toISOString(),
                requestedClockIn: adjustment.requestedClockIn.toISOString(),
                requestedClockOut: adjustment.requestedClockOut.toISOString(),
                reason: adjustment.reason
            });

            setAdjustmentTarget(null);
            setNotification('Time adjustment request submitted successfully!');
        } catch (error) {
            console.error('Failed to submit adjustment request:', error);
            setNotification('Failed to submit time adjustment request. Please try again.');
        }
    };
    
    const handleCancelAdjustment = (requestId: string) => {
        if(window.confirm('Are you sure you want to cancel this adjustment request?')) {
            setAdjustmentRequests(prev => prev.filter(req => req.id !== requestId));
            setNotification('Adjustment request cancelled.');
        }
    };
    
    const getStatus = () => {
        if (!isClockedIn) return { text: "Clocked Out", color: "bg-gray-500", textColor: "text-gray-500" };
        return { text: "Working", color: "bg-green-500", textColor: "text-green-500" };
    };

    const currentStatus = getStatus();
    
    const progressPercentage = useMemo(() => {
        const total = 8 * 3600 * 1000;
        const isCurrentlyClockedIn = timeEntries.length > 0 && timeEntries[0].type === TimeEntryType.CLOCK_IN;
        const lastClockIn = isCurrentlyClockedIn ? timeEntries[0] : null;
        const currentSession = lastClockIn ? Math.max(0, time.getTime() - lastClockIn.timestamp.getTime()) : 0;
        const worked = todaySummary.worked + currentSession;
        return Math.min(100, Math.max(0, (worked / total) * 100));
    }, [todaySummary.worked, time, timeEntries]);

    // Update progress bar width dynamically
    useEffect(() => {
        if (progressBarRef.current) {
            progressBarRef.current.style.width = `${progressPercentage}%`;
        }
    }, [progressPercentage]);

    // Determines if a specific day needs an adjustment button based on 10 min tolerance
    const isAdjustmentNeeded = (summary: { worked: number, balance: number }, entries: TimeEntry[], date: Date) => {
        // Use the current system time/state time to determine 'today'
        const isToday = date.toDateString() === time.toDateString();
        
        // Requirement: Adjustment only available after the day is closed (i.e., strictly past days)
        if (isToday) {
             return { needed: false, reason: '' };
        }

        const totalMinutes = summary.worked / (1000 * 60);
        
        // 1. Missing Punches: Odd number of entries implies a missing clock out/in pair.
        if (entries.length % 2 !== 0) {
            return { needed: true, reason: 'Missing punch detected' };
        }

        // 8 hours = 480 minutes.
        // Tolerance = 10 minutes.
        // Accepted Range: 470 mins (7h 50m) to 490 mins (8h 10m).
        
        const MIN_ACCEPTED_MINUTES = 470; 
        const MAX_ACCEPTED_MINUTES = 490;

        if (totalMinutes < MIN_ACCEPTED_MINUTES) {
             return { needed: true, reason: 'Shift under 8 hours (< 7h 50m)' };
        }

        if (totalMinutes > MAX_ACCEPTED_MINUTES) {
            return { needed: true, reason: 'Shift over 8 hours (> 8h 10m)' };
        }

        return { needed: false, reason: '' };
    };

    return (
        <>
            {isCameraOpen && <CameraModal onCapture={handleCapture} onClose={() => setIsCameraOpen(false)}/>}
            {previewImageUrl && <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} isSecureContext={false} />}
            {adjustmentTarget && (
                <ManualAdjustmentModal 
                    onClose={() => setAdjustmentTarget(null)} 
                    onSubmit={handleAdjustmentSubmit} 
                    date={adjustmentTarget.date} 
                    existingClockIn={adjustmentTarget.clockIn}
                    existingClockOut={adjustmentTarget.clockOut}
                />
            )}
            {notification && <Notification message={notification} type="success" onClose={() => setNotification(null)} />}
            
            <div className="space-y-8">
                {latestAnnouncement && (
                    <div className="bg-primary-light border-l-4 border-primary text-primary-dark p-4 rounded-r-lg shadow-md" role="alert">
                        <div className="flex items-start">
                            <div className="py-1"><MegaphoneIcon className="h-6 w-6 text-primary" /></div>
                            <div className="ml-3">
                                <p className="font-bold">{latestAnnouncement.title}</p>
                                <p className="text-sm">{latestAnnouncement.content}</p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-full">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4">
                            <div className='text-center md:text-left'>
                                <h2 className="text-2xl font-bold text-gray-800">Time Clock</h2>
                                <p className="text-gray-500">Log your work hours for today</p>
                            </div>
                            <div className="text-center md:text-right mt-4 md:mt-0">
                                <div className="text-4xl font-bold text-primary">{time.toLocaleTimeString()}</div>
                                <div className="text-gray-500">{time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-lg">
                            <div className={`flex items-center text-white px-4 py-2 rounded-full mb-4 text-sm font-medium ${currentStatus.color}`}>
                                <span className={`w-2 h-2 rounded-full bg-white mr-2 ${isClockedIn ? 'animate-pulse' : ''}`}></span>
                                {currentStatus.text}
                            </div>
                            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                                <button 
                                    onClick={() => handleClockAction(TimeEntryType.CLOCK_IN)} 
                                    disabled={isClockedIn || isProcessing} 
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-300 transition-colors"
                                >
                                    {isProcessing && !isClockedIn ? 'Processing...' : 'Clock In'}
                                </button>
                                <button 
                                    onClick={() => handleClockAction(TimeEntryType.CLOCK_OUT)} 
                                    disabled={!isClockedIn || isProcessing} 
                                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-300 transition-colors"
                                >
                                    {isProcessing && isClockedIn ? 'Processing...' : 'Clock Out'}
                                </button>
                            </div>
                            {locationError && <p className="text-red-500 text-xs mt-2 text-center">{locationError}</p>}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg w-full space-y-6">
                        <h3 className="text-xl font-bold text-gray-800 border-b pb-3">Today's Summary</h3>
                        <div className='text-center'>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Worked Today</p>
                            <p className={`text-4xl font-bold ${currentStatus.textColor}`}>{formatDuration(todaySummary.worked + (timeEntries.length > 0 && timeEntries[0].type === TimeEntryType.CLOCK_IN ? Math.max(0, time.getTime() - timeEntries[0].timestamp.getTime()) : 0))}</p>
                        </div>
                        <div className='text-center'>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Hour Bank</p>
                            <p className={`text-4xl font-bold ${todaySummary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {formatDuration(todaySummary.balance, true)}
                            </p>
                        </div>
                        <div className="pt-4">
                            <p className="text-sm text-gray-500 mb-1">Progress to 8hr Goal</p>
                            <div className="progress-bar-container">
                                <div 
                                    ref={progressBarRef}
                                    className="progress-bar-fill"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg w-full">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Work History</h3>
                    <div className="space-y-8 max-h-[40rem] overflow-y-auto pr-2">
                        {dailyWorkHistory.length > 0 ? dailyWorkHistory.map(day => {
                            const { needed, reason } = isAdjustmentNeeded(day.summary, day.entries, day.date);
                            const pendingRequest = adjustmentRequests.find(req => 
                                new Date(req.date).toDateString() === day.date.toDateString() && 
                                req.status === RequestStatus.PENDING
                            );
                            
                            return (
                                <div key={day.date.toISOString()} className="border-b pb-6 last:border-b-0">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 p-2 bg-slate-50 rounded-lg">
                                        <h4 className="font-bold text-lg text-gray-700">{day.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                                        <div className="text-left sm:text-right text-sm mt-2 sm:mt-0">
                                            <p className="font-medium text-gray-600">Worked: <span className="font-bold text-gray-800">{formatDuration(day.summary.worked)}</span></p>
                                            <p className={`font-medium ${day.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                Balance: <span className="font-bold">{formatDuration(day.summary.balance, true)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {day.entries.map(entry => (
                                            <div key={entry.id} className="bg-gray-50 p-3 rounded-md">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        {entry.type === TimeEntryType.CLOCK_IN ? <ArrowUpRightIcon className="h-5 w-5 text-green-500 mr-3" /> : <ArrowDownLeftIcon className="h-5 w-5 text-red-500 mr-3" />}
                                                        <span className={`font-medium ${entry.type === TimeEntryType.CLOCK_IN ? 'text-green-700' : 'text-red-700'}`}>{entry.type}</span>
                                                        {!entry.synced && <span className="text-xs ml-2 bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">Pending Sync</span>}
                                                    </div>
                                                    <span className="text-sm text-gray-600 font-semibold">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="mt-2 pl-8 space-y-2 text-sm">
                                                    {entry.location && entry.location !== 'Location not available' && (
                                                        <div className="flex items-center text-gray-500">
                                                            <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
                                                            <span className="truncate">{entry.location}</span>
                                                        </div>
                                                    )}
                                                    {entry.photoUrl && (
                                                        <div className="flex items-center">
                                                                <button onClick={() => setPreviewImageUrl(entry.photoUrl!)} className="flex items-center space-x-2 group">
                                                                <img src={entry.photoUrl} alt="Clock-in selfie" className="w-8 h-8 rounded-md object-cover border"/>
                                                                <span className="text-primary text-xs font-medium group-hover:underline">View Photo</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* ADJUSTMENT SECTION */}
                                    <div className="mt-4 flex justify-end">
                                        {pendingRequest ? (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center space-x-4">
                                                <div className="flex items-center text-amber-700">
                                                    <ClockIcon className="h-5 w-5 mr-2" />
                                                    <span className="font-semibold text-sm">Adjustment Requested</span>
                                                </div>
                                                <div className="h-4 w-px bg-amber-300"></div>
                                                <button 
                                                    onClick={() => handleCancelAdjustment(pendingRequest.id)}
                                                    className="text-xs font-medium text-red-600 hover:underline flex items-center"
                                                >
                                                    <XIcon className="h-3 w-3 mr-1" />
                                                    Cancel Request
                                                </button>
                                            </div>
                                        ) : needed ? (
                                            <div className="text-right">
                                                <button 
                                                    onClick={() => {
                                                        const dayEntries = day.entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                                        const clockIns = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_IN).map(e => new Date(e.timestamp));
                                                        const clockOuts = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_OUT).map(e => new Date(e.timestamp));
                                                        const clockIn = clockIns.length > 0 ? new Date(Math.min(...clockIns.map(d => d.getTime()))) : undefined;
                                                        const clockOut = clockOuts.length > 0 ? new Date(Math.max(...clockOuts.map(d => d.getTime()))) : undefined;
                                                        setAdjustmentTarget({
                                                            date: `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`,
                                                            clockIn,
                                                            clockOut
                                                        });
                                                    }} 
                                                    className="text-sm bg-red-100 text-red-800 font-semibold py-2 px-4 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center ml-auto"
                                                >
                                                    <span>Request Adjustment</span>
                                                </button>
                                                <p className="text-xs text-red-500 mt-1 font-medium">{reason}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-gray-500 text-center py-8">No work history found.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TimeClock;
