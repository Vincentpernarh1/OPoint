import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { UserCircleIcon, PencilIcon } from './Icons';
import { getInitials, getAvatarColor } from '../utils/avatar';
import { api } from '../services/api';
import Notification from './Notification';
import './Avatar.css';

interface ProfileProps {
    currentUser: User;
}

interface EditProfileModalProps {
    user: User;
    onClose: () => void;
    onSubmit: (fields: Partial<User>) => void;
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

const EditProfileModal = ({ user, onClose, onSubmit }: EditProfileModalProps) => {
    const [mobileMoney, setMobileMoney] = useState(user.mobileMoneyNumber || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const updatedFields: Partial<User> = {};
            if (mobileMoney !== user.mobileMoneyNumber) {
                // Instead of direct update, create a profile update request
                await api.createProfileUpdateRequest(user.tenantId!, {
                    user_id: user.id,
                    field_name: 'mobile_money_number',
                    requested_value: mobileMoney,
                    current_value: user.mobileMoneyNumber || ''
                });
            }

            if (Object.keys(updatedFields).length > 0) {
                await onSubmit(updatedFields);
            }

            onClose();
        } catch (error) {
            console.error('Error submitting profile update request:', error);
            // You could show an error message here
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

    // Fetch pending requests on component mount
    useEffect(() => {
        const fetchPendingRequests = async () => {
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

        fetchPendingRequests();
    }, [currentUser?.tenantId, currentUser?.id]);

    const handleProfileUpdate = async (fields: Partial<User>) => {
        // This function is now only called for immediate updates (none currently)
        // Profile updates now go through the approval process
        setNotification("Profile update request submitted successfully!");
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
            {isModalOpen && <EditProfileModal user={currentUser} onClose={() => setIsModalOpen(false)} onSubmit={handleProfileUpdate} />}
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
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors">
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
                                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                            {request.status}
                                        </span>
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
