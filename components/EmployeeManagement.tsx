

import React, { useState } from 'react';
import { USERS } from '../constants';
import { User, UserRole } from '../types';
import EmployeeLogModal from './EmployeeLogModal';
import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';

interface EmployeeManagementProps {
    currentUser: User;
}

const EmployeeManagement = ({ currentUser }: EmployeeManagementProps) => {
    const [users, setUsers] = useState<User[]>(USERS.filter(u => u.companyId === currentUser.companyId));
    const [viewingUserLog, setViewingUserLog] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const canEditUsers = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HR;

    const handleAddEmployee = (data: { name: string, email: string, team: string, role: UserRole, avatarFile: File | null }) => {
        let avatarUrl = `https://picsum.photos/seed/${data.name.split(' ')[0]}/100/100`;
        
        if (data.avatarFile) {
            avatarUrl = URL.createObjectURL(data.avatarFile);
        }

        const newUser: User = {
            id: `user-${Date.now()}`,
            name: data.name,
            email: data.email,
            team: data.team,
            role: data.role,
            companyId: currentUser.companyId,
            avatarUrl: avatarUrl,
            basicSalary: 0,
            hireDate: new Date(),
        };
        setUsers(prevUsers => [...prevUsers, newUser]);
        setIsAddModalOpen(false);
    };

    const handleEditEmployee = (updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        setEditingUser(null);
    };

    return (
        <>
            {viewingUserLog && <EmployeeLogModal user={viewingUserLog} onClose={() => setViewingUserLog(null)} />}
            {isAddModalOpen && <AddEmployeeModal onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddEmployee} />}
            {editingUser && <EditEmployeeModal user={editingUser} currentUser={currentUser} onClose={() => setEditingUser(null)} onSubmit={handleEditEmployee} />}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Employee Management</h2>
                    {canEditUsers && (
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors">Add Employee</button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Team</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="bg-white border-b hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center">
                                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3 object-cover" />
                                        {user.name}
                                    </td>
                                    <td className="px-6 py-4">{user.role}</td>
                                    <td className="px-6 py-4">{user.team}</td>
                                    <td className="px-6 py-4 space-x-4">
                                        <button onClick={() => setViewingUserLog(user)} className="font-medium text-primary hover:underline">
                                            View Log
                                        </button>
                                        {canEditUsers && (
                                            <button onClick={() => setEditingUser(user)} className="font-medium text-amber-600 hover:underline">
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default EmployeeManagement;