import React, { useMemo, useState, useEffect } from 'react';
import { User, View, RequestStatus, Announcement } from '../types';
import { USERS, LEAVE_REQUESTS, ADJUSTMENT_REQUESTS, EXPENSE_REQUESTS, PROFILE_UPDATE_REQUESTS, ANNOUNCEMENTS } from '../constants';
import { UsersGroupIcon, CheckSquareIcon, MegaphoneIcon, DollarSignIcon } from './Icons';
import { api } from '../services/api';

interface ManagerDashboardProps {
    currentUser: User;
    onViewChange: (view: View) => void;
    announcements: Announcement[];
}

const ManagerDashboard = ({ currentUser, onViewChange, announcements }: ManagerDashboardProps) => {
    const [employeeCount, setEmployeeCount] = useState(0);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
    const [loadingApprovals, setLoadingApprovals] = useState(true);
    const [totalMonthlyPayout, setTotalMonthlyPayout] = useState(0);
    const [loadingPayout, setLoadingPayout] = useState(true);
    
    const companyUsers = useMemo(() => {
        return USERS.filter(u => u.tenantId === currentUser.tenantId);
    }, [currentUser.tenantId]);

    // Fetch real employee count from API
    useEffect(() => {
        const fetchEmployeeCount = async () => {
            try {
                setLoadingEmployees(true);
                const users = await api.getUsers(currentUser.tenantId);
                setEmployeeCount(users.length);
            } catch (error) {
                console.error('Failed to fetch employee count:', error);
                // Fallback to mock data
                setEmployeeCount(companyUsers.length);
            } finally {
                setLoadingEmployees(false);
            }
        };

        fetchEmployeeCount();
    }, [currentUser.tenantId, companyUsers.length]);

    // Fetch real pending approvals count from API
    useEffect(() => {
        const fetchPendingApprovalsCount = async () => {
            try {
                setLoadingApprovals(true);
                
                // Fetch pending leave requests
                const leaveRequests = await api.getLeaveRequests(currentUser.tenantId, { status: 'Pending' });
                
                // Fetch pending time adjustment requests
                const timeAdjustments = await api.getTimeAdjustmentRequests(currentUser.tenantId, { status: 'Pending' });
                
                // Fetch pending profile update requests
                const profileRequests = await api.getProfileUpdateRequests(currentUser.tenantId, { status: 'Pending' });
                
                // Fetch pending expense claims
                const expenseClaims = await api.getExpenseClaims(currentUser.tenantId, { status: 'pending' });
                
                const totalPending = leaveRequests.length + timeAdjustments.length + profileRequests.length + expenseClaims.length;
                setPendingApprovalsCount(totalPending);
            } catch (error) {
                console.error('Failed to fetch pending approvals count:', error);
                // Fallback to 0
                setPendingApprovalsCount(0);
            } finally {
                setLoadingApprovals(false);
            }
        };

        fetchPendingApprovalsCount();
    }, [currentUser.tenantId]);

    // Fetch total monthly payout
    useEffect(() => {
        const fetchTotalMonthlyPayout = async () => {
            try {
                setLoadingPayout(true);
                const users = await api.getUsers(currentUser.tenantId);
                
                console.log('ManagerDashboard users data:', users);
                console.log('Total users:', users.length);
                console.log('Users with salaries:', users.filter(u => u.basicSalary > 0));
                
                // Calculate total monthly payroll (sum of all basic salaries)
                const totalPayout = users.reduce((sum, user) => {
                    const basicSalary = user.basicSalary || 0;
                    console.log(`User ${user.name}: basicSalary = ${basicSalary}`);
                    return sum + basicSalary;
                }, 0);
                
                // console.log('Calculated total payout:', totalPayout);
                setTotalMonthlyPayout(totalPayout);
            } catch (error) {
                console.error('Failed to fetch total monthly payout:', error);
                // Fallback calculation using mock data
                const mockUsers = USERS.filter(u => u.tenantId === currentUser.tenantId);
                const mockPayout = mockUsers.reduce((sum, user) => {
                    const basicSalary = user.basicSalary || 0;
                    return sum + basicSalary;
                }, 0);
                setTotalMonthlyPayout(mockPayout);
            } finally {
                setLoadingPayout(false);
            }
        };

        fetchTotalMonthlyPayout();
    }, [currentUser.tenantId]);

    const latestAnnouncement = useMemo(() => {
        if (announcements.length === 0) return null;
        return announcements.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }, [announcements]);

    const StatCard = ({ title, value, icon: Icon, linkTo }: { title: string, value: string | number, icon: React.FC<{className?: string}>, linkTo: View }) => (
        <button onClick={() => onViewChange(linkTo)} className="bg-white p-6 rounded-xl shadow-lg w-full text-left hover:shadow-xl hover:border-primary border-2 border-transparent transition-all">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-3xl font-bold text-gray-800">{value}</p>
                </div>
                <div className="bg-primary-light text-primary p-3 rounded-full">
                    <Icon className="h-7 w-7" />
                </div>
            </div>
        </button>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
                <p className="text-gray-500 mt-1">Here's a quick overview of your company's activities.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Employees" value={loadingEmployees ? '...' : employeeCount} icon={UsersGroupIcon} linkTo="employees" />
                <StatCard title="Pending Approvals" value={loadingApprovals ? '...' : pendingApprovalsCount} icon={CheckSquareIcon} linkTo="approvals" />
                <StatCard title="Monthly Payout" value={loadingPayout ? '...' : `GHS ${totalMonthlyPayout.toLocaleString()}`} icon={DollarSignIcon} linkTo="payslips" />
            </div>
            
             {latestAnnouncement && (
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-3">Latest Announcement</h2>
                    <div className="bg-white border-l-4 border-primary text-primary-dark p-4 rounded-r-lg shadow-lg" role="alert">
                        <div className="flex items-start">
                            <div className="py-1"><MegaphoneIcon className="h-6 w-6 text-primary" /></div>
                            <div className="ml-4 flex-1">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold">{latestAnnouncement.title}</p>
                                    <button onClick={() => onViewChange('announcements')} className="text-sm font-medium text-primary hover:underline">View All</button>
                                </div>
                                <p className="text-sm mt-1">{latestAnnouncement.content}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerDashboard;