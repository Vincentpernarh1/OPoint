import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { UserCircleIcon, PencilIcon } from './Icons';
import { getInitials, getAvatarColor } from '../utils/avatar';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import Notification from './Notification';
import './Avatar.css';

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

    // Safety check - if no user, close modal
    if (!user) {
        console.log('No user provided to EditProfileModal, closing');
        onClose();
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Validate required data
            if (!user?.tenantId || !user?.id) {
                throw new Error('User data is incomplete. Please refresh the page and try again.');
            }

            const updatedFields: Partial<User> = {};
            if (mobileMoney !== (user.mobileMoneyNumber || '')) {
                // Instead of direct update, create a profile update request
                await api.createProfileUpdateRequest(user.tenantId, {
                    user_id: user.id,
                    field_name: 'mobile_money_number',
                    requested_value: mobileMoney,
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

            if (Object.keys(updatedFields).length > 0) {
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
                <h3 className="text-xl font-semibold mb-4">Edit Profile</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="momo" className="block text-sm font-medium text-gray-700">Mobile Money Number</label>
                        <input
                            type="text"
                            id="momo"
                            value={mobileMoney}
                            onChange={e => setMobileMoney(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Enter mobile money number"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-lg" disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting Request...' : 'Request Update'}
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Mobile money number updates require approval from an administrator.
                    </p>
                </form>
            </div>
        </div>
    );
};


const Profile = ({ currentUser }: ProfileProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);

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
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 border-b pb-6 mb-6">
                    <Avatar user={currentUser} />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">{currentUser.name}</h2>
                        <p className="text-gray-500">{currentUser.team} - {currentUser.role}</p>
                    </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-4">My Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    {profileItems.map(item => (
                        <div key={item.label} className="py-2 border-b">
                            <p className="font-semibold text-gray-600">{item.label}</p>
                            <p className="text-gray-800">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8 text-right">
                    <button onClick={() => {
                        console.log('Edit Profile button clicked, user:', currentUser);
                        setIsModalOpen(true);
                    }} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        <PencilIcon className="h-4 w-4" />
                        Edit Profile
                    </button>
                </div>

                {/* Pending Update Requests Section */}
                {pendingRequests.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Pending Update Requests</h3>
                        <div className="space-y-3">
                            {pendingRequests.map((request) => (
                                <div key={request.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                {request.field_name === 'mobile_money_number' ? 'Mobile Money Number' : request.field_name}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Requested: {request.requested_value}
                                                {request.current_value && ` (Current: ${request.current_value})`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Requested on {new Date(request.requested_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {request.status === 'Pending' && (
                                                <button
                                                    onClick={() => handleCancelRequest(request.id)}
                                                    className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                                    title="Cancel this request"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
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
