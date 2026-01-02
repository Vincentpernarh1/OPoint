import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { UserCircleIcon, PencilIcon } from './Icons';
import { getInitials, getAvatarColor } from '../utils/avatar';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import { pushService } from '../services/pushService';
import { sanitizePhone, isValidGhanaPhone } from '../utils/validators';
import Notification from './Notification';
import './Avatar.css';
import './Profile.css';

interface ProfileProps {
    currentUser: User;
}

interface EditProfileModalProps {
    user: User;
    onClose: () => void;
    onSubmit?: (fields: Partial<User>) => void;
    onSuccess?: (message: string) => void;
    onRefresh?: () => void;
}

const Avatar = ({ user }: { user: User }) => {
    if (user.avatarUrl) {
        return (
            <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-24 w-24 rounded-full object-cover"
            />
        );
    }

    const initials = getInitials(user.name);
    const bgColorClass = getAvatarColor(user.name);

    return (
        <div className={`avatar-initials ${bgColorClass}`}>
            {initials}
        </div>
    );
};

const EditProfileModal = ({ user, onClose, onSubmit, onSuccess, onRefresh }: EditProfileModalProps) => {
    console.log('EditProfileModal rendered with user:', user);
    const [mobileMoney, setMobileMoney] = useState(user?.mobileMoneyNumber || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [phoneError, setPhoneError] = useState<string | null>(null);

    // Safety check - if no user, close modal
    if (!user) {
        console.log('No user provided to EditProfileModal, closing');
        onClose();
        return null;
    }

    // Validate phone number in real-time
    const handlePhoneChange = (value: string) => {
        setMobileMoney(value);
        
        if (!value.trim()) {
            setPhoneError(null);
            return;
        }
        
        const sanitized = sanitizePhone(value);
        if (!isValidGhanaPhone(sanitized)) {
            setPhoneError('Invalid Ghana phone number. Must be 10 digits (e.g., 0241234567)');
        } else {
            setPhoneError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check for validation errors before submitting
        if (phoneError) {
            return;
        }
        
        setIsSubmitting(true);

        try {
            // Validate required data
            if (!user?.tenantId || !user?.id) {
                throw new Error('User data is incomplete. Please refresh the page and try again.');
            }

            const updatedFields: Partial<User> = {};
            if (mobileMoney !== (user.mobileMoneyNumber || '')) {
                // Sanitize and validate the phone number before sending
                const sanitizedPhone = sanitizePhone(mobileMoney);
                
                if (!isValidGhanaPhone(sanitizedPhone)) {
                    throw new Error('Please enter a valid Ghana phone number (e.g., 0241234567)');
                }
                
                // Instead of direct update, create a profile update request
                await api.createProfileUpdateRequest(user.tenantId, {
                    user_id: user.id,
                    field_name: 'mobile_money_number',
                    requested_value: sanitizedPhone,
                    current_value: user.mobileMoneyNumber || ''
                });
                
                // Show success notification
                if (onSuccess) {
                    onSuccess('Mobile money number update request submitted successfully!');
                }
                
                // Refresh pending requests
                if (onRefresh) {
                    onRefresh();
                } else {
                    // Fallback to page reload
                    setTimeout(() => window.location.reload(), 1000);
                }
            } else {
                // No changes made
                if (onSuccess) {
                    onSuccess('No changes detected.');
                }
                onClose();
                return;
            }

            if (Object.keys(updatedFields).length > 0 && onSubmit) {
                await onSubmit(updatedFields);
            }

            onClose();
        } catch (error) {
            console.error('Error submitting profile update request:', error);
            // Show error notification instead of letting the error crash the page
            if (onSuccess) {
                onSuccess(error instanceof Error ? error.message : 'Failed to submit update request. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-scale-in">
                {/* Gradient Header */}
                <div className="bg-gradient-to-r from-primary to-purple-600 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                <span className="text-2xl">✏️</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white">Edit Profile</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                        >
                            <span className="text-2xl">×</span>
                        </button>
                    </div>
                    <p className="text-white/90 text-sm mt-2">Request changes to your profile information</p>
                </div>
                
                {/* Form Content */}
                <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="momo" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Mobile Money Number
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                id="momo"
                                value={mobileMoney}
                                onChange={e => handlePhoneChange(e.target.value)}
                                className={`w-full px-4 py-3 pl-12 border-2 rounded-xl transition-all duration-200 ${
                                    phoneError 
                                        ? 'border-red-300 focus:ring-2 focus:ring-red-500/50 focus:border-red-500' 
                                        : 'border-gray-200 focus:ring-2 focus:ring-primary/50 focus:border-primary'
                                } font-medium`}
                                placeholder="0241234567 or +233241234567"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">📱</div>
                        </div>
                        {phoneError && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                                <span className="text-red-500 text-lg">⚠️</span>
                                <p className="text-sm text-red-600 font-medium">{phoneError}</p>
                            </div>
                        )}
                        {!phoneError && mobileMoney && mobileMoney !== user.mobileMoneyNumber && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
                                <span className="text-green-500 text-lg">✅</span>
                                <p className="text-sm text-green-600 font-medium">Valid phone number format</p>
                            </div>
                        )}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-sm text-blue-700 font-medium flex items-start space-x-2">
                            <span className="text-lg">ℹ️</span>
                            <span>Mobile money number updates require administrator approval.</span>
                        </p>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200 transform hover:scale-105" 
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="py-3 px-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center space-x-2" 
                            disabled={isSubmitting || !!phoneError || !mobileMoney.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Request Update</span>
                                    <span>→</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
};


const Profile = ({ currentUser }: ProfileProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);

    useEffect(() => {
        // Check if push notifications are supported
        setPushSupported(pushService.isSupported());

        // Check if already subscribed
        const checkSubscription = async () => {
            if (pushService.isSupported()) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.getSubscription();
                    setPushEnabled(!!subscription);
                } catch (error) {
                    console.error('Error checking push subscription:', error);
                }
            }
        };

        checkSubscription();
    }, []);

    const handlePushToggle = async () => {
        try {
            if (pushEnabled) {
                // Unsubscribe
                await pushService.unsubscribe(currentUser.id);
                setPushEnabled(false);
                setNotification('Push notifications disabled');
            } else {
                // Subscribe
                const permission = await pushService.requestPermission();
                if (permission === 'granted') {
                    const subscription = await pushService.subscribe(currentUser.id);
                    if (subscription) {
                        setPushEnabled(true);
                        setNotification('Push notifications enabled! You will now receive notifications for announcements and updates.');
                    } else {
                        setNotification('Failed to enable push notifications. Please try again.');
                    }
                } else {
                    setNotification('Notification permission denied. Please enable notifications in your browser settings.');
                }
            }
        } catch (error) {
            console.error('Error toggling push notifications:', error);
            setNotification('Failed to update push notification settings. Please try again.');
        }
    };

    const handleTestNotification = async () => {
        try {
            await pushService.sendTestNotification(currentUser.id);
            setNotification('Test notification sent! Check your browser.');
        } catch (error) {
            console.error('Error sending test notification:', error);
            setNotification('Failed to send test notification. Please try again.');
        }
    };

    // Fetch pending requests on component mount and poll for updates
    useEffect(() => {
        const fetchPendingRequests = async () => {
            if (!currentUser?.tenantId) return;

            setIsLoadingRequests(true);
            try {
                const requests = await api.getProfileUpdateRequests(currentUser.tenantId, {
                    userId: currentUser.id,
                    status: 'Pending'
                });

                // Also include any locally queued profile update requests so users see their change immediately
                try {
                    const queued = await offlineStorage.getQueuedRequests(currentUser.tenantId!);
                    const localProfileRequests = (queued || [])
                        .filter((q: any) => q.url && q.url.includes('/api/profile-update-requests'))
                        .map((q: any) => ({
                            id: q.id,
                            field_name: q.body?.field_name || 'unknown',
                            requested_value: q.body?.requested_value,
                            current_value: q.body?.current_value,
                            requested_at: q.createdAt || new Date().toISOString(),
                            status: 'Pending (queued)'
                        }));

                    setPendingRequests([...localProfileRequests, ...(requests || [])]);
                } catch (err) {
                    console.warn('Could not read local queued requests:', err);
                    setPendingRequests(requests);
                }
            } catch (error) {
                console.error('Error fetching pending requests:', error);
            } finally {
                setIsLoadingRequests(false);
            }
        };

        // Initial fetch
        fetchPendingRequests();

        // Set up polling every 30 seconds
        const pollInterval = setInterval(fetchPendingRequests, 30000);

        const handleOnline = () => {
            // When back online, refresh pending requests and queued requests
            fetchPendingRequests();
        };

        const handleEmployeeUpdated = (e: Event) => {
            try {
                const ce = e as CustomEvent;
                const detail = ce.detail || {};
                // If the update affects this user, refresh pending requests and show a notice
                if (!detail.userId || detail.userId === currentUser.id) {
                    fetchPendingRequests();
                    setNotification('Your profile was updated. Refreshing data.');
                }
            } catch (err) {
                fetchPendingRequests();
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('employee-updated', handleEmployeeUpdated as EventListener);

        // Cleanup interval and listeners on unmount
        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('employee-updated', handleEmployeeUpdated as EventListener);
        };
    }, [currentUser?.tenantId, currentUser?.id]);

    const handleCancelRequest = async (requestId: string) => {
        if (!confirm('Are you sure you want to cancel this update request?')) {
            return;
        }

        try {
            await api.cancelProfileUpdateRequest(currentUser.tenantId!, requestId, currentUser.id);
            setNotification('Update request cancelled successfully!');
            // Refresh pending requests instead of reloading page
            await refreshPendingRequests();
        } catch (error) {
            console.error('Error cancelling request:', error);
            setNotification('Failed to cancel request. Please try again.');
        }
    };

    const refreshPendingRequests = async () => {
        if (!currentUser?.tenantId) return;

        setIsLoadingRequests(true);
        try {
            const requests = await api.getProfileUpdateRequests(currentUser.tenantId, {
                userId: currentUser.id,
                status: 'Pending'
            });
            setPendingRequests(requests);
        } catch (error) {
            console.error('Error fetching pending requests:', error);
        } finally {
            setIsLoadingRequests(false);
        }
    };
    
    const profileItems = [
        { label: 'Full Name', value: currentUser.name },
        { label: 'Email Address', value: currentUser.email },
        { label: 'Team', value: currentUser.team },
        { label: 'Role', value: currentUser.role },
        { label: 'Hire Date', value: new Date(currentUser.hireDate).toLocaleDateString() },
        { label: 'Mobile Money Number', value: currentUser.mobileMoneyNumber || 'Not set' },
    ];

    return (
        <>
            {notification && <Notification message={notification} type="success" onClose={() => setNotification(null)} />}
            {isModalOpen && <EditProfileModal user={currentUser} onClose={() => setIsModalOpen(false)} onSuccess={setNotification} onRefresh={refreshPendingRequests} />}
            
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Modern Gradient Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 sm:p-8 shadow-2xl">
                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-white/30 rounded-full blur-md group-hover:bg-white/50 transition-all"></div>
                                <div className="relative">
                                    <Avatar user={currentUser} />
                                </div>
                            </div>
                            <div className="text-center sm:text-left flex-1">
                                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{currentUser.name}</h1>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full text-sm">
                                        {currentUser.team}
                                    </span>
                                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full text-sm">
                                        {currentUser.role}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-5 rounded-full -ml-20 -mb-20"></div>
                </div>

                {/* Profile Information Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                                    <span className="text-2xl">📄</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">Personal Information</h3>
                            </div>
                            <button 
                                onClick={() => {
                                    console.log('Edit Profile button clicked, user:', currentUser);
                                    setIsModalOpen(true);
                                }} 
                                className="flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                <PencilIcon className="h-4 w-4" />
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {profileItems.map((item, index) => (
                                <div key={item.label} className="profile-item group p-4 rounded-xl border-2 border-gray-100 hover:border-primary/30 hover:bg-gradient-to-r hover:from-primary/5 hover:to-purple-50 transition-all duration-200 animate-fade-in" data-delay={index}>
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary/20 to-purple-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <span className="text-lg">
                                                {item.label === 'Full Name' && '👤'}
                                                {item.label === 'Email Address' && '✉️'}
                                                {item.label === 'Team' && '🎯'}
                                                {item.label === 'Role' && '🎭'}
                                                {item.label === 'Hire Date' && '📅'}
                                                {item.label === 'Mobile Money Number' && '📱'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                                            <p className="text-base font-semibold text-gray-800 break-words">{item.value}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Push Notifications Section */}
                {pushSupported && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                                    <span className="text-2xl">🔔</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">Push Notifications</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-100">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="text-xl">🚀</span>
                                        <p className="font-bold text-gray-800 text-lg">Enable Push Notifications</p>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Receive instant notifications for announcements, approvals, and important updates directly on your device.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={handleTestNotification}
                                        disabled={!pushEnabled}
                                        className="px-4 py-2.5 text-sm bg-blue-100 text-blue-600 font-semibold rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                                        title="Send a test notification"
                                    >
                                        🧪 Test
                                    </button>
                                    <button
                                        onClick={handlePushToggle}
                                        className={`px-6 py-2.5 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg ${
                                            pushEnabled
                                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                                                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                                        }`}
                                    >
                                        {pushEnabled ? '❌ Disable' : '✅ Enable'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Update Requests Section */}
                {pendingRequests.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in">
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-6 border-b border-amber-100">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md">
                                    <span className="text-2xl">⏳</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">Pending Update Requests</h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {pendingRequests.map((request, index) => (
                                <div key={request.id} className="pending-request group p-5 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl hover:border-yellow-300 hover:shadow-md transition-all duration-200 animate-fade-in" data-delay={index}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <span className="text-lg">📝</span>
                                                <p className="font-bold text-gray-800 text-lg">
                                                    {request.field_name === 'mobile_money_number' ? 'Mobile Money Number' : request.field_name}
                                                </p>
                                            </div>
                                            <div className="space-y-2 ml-7">
                                                <div className="flex items-start space-x-2">
                                                    <span className="text-sm text-gray-500 font-medium min-w-[80px]">Requested:</span>
                                                    <span className="text-sm font-semibold text-gray-800">{request.requested_value}</span>
                                                </div>
                                                {request.current_value && (
                                                    <div className="flex items-start space-x-2">
                                                        <span className="text-sm text-gray-500 font-medium min-w-[80px]">Current:</span>
                                                        <span className="text-sm text-gray-600">{request.current_value}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                    <span>📅</span>
                                                    <span>Requested on {new Date(request.requested_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            {request.status === 'Pending' && (
                                                <button
                                                    onClick={() => handleCancelRequest(request.id)}
                                                    className="px-4 py-2 bg-red-100 text-red-600 font-semibold rounded-lg hover:bg-red-200 transition-all duration-200 transform hover:scale-105 text-sm"
                                                    title="Cancel this request"
                                                >
                                                    ❌ Cancel
                                                </button>
                                            )}
                                            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-4 py-2 rounded-lg border border-yellow-200 shadow-sm">
                                                {request.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Profile;
