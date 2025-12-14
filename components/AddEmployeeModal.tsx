

import React, { useState } from 'react';
import { UserRole } from '../types';
import { XIcon, CameraIcon, UserCircleIcon } from './Icons';

interface AddEmployeeModalProps {
    onClose: () => void;
    onSubmit: (data: { name: string, email: string, team: string, role: UserRole, avatarFile: File | null }) => void;
}

const AddEmployeeModal = ({ onClose, onSubmit }: AddEmployeeModalProps) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [team, setTeam] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !team.trim() || !email.trim()) {
            setError('Full Name, Email, and Team are required.');
            return;
        }
        setError('');
        onSubmit({ name, email, team, role, avatarFile });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" aria-label="Close modal">
                    <XIcon className="h-6 w-6"/>
                </button>
                <h3 className="text-xl font-semibold mb-4">Add New Employee</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col items-center mb-4">
                        <label htmlFor="avatar-upload" className="cursor-pointer group relative">
                            <div className="w-24 h-24 rounded-full border-2 border-gray-300 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-2">
                                        <div className="mx-auto mb-1 flex justify-center">
                                            <UserCircleIcon className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <span className="text-xs text-gray-500 font-medium leading-none block">Upload Photo</span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <CameraIcon className="h-6 w-6 text-white" />
                            </div>
                            <input id="avatar-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">ID Photo (Optional)</p>
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                    </div>
                    <div>
                        <label htmlFor="team" className="block text-sm font-medium text-gray-700">Team</label>
                        <input type="text" id="team" value={team} onChange={e => setTeam(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                    </div>
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                        <select id="role" value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                            <option value={UserRole.EMPLOYEE}>Employee</option>
                            <option value={UserRole.OPERATIONS}>Operations</option>
                            <option value={UserRole.PAYMENTS}>Payments</option>
                            <option value={UserRole.HR}>HR</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover">Add Employee</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEmployeeModal;