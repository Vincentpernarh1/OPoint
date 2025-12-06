import React, { useState } from 'react';
import { User } from '../types';
import { UserCircleIcon, PencilIcon } from './Icons';
import Notification from './Notification';

interface ProfileProps {
    currentUser: User;
}

interface UpdateRequestModalProps {
    user: User;
    onClose: () => void;
    onSubmit: (fields: Partial<User>) => void;
}

const UpdateRequestModal = ({ user, onClose, onSubmit }: UpdateRequestModalProps) => {
    const [mobileMoney, setMobileMoney] = useState(user.mobileMoneyNumber || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedFields: Partial<User> = {};
        if (mobileMoney !== user.mobileMoneyNumber) {
            updatedFields.mobileMoneyNumber = mobileMoney;
        }
        // Add other fields here (address, emergency contact, etc.)
        if (Object.keys(updatedFields).length > 0) {
            onSubmit(updatedFields);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
                <h3 className="text-xl font-semibold mb-4">Request Profile Update</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="momo" className="block text-sm font-medium text-gray-700">Mobile Money Number</label>
                        <input type="text" id="momo" value={mobileMoney} onChange={e => setMobileMoney(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                    {/* Add other editable fields here */}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-lg">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg">Submit Request</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Profile = ({ currentUser }: ProfileProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    
    const handleUpdateRequest = (fields: Partial<User>) => {
        console.log("Profile update requested:", fields);
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
            {isModalOpen && <UpdateRequestModal user={currentUser} onClose={() => setIsModalOpen(false)} onSubmit={handleUpdateRequest} />}
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 border-b pb-6 mb-6">
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-24 w-24 rounded-full" />
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
                        Request Update
                    </button>
                </div>
            </div>
        </>
    );
};

export default Profile;
