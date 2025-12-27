

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import EmployeeLogModal from './EmployeeLogModal';
import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';
import { api } from '../services/api';

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
            const data = await api.getUsers(currentUser.tenantId!);
            
            // console.log('Raw user data from API:', data);
            
            // Transform dates and ensure proper types
            const mappedUsers = data.map((user: any) => ({
                ...user,
                hireDate: user.hireDate ? new Date(user.hireDate) : new Date(),
            }));
            
            // console.log('Mapped users:', mappedUsers);
            setUsers(mappedUsers);
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

            await api.createUser(currentUser.tenantId!, userData);
            
            // Refresh users list
            await fetchUsers();
            setIsAddModalOpen(false);
        } catch (err: any) {
            console.error('Error adding employee:', err);
            
            // Check if it's a license limit error
            if (err.message && err.message.includes('License limit reached')) {
                setError('License limit reached. Your company has used all available employee licenses. Please contact support to increase your license limit.');
            } else {
                setError('Failed to add employee');
            }
        }
    };

    const handleEditEmployee = async (updatedUser: User) => {
        try {
            setError(null);
            
            await api.updateUser(currentUser.tenantId!, updatedUser.id, {
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                basic_salary: updatedUser.basicSalary,
                mobile_money_number: updatedUser.mobileMoneyNumber,
            });
            
            // Refresh users list
            await fetchUsers();
            setEditingUser(null);
        } catch (err) {
            console.error('Error updating employee:', err);
            setError('Failed to update employee');
        }
    };

    const handleDeleteEmployee = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;

        try {
            setError(null);
            
            await api.deleteUser(currentUser.tenantId!, userId);
            
            // Refresh users list
            await fetchUsers();
        } catch (err) {
            console.error('Error deleting employee:', err);
            setError('Failed to delete employee');
        }
    };

    return (
        <>
            {viewingUserLog && <EmployeeLogModal user={viewingUserLog} onClose={() => setViewingUserLog(null)} />}
            {isAddModalOpen && <AddEmployeeModal tenantId={currentUser.tenantId!} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddEmployee} />}
            {editingUser && <EditEmployeeModal user={editingUser} currentUser={currentUser} onClose={() => setEditingUser(null)} onSubmit={handleEditEmployee} />}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Employee Management</h2>
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
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Name</th>
                                        <th scope="col" className="px-6 py-3">Role</th>
                                        <th scope="col" className="px-6 py-3">Team</th>
                                        <th scope="col" className="px-6 py-3">Salary</th>
                                        <th scope="col" className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
                                                <td className="px-6 py-4">
                                                    {user.basicSalary > 0 ? (
                                                        <span className="text-green-600 font-medium">GHS {user.basicSalary.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-red-600 font-medium bg-red-50 px-2 py-1 rounded">Not Set</span>
                                                    )}
                                                </td>
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

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3">
                            {users.length === 0 ? (
                                <div className="py-8 text-center text-gray-500">
                                    No employees found
                                </div>
                            ) : (
                                users.map(user => (
                                    <div key={user.id} className="bg-slate-50 border rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-center mb-3">
                                            <img src={user.avatarUrl || `https://picsum.photos/seed/${user.name.split(' ')[0]}/100/100`} alt={user.name} className="w-12 h-12 rounded-full mr-3 object-cover" />
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                                <p className="text-sm text-gray-600">{user.role}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                            <div>
                                                <span className="text-gray-500">Team:</span>
                                                <p className="font-medium text-gray-900">{user.team || 'General'}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Salary:</span>
                                                {user.basicSalary > 0 ? (
                                                    <p className="font-medium text-green-600">GHS {user.basicSalary.toLocaleString()}</p>
                                                ) : (
                                                    <p className="text-red-600 font-medium text-xs bg-red-50 px-2 py-1 rounded inline-block">Not Set</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => setViewingUserLog(user)} className="flex-1 min-w-[100px] bg-primary text-white font-medium py-2 px-3 rounded-lg text-sm hover:bg-primary-hover transition-colors">
                                                View Log
                                            </button>
                                            {canEditUsers && (
                                                <>
                                                    <button onClick={() => setEditingUser(user)} className="flex-1 min-w-[80px] bg-amber-500 text-white font-medium py-2 px-3 rounded-lg text-sm hover:bg-amber-600 transition-colors">
                                                        Edit
                                                    </button>
                                                    {user.id !== currentUser.id && (
                                                        <button onClick={() => handleDeleteEmployee(user.id)} className="flex-1 min-w-[80px] bg-red-500 text-white font-medium py-2 px-3 rounded-lg text-sm hover:bg-red-600 transition-colors">
                                                            Delete
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default EmployeeManagement;