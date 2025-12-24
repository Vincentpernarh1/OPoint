import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { XIcon } from './Icons';
import { authService } from '../services/authService';

interface EditEmployeeModalProps {
    user: User;
    currentUser: User;
    onClose: () => void;
    onSubmit: (updatedUser: User) => void;
}

const EditEmployeeModal = ({ user, currentUser, onClose, onSubmit }: EditEmployeeModalProps) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [team, setTeam] = useState(user.team);
    const [role, setRole] = useState(user.role);
    const [basicSalary, setBasicSalary] = useState(user.basicSalary && user.basicSalary > 0 ? user.basicSalary.toString() : "1");
    const [mobileMoneyNumber, setMobileMoneyNumber] = useState(user.mobileMoneyNumber || '');
    const [error, setError] = useState('');

    const canChangeRole = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HR;

    const handleResetPassword = async () => {
        if (!window.confirm(`Are you sure you want to reset the password for ${user.name}? This will send a reset email to ${user.email}.`)) {
            return;
        }

        try {
            const result = await authService.resetPassword(user.id);
            if (result.success) {
                alert(result.message);
            } else {
                alert(`Failed to reset password: ${result.message}`);
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('An error occurred while resetting the password.');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !team.trim() || !email.trim()) {
            setError('Name, Team, and Email are required.');
            return;
        }
        
        const updatedUser: User = {
            ...user,
            name,
            email,
            team,
            role,
            basicSalary: parseFloat(basicSalary) || 0,
            mobileMoneyNumber,
        };
        onSubmit(updatedUser);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] relative flex flex-col" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10" title="Close modal">
                    <XIcon className="h-6 w-6"/>
                </button>
                <div className="p-6 flex-1 overflow-y-auto">
                    <h3 className="text-xl font-semibold mb-4">Edit Employee: {user.name}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" id="edit-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" id="edit-email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="edit-team" className="block text-sm font-medium text-gray-700">Team</label>
                        <input type="text" id="edit-team" value={team} onChange={e => setTeam(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">Role</label>
                        <select 
                            id="edit-role" 
                            value={role} 
                            onChange={e => setRole(e.target.value as UserRole)} 
                            disabled={!canChangeRole}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value={UserRole.EMPLOYEE}>Employee</option>
                            <option value={UserRole.OPERATIONS}>Operations</option>
                            <option value={UserRole.PAYMENTS}>Payments</option>
                            <option value={UserRole.HR}>HR</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                         {!canChangeRole && <p className="text-xs text-gray-500 mt-1">Only Admins or HR can change a user's role.</p>}
                    </div>
                    <div>
                        <label htmlFor="edit-salary" className="block text-sm font-medium text-gray-700">Basic Salary (GHS)</label>
                        <input type="number" id="edit-salary" value={basicSalary} onChange={e => setBasicSalary(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="edit-momo" className="block text-sm font-medium text-gray-700">Mobile Money Number</label>
                        <input type="text" id="edit-momo" value={mobileMoneyNumber} onChange={e => setMobileMoneyNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Security</h4>
                        <button 
                            type="button" 
                            onClick={handleResetPassword} 
                            className="py-2 px-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold"
                        >
                            Reset Password
                        </button>
                        <p className="text-xs text-gray-500 mt-1">This will send a password reset email to the employee.</p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-lg">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg font-bold">Save Changes</button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
};

export default EditEmployeeModal;