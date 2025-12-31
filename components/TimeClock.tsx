
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimeEntry, TimeEntryType, User, UserRole, Announcement, AdjustmentRequest, RequestStatus } from '../types';
import { ADJUSTMENT_REQUESTS } from '../constants';
import { MapPinIcon, ArrowUpRightIcon, ArrowDownLeftIcon, MegaphoneIcon, ClockIcon, XIcon, CameraIcon } from './Icons';
import { Button } from './ui';
import CameraModal from './CameraModal';
import ImagePreviewModal from './ImagePreviewModal';
import ManualAdjustmentModal from './ManualAdjustmentModal';
import MessageOverlay from './MessageOverlay';
import ConfirmationDialog from './ConfirmationDialog';
import PullToRefreshIndicator from './PullToRefreshIndicator';
import { offlineStorage } from '../services/offlineStorage';
import { api } from '../services/api';
import { useRefreshable } from '../hooks/useRefreshable';
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
    const [adjustmentRequests, setAdjustmentRequests] = useState<AdjustmentRequest[]>([]);
    const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(60); // Default 1 hour
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [currentActionType, setCurrentActionType] = useState<TimeEntryType | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    
    const [adjustmentTarget, setAdjustmentTarget] = useState<{date: string, clockIn?: Date, clockOut?: Date} | null>(null);
    
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [confirmationDialog, setConfirmationDialog] = useState<{
        isVisible: boolean;
        message: string;
        onConfirm: () => void;
    }>({
        isVisible: false,
        message: '',
        onConfirm: () => {}
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(true);
    
    const progressBarRef = useRef<HTMLDivElement>(null);
    const lastActionTimeRef = useRef<number>(0);
    const DEBOUNCE_MS = 2000; // Prevent rapid clicks within 2 seconds

    // Pull-to-refresh functionality
    const handleRefresh = async () => {
        await refreshTimeEntries();
    };

    const { containerRef, isRefreshing, pullDistance, pullProgress } = useRefreshable(handleRefresh);

    // Helpers for date normalization and localStorage parsing
    // Return YYYY-MM-DD using local timezone (avoid UTC conversion)
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

    const parseStoredAdjustments = (raw: string) => {
        try {
            return JSON.parse(raw, (key, value) => {
                if (value && (key === 'requestedClockIn' || key === 'requestedClockOut' || key === 'originalClockIn' || key === 'originalClockOut' || key === 'reviewedAt')) {
                    return value ? new Date(value) : undefined;
                }
                return value;
            });
        } catch (e) {
            console.error('Failed to parse stored adjustments', e);
            return [];
        }
    };
    
    const latestAnnouncement = useMemo(() => announcements.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0], [announcements]);

    // Fetch company settings to get break duration
    useEffect(() => {
        const fetchCompanySettings = async () => {
            if (!currentUser.tenantId) return;
            try {
                const settings = await api.getCompanySettings(currentUser.tenantId);
                if (settings && settings.break_duration_minutes !== undefined) {
                    setBreakDurationMinutes(settings.break_duration_minutes);
                }
            } catch (error) {
                console.warn('Could not fetch company settings, using default break duration:', error);
            }
        };
        fetchCompanySettings();
    }, [currentUser.tenantId]);

    // Ref to prevent overlapping refreshes
    const isRefreshingRef = useRef(false);

    // Fetch latest time entries from server, persist to offline DB, and update local state
    const refreshTimeEntries = async () => {
        if (!currentUser || !currentUser.tenantId) return;
        if (isRefreshingRef.current) return;
        isRefreshingRef.current = true;
        try {
            const serverEntries: any[] = await api.getTimeEntries(currentUser.tenantId!, currentUser.id);
            if (!serverEntries || !Array.isArray(serverEntries)) return;

            const serverMapped: TimeEntry[] = serverEntries.map((item: any, idx: number) => {
                const ts = item.timestamp || item.time || item.created_at || item.clock_in || item.clock_out || item.punched_at;
                const timestamp = ts ? new Date(ts) : new Date();
                const type = (item.type === 'clock_out' || (item.punch_type && item.punch_type === 'clock_out')) ? TimeEntryType.CLOCK_OUT : TimeEntryType.CLOCK_IN;
                return {
                    id: item.id ? String(item.id) : `se-${Date.now()}-${idx}`,
                    userId: item.employee_id || item.user_id || currentUser.id,
                    type,
                    timestamp,
                    location: item.location || item.geo || item.location_name || undefined,
                    photoUrl: item.photo_url || item.photoUrl || undefined,
                    synced: true
                } as TimeEntry;
            });

            // Load local punches (including unsynced) and map to TimeEntry
            let localPunchesRaw: any[] = [];
            try {
                localPunchesRaw = await offlineStorage.getTimePunches(currentUser.tenantId || '', currentUser.id);
            } catch (err) {
                console.warn('Failed to read local punches during refresh', err);
            }

            const localMapped: TimeEntry[] = (localPunchesRaw || []).map((p: any) => ({
                id: p.id,
                userId: p.userId,
                type: p.type === 'clock_in' ? TimeEntryType.CLOCK_IN : TimeEntryType.CLOCK_OUT,
                timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
                location: p.location,
                photoUrl: p.photoUrl,
                synced: !!p.synced
            }));

            // Persist server entries into offline storage as synced punches (only if not already present)
            for (const e of serverMapped) {
                try {
                    // Check if this server entry already exists in local storage
                    const existingLocal = localPunchesRaw.find((p: any) => p.id === e.id);
                    if (!existingLocal) {
                        await offlineStorage.saveTimePunch({
                            id: e.id,
                            userId: e.userId,
                            companyId: currentUser.tenantId || '',
                            type: e.type === TimeEntryType.CLOCK_IN ? 'clock_in' : 'clock_out',
                            timestamp: e.timestamp.toISOString(),
                            location: e.location,
                            photoUrl: e.photoUrl,
                            synced: true,
                            createdAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.warn('Failed to persist server time entry to offline DB', err);
                }
            }

            // If server returned no entries, clear all local entries for this user to ensure clean sync
            if (serverMapped.length === 0 && localPunchesRaw.length > 0) {
                try {
                    console.log('Server returned no entries, clearing local storage for user:', currentUser.id);
                    await offlineStorage.clearTimePunches(currentUser.tenantId || '', currentUser.id);
                    localPunchesRaw = []; // Clear the local array as well
                } catch (err) {
                    console.warn('Failed to clear local time punches', err);
                }
            }

            // Merge server and local entries, preferring server entries for synced data
            const byId = new Map<string, TimeEntry>();
            const byTimestampType = new Map<string, TimeEntry>();

            // Helper function to create a timestamp+type key for deduplication
            // Use date + rounded time to deduplicate entries from cache vs DB
            const getTimestampTypeKey = (entry: TimeEntry) => {
                const date = canonicalDate(entry.timestamp);
                const time = entry.timestamp.getTime();
                // Round to nearest 5 seconds for more aggressive deduplication
                const roundedTime = Math.floor(time / 5000) * 5000;
                return `${date}-${roundedTime}-${entry.type}-${entry.userId}`;
            };

            // Add server entries first
            for (const s of serverMapped) {
                const idKey = s.id;
                const timestampKey = getTimestampTypeKey(s);
                byId.set(idKey, s);
                byTimestampType.set(timestampKey, s);
            }

            // Add local entries, but deduplicate with server entries
            for (const l of localMapped) {
                const idKey = l.id;
                const timestampKey = getTimestampTypeKey(l);

                // Check if we already have this entry by timestamp+type
                const existingByTimestamp = byTimestampType.get(timestampKey);

                if (existingByTimestamp) {
                    // If local is unsynced, prefer it; otherwise keep server version
                    if (!l.synced && existingByTimestamp.synced) {
                        byId.set(idKey, l);
                        byTimestampType.set(timestampKey, l);
                    }
                    // If both are synced or server is preferred, skip local
                } else if (!byId.has(idKey)) {
                    // No conflict, add local entry
                    byId.set(idKey, l);
                    byTimestampType.set(timestampKey, l);
                }
            }

            const combined = Array.from(byId.values());
            combined.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
            setTimeEntries(combined);
        } catch (err) {
            console.warn('refreshTimeEntries failed', err);
        } finally {
            isRefreshingRef.current = false;
        }
    };

    // Load entries and adjustment requests
    useEffect(() => {
        const storageKey = `adjustmentRequests_${currentUser.id}`;
        
        const loadData = async () => {
            try {
                setIsLoadingAdjustments(true);
                
                // Start with empty time entries and immediately refresh from server/local storage
                setTimeEntries([]);

                // Load local adjustments first for immediate availability
                const stored = localStorage.getItem(storageKey);
                let localAdjustments: AdjustmentRequest[] = [];
                if (stored) {
                    try {
                        localAdjustments = JSON.parse(stored, (key, value) => {
                            if (key === 'requestedClockIn' || key === 'requestedClockOut' || 
                                key === 'originalClockIn' || key === 'originalClockOut' || 
                                key === 'reviewedAt') {
                                return value ? new Date(value) : undefined;
                            }
                            return value;
                        });
                        console.log('Loaded local adjustments:', localAdjustments.length, 'items');
                    } catch (e) {
                        console.error('Error parsing localStorage:', e);
                        localAdjustments = [];
                    }
                }

                // Set local adjustments immediately so UI is consistent
                setAdjustmentRequests(localAdjustments);

                // Always refresh time entries from server and local storage first
                try { await refreshTimeEntries(); } catch (e) { console.warn('refreshTimeEntries failed during initial load', e); }

                // Load adjustment requests from API
                try {
                    console.log('Loading adjustment requests from API for user:', currentUser.id, 'tenant:', currentUser.tenantId);
                    const adjustmentData = await api.getTimeAdjustmentRequests(currentUser.tenantId!, { 
                        userId: currentUser.id 
                    });
                    // console.log('API returned adjustment data:', adjustmentData);
                    const transformedAdjustmentData: AdjustmentRequest[] = adjustmentData
                        .filter(item => {
                            // Filter out invalid dates (like 1969-12-31)
                            const date = new Date(item.clock_in || item.requested_clock_in);
                            const year = date.getFullYear();
                            return year > 2000 && year < 2100; // Valid date range
                        })
                        .map((item: any) => ({
                        id: item.id,
                        userId: item.employee_id,
                        employeeName: item.employee_name || currentUser.name, // Fallback to current user name
                        date: (() => {
                            // Prefer explicit date-only field if provided by server
                            if (item.requested_date) return item.requested_date;
                            const d = new Date(item.clock_in || item.requested_clock_in);
                            return canonicalDate(d);
                        })(),
                        originalClockIn: item.clock_in ? new Date(item.clock_in) : undefined,
                        originalClockOut: item.clock_out ? new Date(item.clock_out) : undefined,
                        // For approved adjustments, use clock_in/clock_out (which are the approved times)
                        // For pending/rejected, use requested_clock_in/requested_clock_out
                        requestedClockIn: new Date(item.adjustment_status === 'Approved' && item.clock_in ? item.clock_in : item.requested_clock_in),
                        requestedClockOut: new Date(item.adjustment_status === 'Approved' && item.clock_out ? item.clock_out : item.requested_clock_out),
                        reason: item.adjustment_reason,
                        status: item.adjustment_status as RequestStatus,
                        reviewedBy: item.adjustment_reviewed_by,
                        reviewedAt: item.adjustment_reviewed_at ? new Date(item.adjustment_reviewed_at) : undefined
                    }));
                    
                    // console.log('Transformed API data:', transformedAdjustmentData);
                    
                    // Combine API data with local adjustments. Keep only local-temp (unsynced) entries
                    // if the server returned no matching record to avoid stale cached entries.
                    const combinedData = [...transformedAdjustmentData];

                    for (const local of localAdjustments) {
                        // Always keep local unsynced/temp requests
                        if (String(local.id || '').startsWith('temp-')) {
                            combinedData.push(local);
                            continue;
                        }

                        const existingIndex = combinedData.findIndex(api => (
                            (local.id && api.id === local.id) || api.date === local.date
                        ));

                        if (existingIndex === -1) {
                            // If approved, keep it anyway to prevent vanishing statuses
                            if (local.status === RequestStatus.APPROVED) {
                                combinedData.push(local);
                            }
                            // Else drop (stale pending request)
                            continue;
                        } else {
                            // Merge: prefer server/API values to avoid stale local status
                            combinedData[existingIndex] = { ...local, ...combinedData[existingIndex] };
                        }
                    }

                    setAdjustmentRequests(combinedData);
                    // Persist combined adjustments so local cache reflects latest server state
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(combinedData));
                    } catch (e) {
                        console.error('Failed to persist combined adjustments to localStorage on refresh', e);
                    }

                    // Persist combined adjustments as a local cache (stores ISO strings for dates)
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(combinedData));
                    } catch (e) {
                        console.error('Failed to persist combined adjustments to localStorage', e);
                    }
                    
                } catch (adjustmentError) {
                    console.error("Failed to load adjustment requests from API:", adjustmentError);
                    // Keep local adjustments as the state (already set above)
                    console.log('Keeping local adjustments due to API failure');
                }
            } catch (error) {
                console.error("Failed to load time entries", error);
                setTimeEntries([]);
            } finally {
                setIsLoadingAdjustments(false);
            }
        };

        loadData();
        
        // Refresh adjustment requests every 30 seconds to catch external updates
        const interval = setInterval(() => {
            // Get current local adjustments from localStorage
                let localAdjustments: AdjustmentRequest[] = [];
            try {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    localAdjustments = parseStoredAdjustments(stored);
                }
            } catch (e) {
                console.error('Error parsing localStorage during refresh:', e);
                localAdjustments = [];
            }

            api.getTimeAdjustmentRequests(currentUser.tenantId!, { userId: currentUser.id })
                .then(adjustmentData => {
                    const transformedAdjustmentData: AdjustmentRequest[] = adjustmentData
                        .filter(item => {
                            // Filter out invalid dates (like 1969-12-31)
                            const date = new Date(item.clock_in || item.requested_clock_in);
                            const year = date.getFullYear();
                            return year > 2000 && year < 2100; // Valid date range
                        })
                        .map((item: any) => ({
                        id: item.id,
                        userId: item.employee_id,
                        employeeName: item.employee_name || currentUser.name, // Fallback to current user name
                        date: (() => {
                            if (item.requested_date) return item.requested_date;
                            const d = new Date(item.clock_in || item.requested_clock_in);
                            return canonicalDate(d);
                        })(),
                        originalClockIn: item.clock_in ? new Date(item.clock_in) : undefined,
                        originalClockOut: item.clock_out ? new Date(item.clock_out) : undefined,
                        requestedClockIn: new Date(item.requested_clock_in),
                        requestedClockOut: new Date(item.requested_clock_out),
                        reason: item.adjustment_reason,
                        status: item.adjustment_status as RequestStatus,
                        reviewedBy: item.adjustment_reviewed_by,
                        reviewedAt: item.adjustment_reviewed_at ? new Date(item.adjustment_reviewed_at) : undefined
                    }));
                    
                    // Combine API data with local adjustments. Keep only local-temp (unsynced) entries
                    // if the server returned no matching record to avoid stale cached entries.
                    const combinedData = [...transformedAdjustmentData];

                    for (const local of localAdjustments) {
                        if (String(local.id || '').startsWith('temp-')) {
                            combinedData.push(local);
                            continue;
                        }

                        const existingIndex = combinedData.findIndex(api => (
                            (local.id && api.id === local.id) || api.date === local.date
                        ));

                        if (existingIndex === -1) {
                            // If approved, keep it anyway to prevent vanishing statuses
                            if (local.status === RequestStatus.APPROVED) {
                                combinedData.push(local);
                            }
                            // Else drop (stale pending request)
                            continue;
                        } else {
                            combinedData[existingIndex] = { ...local, ...combinedData[existingIndex] };
                        }
                    }

                    setAdjustmentRequests(combinedData);
                    // If adjustments changed, refresh server time entries to pick up changes
                    try { void refreshTimeEntries(); } catch (e) { console.warn('refreshTimeEntries failed during polling', e); }
                })
                .catch(adjustmentError => {
                    console.error("Failed to refresh adjustment requests", adjustmentError);
                });
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [currentUser.id, currentUser.tenantId]);

    // Sync data when online status changes
    useEffect(() => {
        if (isOnline) {
            // Sync offline data
            const syncData = async () => {
                const unsynced = await offlineStorage.getUnsyncedTimePunches(currentUser.tenantId!);
                if (unsynced.length > 0) {
                    console.log("Syncing offline time punches...", unsynced);
                    // Here you would call the API to sync each punch
                    // For now, just mark as synced and delete
                    for (const punch of unsynced) {
                        await offlineStorage.markTimePunchSynced(punch.id);
                        await offlineStorage.deleteTimePunch(punch.id);
                    }
                    setMessage({ type: 'success', text: `${unsynced.length} offline record(s) synced successfully!` });
                }
            };
            syncData();
        }
    }, [isOnline, currentUser.tenantId]);

    // Listen for adjustment approval events to refresh time entries
    useEffect(() => {
        const handleAdjustmentApproved = async (event: any) => {
            console.log('Adjustment approved event received:', event.detail);
            const { userId, date, status } = event.detail || {};
            
            // Refresh time entries if the adjustment was for this user
            if (userId === currentUser.id || !userId) {
                console.log('Refreshing time entries after adjustment approval');
                await refreshTimeEntries();
            }
        };

        window.addEventListener('adjustment-approved', handleAdjustmentApproved);

        return () => {
            window.removeEventListener('adjustment-approved', handleAdjustmentApproved);
        };
    }, [currentUser.id]);

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
                
                // Check for approved adjustment for this date
                const dateStr = new Date(dateKey).toISOString().split('T')[0];
                const approvedAdjustment = adjustmentRequests.find(req => {
                    return req.date === dateStr && req.status === RequestStatus.APPROVED;
                });
                
                // Use adjustment times if approved, otherwise use actual entries
                let totalWorkedMs = 0;
                let isSingleSession = false;
                
                if (approvedAdjustment) {
                    // Adjustment: use requested times (can have 2 sessions for break tracking)
                    const session1In = approvedAdjustment.requestedClockIn;
                    const session1Out = approvedAdjustment.requestedClockOut;
                    const session2In = approvedAdjustment.requestedClockIn2;
                    const session2Out = approvedAdjustment.requestedClockOut2;
                    
                    // Calculate first session
                    if (session1In && session1Out) {
                        totalWorkedMs += Math.max(0, session1Out.getTime() - session1In.getTime());
                    }
                    
                    // Calculate second session if exists (break tracking)
                    if (session2In && session2Out) {
                        totalWorkedMs += Math.max(0, session2Out.getTime() - session2In.getTime());
                    }
                    
                    isSingleSession = !session2In && !session2Out;
                } else {
                    // Calculate worked time by pairing entries chronologically
                    let lastClockIn: Date | null = null;
                    let sessionCount = 0;
                    
                    for (const entry of dayEntries) {
                        if (entry.type === TimeEntryType.CLOCK_IN) {
                            lastClockIn = new Date(entry.timestamp);
                        } else if (entry.type === TimeEntryType.CLOCK_OUT && lastClockIn) {
                            const clockOut = new Date(entry.timestamp);
                            const sessionDuration = clockOut.getTime() - lastClockIn.getTime();
                            totalWorkedMs += Math.max(0, sessionDuration);
                            lastClockIn = null; // Reset for next session
                            sessionCount++;
                        }
                    }
                    
                    // If there's an unpaired clock-in (user is currently working), add ongoing time
                    if (lastClockIn && dateKey === time.toDateString()) {
                        const ongoingDuration = time.getTime() - lastClockIn.getTime();
                        totalWorkedMs += Math.max(0, ongoingDuration);
                        sessionCount++; // Count ongoing session
                    }
                    
                    isSingleSession = sessionCount === 1;
                }
                
                // Apply automatic break deduction for single-session days (no adjustment, single clock-in/out)
                if (isSingleSession && breakDurationMinutes > 0 && !approvedAdjustment) {
                    const breakMs = breakDurationMinutes * 60 * 1000;
                    totalWorkedMs = Math.max(0, totalWorkedMs - breakMs);
                }
                
                const requiredMs = 8 * 60 * 60 * 1000;
                const balanceMs = totalWorkedMs - requiredMs;

                return {
                    date: new Date(dateKey),
                    entries: dayEntries.reverse(),
                    summary: { worked: totalWorkedMs, balance: balanceMs },
                };
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending
    }, [timeEntries, time, adjustmentRequests, breakDurationMinutes]);

    const todaySummary = useMemo(() => {
        const todayHistory = dailyWorkHistory.find(d => d.date.toDateString() === time.toDateString());
        return todayHistory ? todayHistory.summary : { worked: 0, balance: -8 * 3600 * 1000 };
    }, [dailyWorkHistory, time]);

    const monthlyWorkHistory = useMemo(() => {
        const months = dailyWorkHistory.reduce((acc, day) => {
            const monthKey = `${day.date.getFullYear()}-${(day.date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!acc[monthKey]) {
                acc[monthKey] = { totalWorked: 0, days: [] };
            }
            acc[monthKey].totalWorked += day.summary.worked;
            acc[monthKey].days.push(day);
            return acc;
        }, {} as Record<string, { totalWorked: number, days: typeof dailyWorkHistory }>);

        return Object.keys(months)
            .map(monthKey => ({
                month: monthKey,
                totalWorked: months[monthKey].totalWorked,
                days: months[monthKey].days
            }))
            .sort((a, b) => b.month.localeCompare(a.month)); // Sort by month descending
    }, [dailyWorkHistory]);

    const currentMonthTotal = useMemo(() => {
        const currentMonth = `${time.getFullYear()}-${(time.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthData = monthlyWorkHistory.find(m => m.month === currentMonth);
        // The monthlyWorkHistory already includes ongoing time from dailyWorkHistory
        // so we don't need to add it again here
        return monthData ? monthData.totalWorked : 0;
    }, [monthlyWorkHistory, time]);

    useEffect(() => {
        const loadTimeEntries = async () => {
            try {
                const punches = await offlineStorage.getTimePunches(currentUser.tenantId!, currentUser.id);
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
                const unsynced = await offlineStorage.getUnsyncedTimePunches(currentUser.tenantId!);
                for (const punch of unsynced) {
                    try {
                        await api.saveTimePunch(currentUser.tenantId!, {
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
        // Debounce: Prevent rapid successive clicks
        const now = Date.now();
        if (now - lastActionTimeRef.current < DEBOUNCE_MS) {
            console.log('Action debounced - too soon after last click');
            return;
        }
        lastActionTimeRef.current = now;
        
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
                companyId: currentUser.tenantId!,
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
                await api.saveTimePunch(currentUser.tenantId!, {
                    userId: newEntry.userId,
                    companyId: currentUser.tenantId!,
                    type: newEntry.type === TimeEntryType.CLOCK_IN ? 'clock_in' : 'clock_out',
                    timestamp: newEntry.timestamp.toISOString(),
                    location: newEntry.location,
                    photoUrl: newEntry.photoUrl
                });
                // Mark as synced
                await offlineStorage.saveTimePunch({
                    id: newEntry.id,
                    userId: newEntry.userId,
                    companyId: currentUser.tenantId!,
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
                    companyId: currentUser.tenantId!,
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
        // Helper: combine local date string (YYYY-MM-DD) with a time Date to produce a Date in local timezone
        const combineLocalDateWithTime = (dateStr: string, time?: Date | undefined) => {
            if (!time) return undefined;
            const parts = dateStr.split('-').map(p => parseInt(p, 10));
            if (parts.length !== 3) return new Date(time);
            const [y, m, d] = parts;
            return new Date(y, m - 1, d, time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
        };
        try {
            console.log('Submitting adjustment:', {
                userId: currentUser.id,
                tenantId: currentUser.tenantId,
                date: adjustment.date,
                requestedClockIn: adjustment.requestedClockIn,
                requestedClockOut: adjustment.requestedClockOut
            });

            // Check for existing pending or approved adjustments for this day
            const existingAdjustment = adjustmentRequests.find(req => {
                return req.date === adjustment.date && (req.status === RequestStatus.PENDING || req.status === RequestStatus.APPROVED);
            });

            if (existingAdjustment) {
                console.log('Found existing adjustment in local state:', existingAdjustment);
                if (existingAdjustment.status === RequestStatus.PENDING) {
                    setMessage({ type: 'error', text: 'A time adjustment request is already pending for this day' });
                    setAdjustmentTarget(null);
                    return;
                }
                if (existingAdjustment.status === RequestStatus.APPROVED) {
                    setMessage({ type: 'error', text: 'This day has already been adjusted and cannot be modified' });
                    setAdjustmentTarget(null);
                    return;
                }
            }

            // Create new adjustment request via API
            // Ensure we anchor the times to the chosen local `adjustment.date` so the server's
            // UTC conversion doesn't shift the day unexpectedly.
            const payloadOriginalClockIn = combineLocalDateWithTime(adjustment.date, adjustment.originalClockIn)?.toISOString();
            const payloadOriginalClockOut = combineLocalDateWithTime(adjustment.date, adjustment.originalClockOut)?.toISOString();
            const payloadRequestedClockIn = combineLocalDateWithTime(adjustment.date, adjustment.requestedClockIn)!.toISOString();
            const payloadRequestedClockOut = combineLocalDateWithTime(adjustment.date, adjustment.requestedClockOut)!.toISOString();
            const payloadRequestedClockIn2 = adjustment.requestedClockIn2 ? combineLocalDateWithTime(adjustment.date, adjustment.requestedClockIn2)!.toISOString() : undefined;
            const payloadRequestedClockOut2 = adjustment.requestedClockOut2 ? combineLocalDateWithTime(adjustment.date, adjustment.requestedClockOut2)!.toISOString() : undefined;

            const response = await api.createTimeAdjustmentRequest(currentUser.tenantId!, {
                userId: currentUser.id,
                employeeName: currentUser.name,
                date: adjustment.date, // Already in YYYY-MM-DD format
                // Also include an explicit date-only field to avoid timezone-driven date mismatches
                requested_date: adjustment.date,
                originalClockIn: payloadOriginalClockIn,
                originalClockOut: payloadOriginalClockOut,
                requestedClockIn: payloadRequestedClockIn,
                requestedClockOut: payloadRequestedClockOut,
                requestedClockIn2: payloadRequestedClockIn2,
                requestedClockOut2: payloadRequestedClockOut2,
                reason: adjustment.reason
            });

            // Add the new request to local state
            // The response.data contains the full clock log record
            const newRequest: AdjustmentRequest = {
                id: response.data?.id || `temp-${Date.now()}`, // Use the ID from the database record
                userId: currentUser.id,
                employeeName: currentUser.name,
                date: adjustment.date, // Keep as string
                originalClockIn: combineLocalDateWithTime(adjustment.date, adjustment.originalClockIn),
                originalClockOut: combineLocalDateWithTime(adjustment.date, adjustment.originalClockOut),
                requestedClockIn: combineLocalDateWithTime(adjustment.date, adjustment.requestedClockIn)!,
                requestedClockOut: combineLocalDateWithTime(adjustment.date, adjustment.requestedClockOut)!,
                requestedClockIn2: adjustment.requestedClockIn2 ? combineLocalDateWithTime(adjustment.date, adjustment.requestedClockIn2) : undefined,
                requestedClockOut2: adjustment.requestedClockOut2 ? combineLocalDateWithTime(adjustment.date, adjustment.requestedClockOut2) : undefined,
                reason: adjustment.reason,
                status: RequestStatus.PENDING
            };
            
            console.log('Adding new adjustment request:', newRequest);
            console.log('Server response:', response);
            
            setAdjustmentRequests(prev => {
                const updated = [...prev, newRequest];
                // Persist an up-to-date cache of adjustments (useful if API GET lags)
                const storageKey = `adjustmentRequests_${currentUser.id}`;
                try {
                    localStorage.setItem(storageKey, JSON.stringify(updated));
                } catch (e) {
                    console.error('Error writing adjustments to localStorage', e);
                }
                return updated;
            });

            // Refresh time entries after submitting adjustment to pick up any server-side changes
            try { await refreshTimeEntries(); } catch (e) { console.warn('refreshTimeEntries failed after submit', e); }

            setAdjustmentTarget(null);
            setMessage({ type: 'success', text: 'Time adjustment request submitted successfully!' });
        } catch (error: any) {
            console.error('Failed to submit adjustment request:', error);
            const errorMessage = error.message || 'Failed to submit time adjustment request. Please try again.';
            setMessage({ type: 'error', text: errorMessage });
        }
    };
    
    const handleCancelAdjustment = async (requestId: string) => {
        const performCancel = async () => {
            // Close the confirmation dialog
            setConfirmationDialog({ isVisible: false, message: '', onConfirm: () => {} });
            
            // If this is a local-only/temp request, just remove locally
            if (requestId.startsWith('temp-')) {
                setAdjustmentRequests(prev => {
                    const updated = prev.filter(req => req.id !== requestId);
                    try {
                        localStorage.setItem(`adjustmentRequests_${currentUser.id}`, JSON.stringify(updated));
                    } catch (e) {
                        console.error('Failed to update adjustments cache', e);
                    }
                    return updated;
                });
                setMessage({ type: 'success', text: 'Adjustment request cancelled.' });
                return;
            }

        try {
            // Optimistically update UI to show cancellation in progress
            setAdjustmentRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.CANCELLED } : r));
            // Persist optimistic update
            try {
                const current = JSON.parse(localStorage.getItem(`adjustmentRequests_${currentUser.id}`) || '[]');
                const updatedLocal = current.map((r: any) => r.id === requestId ? { ...r, status: RequestStatus.CANCELLED } : r);
                localStorage.setItem(`adjustmentRequests_${currentUser.id}`, JSON.stringify(updatedLocal));
            } catch (e) {
                // ignore local persist errors
            }

            // Send cancel to server (use update API to set status to Cancelled)
            await api.updateTimeAdjustmentRequest(currentUser.tenantId!, requestId, { status: RequestStatus.CANCELLED });

            // Refresh adjustments from server to ensure consistent state
            try {
                const fresh = await api.getTimeAdjustmentRequests(currentUser.tenantId!, { userId: currentUser.id });
                const transformed: AdjustmentRequest[] = fresh
                    .filter(item => {
                        const date = new Date(item.clock_in || item.requested_clock_in);
                        const year = date.getFullYear();
                        return year > 2000 && year < 2100;
                    })
                    .map((item: any) => ({
                        id: item.id,
                        userId: item.employee_id,
                        employeeName: item.employee_name || currentUser.name,
                        date: item.requested_date ? item.requested_date : canonicalDate(new Date(item.clock_in || item.requested_clock_in)),
                        originalClockIn: item.clock_in ? new Date(item.clock_in) : undefined,
                        originalClockOut: item.clock_out ? new Date(item.clock_out) : undefined,
                        requestedClockIn: new Date(item.requested_clock_in),
                        requestedClockOut: new Date(item.requested_clock_out),
                        reason: item.adjustment_reason,
                        status: item.adjustment_status as RequestStatus,
                        reviewedBy: item.adjustment_reviewed_by,
                        reviewedAt: item.adjustment_reviewed_at ? new Date(item.adjustment_reviewed_at) : undefined
                    }));

                // Merge with any local cached adjustments
                let localAdjustments: AdjustmentRequest[] = [];
                try {
                    const stored = localStorage.getItem(`adjustmentRequests_${currentUser.id}`);
                    if (stored) localAdjustments = parseStoredAdjustments(stored);
                } catch (e) {
                    console.error('Error reading local adjustments during refresh after cancel', e);
                }

                const combined = [...transformed];

                for (const local of localAdjustments) {
                    if (String(local.id || '').startsWith('temp-')) {
                        combined.push(local);
                        continue;
                    }

                    const existingIndex = combined.findIndex(api => ((local.id && api.id === local.id) || api.date === local.date));
                    if (existingIndex === -1) {
                        // If approved, keep it anyway to prevent vanishing statuses
                        if (local.status === RequestStatus.APPROVED) {
                            combined.push(local);
                        }
                        // Else drop (stale pending request)
                        continue;
                    } else {
                        // Prefer server values; merge to keep any additional local fields
                        combined[existingIndex] = { ...local, ...combined[existingIndex] };
                    }
                }

                setAdjustmentRequests(combined);
                try { localStorage.setItem(`adjustmentRequests_${currentUser.id}`, JSON.stringify(combined)); } catch (e) { }
                try { await refreshTimeEntries(); } catch (e) { console.warn('refreshTimeEntries failed after cancel', e); }
            } catch (refreshErr) {
                console.warn('Failed to refresh adjustments after cancel:', refreshErr);
            }

            setMessage({ type: 'success', text: 'Adjustment request cancelled.' });
        } catch (error) {
            console.error('Failed to cancel adjustment request:', error);
            setMessage({ type: 'error', text: 'Failed to cancel adjustment request. Please try again.' });
            // Revert optimistic change by reloading from cache
            try {
                const stored = localStorage.getItem(`adjustmentRequests_${currentUser.id}`);
                if (stored) setAdjustmentRequests(parseStoredAdjustments(stored));
            } catch (e) {
                console.error('Failed to revert adjustments from local cache', e);
            }
        }
    };

        // Show confirmation dialog
        setConfirmationDialog({
            isVisible: true,
            message: 'Are you sure you want to cancel this adjustment request?',
            onConfirm: performCancel
        });
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
            {message && <MessageOverlay message={message} onClose={() => setMessage(null)} />}
            <ConfirmationDialog
                isVisible={confirmationDialog.isVisible}
                message={confirmationDialog.message}
                onConfirm={confirmationDialog.onConfirm}
                onCancel={() => setConfirmationDialog({ isVisible: false, message: '', onConfirm: () => {} })}
            />
            
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg w-full">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4">
                            <div className='text-center md:text-left'>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Time Clock</h2>
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
                                <Button
                                    onClick={() => handleClockAction(TimeEntryType.CLOCK_IN)}
                                    disabled={isClockedIn || isProcessing}
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    isLoading={isProcessing && !isClockedIn}
                                    className="!bg-green-500 hover:!bg-green-600 disabled:!bg-gray-300"
                                >
                                    Clock In
                                </Button>
                                <Button
                                    onClick={() => handleClockAction(TimeEntryType.CLOCK_OUT)}
                                    disabled={!isClockedIn || isProcessing}
                                    variant="destructive"
                                    size="lg"
                                    fullWidth
                                    isLoading={isProcessing && isClockedIn}
                                >
                                    Clock Out
                                </Button>
                            </div>
                            {locationError && <p className="text-red-500 text-xs mt-2 text-center">{locationError}</p>}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg w-full space-y-6">
                        <h3 className="text-xl font-bold text-gray-800 border-b pb-3">Today's Summary</h3>
                        <div className='text-center'>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Worked Today</p>
                            <p className={`text-4xl font-bold ${currentStatus.textColor}`}>{formatDuration(todaySummary.worked)}</p>
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

                    <div className="bg-white p-6 rounded-xl shadow-lg w-full space-y-6">
                        <h3 className="text-xl font-bold text-gray-800 border-b pb-3">Monthly Summary</h3>
                        <div className='text-center'>
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Total Hours This Month</p>
                            <p className="text-4xl font-bold text-primary">{formatDuration(currentMonthTotal)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg w-full">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Work History</h3>
                    <div className="space-y-8 max-h-[40rem] overflow-y-auto pr-2 pb-2">
                        {dailyWorkHistory.length > 0 ? dailyWorkHistory.map(day => {
                            const { needed, reason } = isAdjustmentNeeded(day.summary, day.entries, day.date);
                            const adjustmentRequest = adjustmentRequests.find(req => {
                                const reqDate = req.date;
                                const dayDate = canonicalDate(day.date);
                                return reqDate === dayDate;
                            });
                            
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
                                    <div className="bg-white p-4 rounded-lg border">
                                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                            {day.entries.map((entry) => (
                                                <div key={entry.id} className="flex flex-col items-center space-y-2">
                                                    <div className={`relative w-16 h-16 rounded-full flex items-center justify-center font-medium text-white shadow-lg ${
                                                        entry.type === TimeEntryType.CLOCK_IN 
                                                            ? 'bg-green-500' 
                                                            : 'bg-red-500'
                                                    }`}>
                                                        {entry.type === TimeEntryType.CLOCK_IN ? (
                                                            < ArrowDownLeftIcon className="h-6 w-6" />
                                                        ) : (
                                                            <ArrowUpRightIcon className="h-6 w-6" />
                                                        )}
                                                        {!entry.synced && (
                                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white"></div>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs font-medium text-gray-700">
                                                            {entry.type === TimeEntryType.CLOCK_IN ? 'Clock In' : 'Clock Out'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 font-semibold">
                                                            {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        {entry.photoUrl && (
                                                            <button 
                                                                onClick={() => setPreviewImageUrl(entry.photoUrl!)} 
                                                                className="flex items-center justify-center text-primary text-xs hover:underline min-h-[44px] min-w-[44px] p-2"
                                                                title="View photo"
                                                            >
                                                                <CameraIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {entry.location && entry.location !== 'Location not available' && [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS].includes(currentUser.role) && (
                                                            <div className="flex items-center text-gray-500 text-xs" title={entry.location}>
                                                                <MapPinIcon className="h-3 w-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ADJUSTMENT SECTION */}
                                    <div className="mt-4 flex justify-end">
                                        {adjustmentRequest && (adjustmentRequest.status === RequestStatus.PENDING || adjustmentRequest.status === RequestStatus.APPROVED) ? (
                                            <div className={`border rounded-lg p-3 flex items-center space-x-4 ${
                                                adjustmentRequest.status === RequestStatus.APPROVED 
                                                    ? 'bg-green-50 border-green-200' 
                                                    : 'bg-amber-50 border-amber-200'
                                            }`}>
                                                <div className={`flex items-center ${
                                                    adjustmentRequest.status === RequestStatus.APPROVED 
                                                        ? 'text-green-700' 
                                                        : 'text-amber-700'
                                                }`}>
                                                    <ClockIcon className="h-5 w-5 mr-2" />
                                                    <span className="font-semibold text-sm">
                                                        {adjustmentRequest.status === RequestStatus.APPROVED 
                                                            ? 'Adjustment Approved' 
                                                            : 'Adjustment Requested'}
                                                    </span>
                                                </div>
                                                {adjustmentRequest.status === RequestStatus.PENDING && (
                                                    <>
                                                        <div className="h-4 w-px bg-amber-300"></div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleCancelAdjustment(adjustmentRequest.id)}
                                                            leftIcon={<XIcon className="h-3 w-3" />}
                                                            className="!text-red-600 hover:!text-red-700"
                                                        >
                                                            Cancel Request
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        ) : needed && !isLoadingAdjustments ? (
                                            <div className="text-right">
                                                <Button
                                                    onClick={() => {
                                                        const dayEntries = day.entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                                        const clockIns = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_IN).map(e => new Date(e.timestamp));
                                                        const clockOuts = dayEntries.filter(e => e.type === TimeEntryType.CLOCK_OUT).map(e => new Date(e.timestamp));
                                                        const clockIn = clockIns.length > 0 ? new Date(Math.min(...clockIns.map(d => d.getTime()))) : undefined;
                                                        const clockOut = clockOuts.length > 0 ? new Date(Math.max(...clockOuts.map(d => d.getTime()))) : undefined;
                                                        setAdjustmentTarget({
                                                            date: canonicalDate(day.date),
                                                            clockIn,
                                                            clockOut
                                                        });
                                                    }}
                                                    size="sm"
                                                    className="!bg-red-100 !text-red-800 hover:!bg-red-200 ml-auto"
                                                >
                                                    Request Adjustment
                                                </Button>
                                                <p className="text-xs text-red-500 mt-1 font-medium">{reason}</p>
                                            </div>
                                        ) : isLoadingAdjustments ? (
                                            <div className="text-right">
                                                <div className="text-sm bg-gray-100 text-gray-500 font-semibold py-2 px-4 rounded-lg flex items-center justify-center ml-auto">
                                                    <span>Loading...</span>
                                                </div>
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

                <div className="bg-white p-6 rounded-xl shadow-lg w-full">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Monthly Work History</h3>
                    <div className="space-y-4 max-h-[40rem] overflow-y-auto pr-2 pb-2">
                        {monthlyWorkHistory.length > 0 ? monthlyWorkHistory.map(month => (
                            <div key={month.month} className="border-b pb-4 last:border-b-0">
                                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                                    <h4 className="font-bold text-lg text-gray-700">
                                        {new Date(month.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                                    </h4>
                                    <p className="font-bold text-gray-800">{formatDuration(month.totalWorked)}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-8">No monthly history found.</p>
                        )}
                    </div>
                </div>
                </div>
            </div>
        </>
    );
};

export default TimeClock;
