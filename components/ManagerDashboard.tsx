import React, { useMemo } from 'react';
import { User, View, RequestStatus } from '../types';
import { USERS, LEAVE_REQUESTS, ADJUSTMENT_REQUESTS, EXPENSE_REQUESTS, PROFILE_UPDATE_REQUESTS, ANNOUNCEMENTS } from '../constants';
import { UsersGroupIcon, CheckSquareIcon, MegaphoneIcon } from './Icons';

interface ManagerDashboardProps {
    currentUser: User;
    onViewChange: (view: View) => void;
}

const ManagerDashboard = ({ currentUser, onViewChange }: ManagerDashboardProps) => {
    
    const companyUsers = useMemo(() => {
        return USERS.filter(u => u.companyId === currentUser.companyId);
    }, [currentUser.companyId]);

    const pendingApprovalsCount = useMemo(() => {
        const leave = LEAVE_REQUESTS.filter(r => r.status === RequestStatus.PENDING).length;
        const adjustments = ADJUSTMENT_REQUESTS.filter(r => r.status === RequestStatus.PENDING).length;
        const expenses = EXPENSE_REQUESTS.filter(r => r.status === RequestStatus.PENDING).length;
        const profile = PROFILE_UPDATE_REQUESTS.filter(r => r.status === RequestStatus.PENDING).length;
        return leave + adjustments + expenses + profile;
    }, []);
    
    const latestAnnouncement = useMemo(() => {
        return ANNOUNCEMENTS.sort((a,b) => b.date.getTime() - a.date.getTime())[0];
    }, []);

    const StatCard = ({ title, value, icon: Icon, linkTo }: { title: string, value: string | number, icon: React.FC<{className?: string}>, linkTo: View }) => (
        <button onClick={() => onViewChange(linkTo)} className="bg-white p-6 rounded-xl shadow-lg w-full text-left hover:shadow-xl hover:border-primary border-2 border-transparent transition-all">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-4xl font-bold text-gray-800">{value}</p>
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
                <StatCard title="Total Employees" value={companyUsers.length} icon={UsersGroupIcon} linkTo="employees" />
                <StatCard title="Pending Approvals" value={pendingApprovalsCount} icon={CheckSquareIcon} linkTo="approvals" />
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