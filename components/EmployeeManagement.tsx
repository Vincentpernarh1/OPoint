

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import EmployeeLogModal from './EmployeeLogModal';
import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';

interface EmployeeManagementProps {
    currentUser: User;
}

const EmployeeManagement = ({ currentUser }: EmployeeManagementProps) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewingUserLog, setViewingUserLog] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const canEditUsers = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HR;

    // Fetch users from API
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/users', {
                headers: {
                    'X-Tenant-ID': currentUser.tenantId || '',
                },
            });
            const data = await response.json();
            
            if (data.success) {
                // Map database fields to component fields and filter users by tenant
                const mappedUsers = (data.data || []).map((user: any) => ({
                    ...user,
                    basicSalary: user.basic_salary || 0,
                    hireDate: user.hire_date ? new Date(user.hire_date) : new Date(),
                    avatarUrl: user.avatar_url || undefined,
                    tenantId: user.tenant_id,
                    companyName: user.company_name,
                    mobileMoneyNumber: user.mobile_money_number,
                }));
                setUsers(mappedUsers);
            } else {
                setError(data.error || 'Failed to fetch users');
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmployee = async (data: { name: string, email: string, team: string, role: UserRole, avatarFile: File | null }) => {
        try {
            setError(null);
            
            // Create user data
            const userData = {
                name: data.name,
                email: data.email,
                role: data.role,
                basic_salary: 0, // Default salary
                hire_date: new Date().toISOString().split('T')[0],
                status: 'Active',
                temporary_password: '1234', // Set temporary password
                requires_password_change: true
            };

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': currentUser.tenantId || '',
                },
                body: JSON.stringify(userData),
            });

            const result = await response.json();

            if (result.success) {
                // Refresh users list
                await fetchUsers();
                setIsAddModalOpen(false);
            } else {
                setError(result.error || 'Failed to add employee');
            }
        } catch (err) {
            console.error('Error adding employee:', err);
            setError('Failed to add employee');
        }
    };

    const handleEditEmployee = async (updatedUser: User) => {
        try {
            setError(null);
            
            const response = await fetch(`/api/users/${updatedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': currentUser.tenantId || '',
                },
                body: JSON.stringify({
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    basic_salary: updatedUser.basicSalary,
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Refresh users list
                await fetchUsers();
                setEditingUser(null);
            } else {
                setError(result.error || 'Failed to update employee');
            }
        } catch (err) {
            console.error('Error updating employee:', err);
            setError('Failed to update employee');
        }
    };

    const handleDeleteEmployee = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;

        try {
            setError(null);
            
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'X-Tenant-ID': currentUser.tenantId || '',
                },
            });

            const result = await response.json();

            if (result.success) {
                // Refresh users list
                await fetchUsers();
            } else {
                setError(result.error || 'Failed to delete employee');
            }
        } catch (err) {
            console.error('Error deleting employee:', err);
            setError('Failed to delete employee');
        }
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
                
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
                
                {loading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-2 text-gray-600">Loading employees...</p>
                    </div>
                ) : (
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
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No employees found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id} className="bg-white border-b hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center">
                                                <img src={user.avatarUrl || `https://picsum.photos/seed/${user.name.split(' ')[0]}/100/100`} alt={user.name} className="w-8 h-8 rounded-full mr-3 object-cover" />
                                                {user.name}
                                            </td>
                                            <td className="px-6 py-4">{user.role}</td>
                                            <td className="px-6 py-4">{user.team || 'General'}</td>
                                            <td className="px-6 py-4 space-x-4">
                                                <button onClick={() => setViewingUserLog(user)} className="font-medium text-primary hover:underline">
                                                    View Log
                                                </button>
                                                {canEditUsers && (
                                                    <>
                                                        <button onClick={() => setEditingUser(user)} className="font-medium text-amber-600 hover:underline">
                                                            Edit
                                                        </button>
                                                        {user.id !== currentUser.id && (
                                                            <button onClick={() => handleDeleteEmployee(user.id)} className="font-medium text-red-600 hover:underline">
                                                                Delete
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default EmployeeManagement;