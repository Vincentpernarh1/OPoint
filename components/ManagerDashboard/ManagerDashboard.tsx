import React, { useMemo, useState, useEffect } from 'react';
import { User, View, RequestStatus, Announcement } from '../../types';
import { USERS, LEAVE_REQUESTS, ADJUSTMENT_REQUESTS, EXPENSE_REQUESTS, PROFILE_UPDATE_REQUESTS, ANNOUNCEMENTS } from '../../constants';
import { UsersGroupIcon, CheckSquareIcon, MegaphoneIcon, DollarSignIcon } from "../Icons/Icons";
import PullToRefreshIndicator from "../PullToRefreshIndicator/PullToRefreshIndicator";
import { api } from '../../services/api';
import { Skeleton, Button } from '../ui';
import { useRefreshable } from '../../hooks/useRefreshable';
import './ManagerDashboard.css';

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

    // Refresh function for pull-to-refresh
    const handleRefresh = async () => {
        setLoadingEmployees(true);
        setLoadingApprovals(true);
        setLoadingPayout(true);
        
        const promises = [];
        
        // Fetch employee count
        promises.push(
            api.getUsers(currentUser.tenantId!)
                .then(users => setEmployeeCount(users.length))
                .catch(() => setEmployeeCount(companyUsers.length))
                .finally(() => setLoadingEmployees(false))
        );
        
        // Fetch pending approvals
        promises.push(
            Promise.all([
                api.getLeaveRequests(currentUser.tenantId!, { status: 'Pending' }),
                api.getTimeAdjustmentRequests(currentUser.tenantId!, { status: 'Pending' }),
                api.getProfileUpdateRequests(currentUser.tenantId!, { status: 'Pending' }),
                api.getExpenseClaims(currentUser.tenantId!, { status: 'pending' })
            ])
                .then(([leave, time, profile, expense]) => {
                    setPendingApprovalsCount(leave.length + time.length + profile.length + expense.length);
                })
                .catch(() => setPendingApprovalsCount(0))
                .finally(() => setLoadingApprovals(false))
        );
        
        // Fetch payout
        promises.push(
            api.getUsers(currentUser.tenantId!)
                .then(users => {
                    const total = users.reduce((sum, user) => sum + (user.basicSalary || 0), 0);
                    setTotalMonthlyPayout(total);
                })
                .catch(() => setTotalMonthlyPayout(0))
                .finally(() => setLoadingPayout(false))
        );
        
        await Promise.all(promises);
    };

    const { containerRef, isRefreshing, pullDistance, pullProgress } = useRefreshable(handleRefresh);
    
    const companyUsers = useMemo(() => {
        return USERS.filter(u => u.tenantId === currentUser.tenantId);
    }, [currentUser.tenantId]);

    // Fetch real employee count from API
    useEffect(() => {
        const fetchEmployeeCount = async () => {
            try {
                setLoadingEmployees(true);
                const users = await api.getUsers(currentUser.tenantId!);
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
                const leaveRequests = await api.getLeaveRequests(currentUser.tenantId!, { status: 'Pending' });
                
                // Fetch pending time adjustment requests
                const timeAdjustments = await api.getTimeAdjustmentRequests(currentUser.tenantId!, { status: 'Pending' });
                
                // Fetch pending profile update requests
                const profileRequests = await api.getProfileUpdateRequests(currentUser.tenantId!, { status: 'Pending' });
                
                // Fetch pending expense claims
                const expenseClaims = await api.getExpenseClaims(currentUser.tenantId!, { status: 'pending' });
                
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
                const users = await api.getUsers(currentUser.tenantId!);
                
                // console.log('ManagerDashboard users data:', users);
                // console.log('Total users:', users.length);
                // console.log('Users with salaries:', users.filter(u => u.basicSalary > 0));
                
                // Calculate total monthly payroll (sum of all basic salaries)
                const totalPayout = users.reduce((sum, user) => {
                    const basicSalary = user.basicSalary || 0;
                    // console.log(`User ${user.name}: basicSalary = ${basicSalary}`);
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

    const StatCard = ({ title, value, icon: Icon, linkTo, isLoading, gradient, emoji }: { title: string, value: string | number, icon: React.FC<{className?: string}>, linkTo: View, isLoading?: boolean, gradient: string, emoji: string }) => {
        return (
            <button 
                onClick={() => onViewChange(linkTo)} 
                className="group relative overflow-hidden bg-white p-3 sm:p-4 lg:p-4 rounded-2xl shadow-lg hover:shadow-2xl border-2 border-transparent hover:border-primary/20 transition-all duration-300 transform hover:scale-105 text-left"
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                <div className="relative z-10 flex flex-col h-full">
                    {/* Top row: Left icon, Title, Right icon */}
                    <div className="flex items-center justify-between mb-3 lg:mb-3">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-300`}>
                            <span className="text-xl sm:text-2xl">{emoji}</span>
                        </div>
                        <p className="flex-1 text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide text-center px-2">{title}</p>
                        <div className="bg-gray-50 p-1.5 sm:p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                    
                    {/* Middle: Large value centered */}
                    <div className="flex-1 flex items-center justify-center">
                        {isLoading ? (
                            <Skeleton className="h-12 sm:h-16 w-32 sm:w-40" />
                        ) : (
                            <p className="text-4xl sm:text-5xl lg:text-3xl xl:text-4xl font-extrabold text-gray-800 group-hover:text-primary transition-colors">{value}</p>
                        )}
                    </div>
                    
                    {/* Bottom: View details link */}
                    <div className="flex items-center justify-center text-xs sm:text-sm text-gray-500 group-hover:text-primary transition-colors mt-3 lg:mt-3">
                        <span className="font-medium">View details</span>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </button>
        );
    };

    return (
        <div
            ref={containerRef}
            className="h-full overflow-auto overscroll-contain manager-dashboard-container"
        >
            {(pullDistance > 0 || isRefreshing) && (
                <PullToRefreshIndicator 
                    isRefreshing={isRefreshing}
                    pullDistance={pullDistance}
                    pullProgress={pullProgress}
                />
            )}
            
            <div className="space-y-6">
                {/* Modern Gradient Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary via-indigo-600 to-purple-700 rounded-2xl p-4 sm:p-5 lg:p-4 shadow-2xl">
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <span className="text-3xl">👋</span>
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-4xl lg:text-3xl font-extrabold text-white">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
                                <p className="text-white/90 text-sm sm:text-base mt-1">Here's your company overview at a glance</p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-5 rounded-full -ml-20 -mb-20"></div>
                    <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white opacity-5 rounded-full"></div>
                </div>

            {/* Modern Stat Cards */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <span className="w-1 h-8 bg-gradient-to-b from-primary to-purple-600 rounded-full mr-3"></span>
                    Key Metrics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <StatCard 
                        title="Total Employees" 
                        value={employeeCount} 
                        icon={UsersGroupIcon} 
                        linkTo="employees" 
                        isLoading={loadingEmployees}
                        gradient="from-blue-500 to-indigo-600"
                        emoji="👥"
                    />
                    <StatCard 
                        title="Pending Approvals" 
                        value={pendingApprovalsCount} 
                        icon={CheckSquareIcon} 
                        linkTo="approvals" 
                        isLoading={loadingApprovals}
                        gradient="from-amber-500 to-orange-600"
                        emoji="✅"
                    />
                    <StatCard 
                        title="Monthly Payout" 
                        value={`GHS ${totalMonthlyPayout.toLocaleString()}`} 
                        icon={DollarSignIcon} 
                        linkTo="payslips" 
                        isLoading={loadingPayout}
                        gradient="from-green-500 to-emerald-600"
                        emoji="💰"
                    />
                </div>
            </div>
            
             {latestAnnouncement && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <span className="w-1 h-8 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full mr-3"></span>
                        Latest Announcement
                    </h2>
                    <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl border-2 border-gray-100 hover:border-primary/30 transition-all duration-300">
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-primary to-purple-600"></div>
                        <div className="p-6 pl-8">
                            <div className="flex items-start gap-4 mb-3">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                                        <MegaphoneIcon className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 flex-1">{latestAnnouncement.title}</h3>
                                
                            </div>
                            <p className="text-gray-600 leading-relaxed mb-3">{latestAnnouncement.content}</p>
                            <p className="text-xs text-gray-400 bg-gray-50 inline-flex items-center px-2 sm:px-3 py-1 gap-3">
                                {new Date(latestAnnouncement.created_at).toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}

                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => onViewChange('announcements')}
                                    className="bg-primary/10 hover:bg-primary hover:text-white text-primary font-semibold px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 whitespace-nowrap flex-shrink-0"
                                >
                                    View All →
                                </Button>
                            </p>
                            
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default ManagerDashboard;