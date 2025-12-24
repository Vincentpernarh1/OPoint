import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, Navigate, useLocation, Outlet, useParams, useNavigate } from 'react-router-dom';
import { User, UserRole, Company, Announcement, View } from './types';
import { COMPANIES, ANNOUNCEMENTS } from './constants';

// Import Components with lazy loading
const Login = lazy(() => import('./components/Login'));
const InitialLogin = lazy(() => import('./components/InitialLogin'));
const TimeClock = lazy(() => import('./components/TimeClock'));
const LeaveManagement = lazy(() => import('./components/LeaveManagement'));
const Payslips = lazy(() => import('./components/Payslips'));
const Announcements = lazy(() => import('./components/Announcements'));
const EmployeeManagement = lazy(() => import('./components/EmployeeManagement'));
const Reports = lazy(() => import('./components/Reports'));
const Expenses = lazy(() => import('./components/Expenses'));
const Profile = lazy(() => import('./components/Profile'));
const Approvals = lazy(() => import('./components/Approvals'));
const MobileMoneyPayroll = lazy(() => import('./components/MobileMoneyPayroll'));
const Settings = lazy(() => import('./components/Settings'));
import ManagerDashboard from './components/ManagerDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationBell from './components/NotificationBell';
import MobileBottomNav from './components/MobileBottomNav';

// Import Services
import { authService } from './services/authService';
import { getCurrentTenantId, setTenantContext } from './services/database';
import db from './services/database';
import { api } from './services/api';

import { LogoIcon, LogOutIcon, LayoutDashboardIcon, BriefcaseIcon, CheckSquareIcon, UsersIcon, DollarSignIcon, MenuIcon, XIcon, FileTextIcon, MegaphoneIcon, ReceiptIcon, UserCircleIcon, SmartphoneIcon, CogIcon, ChevronLeftIcon, ChevronRightIcon, BellIcon } from './components/Icons';

const PERMISSIONS: Record<string, UserRole[]> = {
    '/dashboard': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/leave': [UserRole.EMPLOYEE, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/payslips': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/expenses': [UserRole.EMPLOYEE, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/announcements': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/profile': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/approvals': [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/employees': [UserRole.ADMIN, UserRole.HR],
    '/payroll': [UserRole.ADMIN, UserRole.PAYMENTS],
    '/reports': [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/settings': [UserRole.ADMIN],
};

const App = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

    const fetchAnnouncements = useCallback(async () => {
        if (!currentUser?.tenantId || !currentUser?.id) return;
        try {
            const data = await api.getAnnouncements(currentUser.tenantId, currentUser.id);
            if (data && data.length > 0) {
                setAnnouncements(data);
            } else {
                // Fall back to constants for development
                const mockData = ANNOUNCEMENTS.filter(ann => ann.tenant_id === currentUser.tenantId);
                setAnnouncements(mockData);
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
            // Fall back to constants on error
            const mockData = ANNOUNCEMENTS.filter(ann => ann.tenant_id === currentUser.tenantId);
            setAnnouncements(mockData);
        }
    }, [currentUser?.tenantId, currentUser?.id]);

    const fetchPendingApprovalsCount = useCallback(async () => {
        if (!currentUser?.tenantId || !PERMISSIONS['/approvals']?.includes(currentUser.role)) return;
        try {
            const [leaveData, adjustmentData, expenseData] = await Promise.all([
                api.getLeaveRequests(currentUser.tenantId, { status: 'Pending' }),
                api.getTimeAdjustmentRequests(currentUser.tenantId, { status: 'Pending' }),
                api.getExpenseClaims(currentUser.tenantId, { status: 'pending' })
            ]);
            const total = (leaveData?.length || 0) + (adjustmentData?.length || 0) + (expenseData?.length || 0);
            setPendingApprovalsCount(total);
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
            setPendingApprovalsCount(0);
        }
    }, [currentUser?.tenantId, currentUser?.role]);

    const handlePostAnnouncement = useCallback(async (newAnnouncement: Announcement) => {
        setAnnouncements(prev => [{ ...newAnnouncement, readBy: [currentUser!.id] }, ...prev]);
    }, [currentUser]);

    const handleMarkAnnouncementsAsRead = useCallback(async () => {
        if (!currentUser?.tenantId || !currentUser?.id) return;
        try {
            await api.markAnnouncementsAsRead(currentUser.tenantId, currentUser.id);
            // Refetch announcements to get updated read status
            await fetchAnnouncements();
        } catch (error) {
            console.error('Error marking announcements as read:', error);
        }
    }, [currentUser?.tenantId, currentUser?.id, fetchAnnouncements]);

    const handleViewChange = useCallback((view: View) => {
        navigate(`/${view}`);
    }, [navigate]);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            // console.log('[useEffect] Checking session...');
            try {
                const userFromCookie: any = await authService.getCurrentUser();
                console.log('[useEffect] User from session:', userFromCookie);
                
                if (userFromCookie && userFromCookie.id && userFromCookie.email) {
                    // Normalize role string
                    let role = userFromCookie.role;
                    if (role === 'SuperAdmin') role = 'Admin';
                    // Capitalize first letter to match UserRole enum
                    role = role.charAt(0).toUpperCase() + role.slice(1);
                    const isSuperAdmin = userFromCookie.role === 'SuperAdmin';
                    // Validate that we have the required fields
                    if (!userFromCookie.id || !userFromCookie.email) {
                        console.log('[useEffect] Invalid user data, clearing session');
                        authService.logout();
                        setCurrentUser(null);
                        setIsLoading(false);
                        return;
                    }
                    const appUser: User = {
                        id: userFromCookie?.id || userFromCookie?.auth_user_id || '',
                        name: userFromCookie?.name || userFromCookie?.full_name || '',
                        email: userFromCookie?.email || '',
                        role: role as UserRole,
                        tenantId: userFromCookie?.tenantId || userFromCookie?.tenant_id,
                        companyName: userFromCookie?.companyName || userFromCookie?.company_name || '',
                        team: userFromCookie?.team || '',
                        avatarUrl: userFromCookie?.avatar_url || '',
                        basicSalary: userFromCookie?.basic_salary || 0,
                        hireDate: userFromCookie?.hire_date ? new Date(userFromCookie?.hire_date) : new Date(),
                        mobileMoneyNumber: userFromCookie?.mobile_money_number || userFromCookie?.mobileMoneyNumber,
                    };
                    console.log('[useEffect] Mapped appUser:', appUser);

                    if (isSuperAdmin) {
                        setCurrentUser(appUser);
                        // Fetch announcements immediately
                        if (appUser.tenantId && appUser.id) {
                            fetchAnnouncements();
                        }
                    } else {
                        // Set tenant context
                        if (appUser.tenantId) {
                            setTenantContext(appUser.tenantId, appUser.id);
                            setCurrentUser(appUser);
                            // Fetch announcements immediately
                            fetchAnnouncements();
                        } else {
                            console.log('[useEffect] No tenant ID found, clearing session');
                            authService.logout();
                            setCurrentUser(null);
                        }
                    }
                } else {
                    console.log('[useEffect] No valid session found');
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error('[useEffect] Session restoration failed:', error);
                authService.logout();
                setCurrentUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (currentUser?.tenantId && currentUser?.id) {
            fetchAnnouncements();
            fetchPendingApprovalsCount();
        }
    }, [currentUser?.tenantId, currentUser?.id, fetchAnnouncements, fetchPendingApprovalsCount]);

    // Refresh currentUser from API when coming back online or when a profile update occurs
    useEffect(() => {
        if (!currentUser) return;

        let userPollInterval: NodeJS.Timeout | null = null;

        const refreshCurrentUser = async (detail?: any) => {
            try {
                if (!currentUser?.tenantId) return;
                // If event included a specific userId, fetch that user directly for accurate updates
                let updated: any = null;
                if (detail && detail.userId) {
                    try {
                        updated = await api.getUser(currentUser.tenantId, detail.userId);
                    } catch (err) {
                        // fallback to fetching all users
                        console.warn('getUser failed, falling back to getUsers:', err);
                    }
                }

                if (!updated) {
                    const users = await api.getUsers(currentUser.tenantId);
                    if (!Array.isArray(users)) return;
                    updated = users.find((u: any) => (u.id || u.user_id || u.auth_user_id) === currentUser.id || u.id === currentUser.id);
                }

                if (updated) {
                    const refreshedUser: User = {
                        id: updated.id || updated.user_id || updated.auth_user_id || currentUser.id,
                        name: updated.name || updated.full_name || currentUser.name,
                        email: updated.email || currentUser.email,
                        role: currentUser.role,
                        tenantId: updated.tenant_id || updated.tenantId || currentUser.tenantId,
                        companyName: updated.company_name || updated.companyName || currentUser.companyName,
                        team: updated.team || currentUser.team,
                        avatarUrl: updated.avatar_url || updated.avatarUrl || currentUser.avatarUrl,
                        basicSalary: updated.basic_salary || updated.basicSalary || currentUser.basicSalary,
                        hireDate: updated.hire_date ? new Date(updated.hire_date) : currentUser.hireDate,
                        mobileMoneyNumber: updated.mobile_money_number || updated.mobileMoneyNumber || currentUser.mobileMoneyNumber,
                    } as User;

                    // Only update if something changed
                    if (JSON.stringify(refreshedUser) !== JSON.stringify(currentUser)) {
                        setCurrentUser(refreshedUser);
                        try { authService.setCurrentUser(refreshedUser); } catch (e) { /* ignore */ }
                    }
                }
            } catch (err) {
                console.warn('Could not refresh current user after update/online:', err);
            }
        };

        const startUserPolling = () => {
            if (userPollInterval) clearInterval(userPollInterval);
            userPollInterval = setInterval(async () => {
                if (navigator.onLine) {
                    await refreshCurrentUser();
                }
            }, 10000); // Poll user data every 10 seconds
        };

        const stopUserPolling = () => {
            if (userPollInterval) {
                clearInterval(userPollInterval);
                userPollInterval = null;
            }
        };

        const handleOnline = async () => {
            await refreshCurrentUser();
            // Fetch announcements immediately when coming online
            if (currentUser?.tenantId && currentUser?.id) {
                await fetchAnnouncements();
                await fetchPendingApprovalsCount();
            }
        };
        const handleEmployeeUpdated = (e: Event) => {
            try {
                const ce = e as CustomEvent;
                refreshCurrentUser(ce.detail);
            } catch (err) {
                refreshCurrentUser();
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('employee-updated', handleEmployeeUpdated as EventListener);

        // Start polling if online
        if (navigator.onLine) {
            startUserPolling();
        }

        const handleOnlineForPolling = () => startUserPolling();
        const handleOfflineForPolling = () => stopUserPolling();

        window.addEventListener('online', handleOnlineForPolling);
        window.addEventListener('offline', handleOfflineForPolling);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('employee-updated', handleEmployeeUpdated as EventListener);
            window.removeEventListener('online', handleOnlineForPolling);
            window.removeEventListener('offline', handleOfflineForPolling);
            stopUserPolling();
        };
    }, [currentUser, fetchAnnouncements]);

    // Polling for announcements when online
    useEffect(() => {
        if (!currentUser?.tenantId || !currentUser?.id) return;

        let pollInterval: NodeJS.Timeout | null = null;

        const startPolling = () => {
            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(async () => {
                if (navigator.onLine) {
                    try {
                        await fetchAnnouncements();
                        await fetchPendingApprovalsCount();
                    } catch (error) {
                        console.error('Error polling notifications:', error);
                    }
                }
            }, 10000); // Poll every 10 seconds
        };

        const stopPolling = () => {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        };

        if (navigator.onLine) {
            startPolling();
        }

        const handleOnline = () => startPolling();
        const handleOffline = () => stopPolling();

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            stopPolling();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [currentUser?.tenantId, currentUser?.id, fetchAnnouncements, fetchPendingApprovalsCount]);

    const handleLogin = async (userFromApi: any) => {
        // Normalize role string
        let role = userFromApi.role;
        if (role === 'SuperAdmin') role = 'Admin';
        // Capitalize first letter to match UserRole enum
        role = role.charAt(0).toUpperCase() + role.slice(1);
        const isSuperAdmin = userFromApi.role === 'SuperAdmin';
        // Use only valid User fields
        const user: any = userFromApi;
        const appUser: User = {
            id: user?.id || user?.auth_user_id || '',
            name: user?.name || user?.full_name || '',
            email: user?.email || '',
            role: role as UserRole,
            tenantId: isSuperAdmin ? user?.tenantId : user?.tenantId,
            companyName: user?.company_name || '',
            team: user?.team || '',
            avatarUrl: user?.avatar_url || '',
            basicSalary: user?.basic_salary || 0,
            hireDate: user?.hire_date ? new Date(user?.hire_date) : new Date(),
            mobileMoneyNumber: user?.mobile_money_number || user?.mobileMoneyNumber,
        };
        console.log('[handleLogin] Mapped appUser:', appUser);
        setCurrentUser(appUser);
        if (!isSuperAdmin) {
            // Set tenant context
            if (appUser.tenantId) {
                setTenantContext(appUser.tenantId, appUser.id);
            }
        }
        // Set user in sessionStorage for persistence
        authService.setCurrentUser(appUser);
        setIsLoading(false);
    };

    const handleLogout = useCallback(async () => {
        try {
            // Call API logout to clear server-side cookies
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include', // Include cookies
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        }

        // Clear local state
        authService.logout();
        setCurrentUser(null);
    }, []);

    const unreadNotificationCount = useMemo(() => {
        if (!currentUser) return 0;
        let count = 0;
        // Announcements (only for non-admins)
        if (currentUser.role !== UserRole.ADMIN) {
            count += announcements.filter(ann => 
                ann.tenant_id === currentUser.tenantId && 
                (!ann.readBy || !ann.readBy.includes(currentUser.id))
            ).length;
        }
        // Approvals (only for users who can approve)
        if (PERMISSIONS['/approvals']?.includes(currentUser.role)) {
            count += pendingApprovalsCount;
        }
        return count;
    }, [announcements, currentUser, pendingApprovalsCount]);

    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center"><LogoIcon className="h-16 w-16 animate-pulse" /></div>;
    }

    const companyRoles = [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS, UserRole.EMPLOYEE];

    // Guard: If user is logged in but has no tenant, show error and prevent app crash/loop
    if (
        currentUser &&
        !currentUser.tenantId
    ) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-50">
                <LogoIcon className="h-16 w-16 mb-4 text-red-400" />
                <h2 className="text-2xl font-bold text-red-600 mb-2">No Company Assigned</h2>
                <p className="text-gray-700 mb-4">Your account is not assigned to any company. Please contact your administrator.</p>
                <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Logout</button>
            </div>
        );
    }

    const LoginWrapper = () => {
        return currentUser ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />;
    };

    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><LogoIcon className="h-16 w-16 animate-pulse" /></div>}>
            <Routes>
                {/* AUTH ROUTES */}
                <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
                <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <InitialLogin />} />

                {/* PROTECTED TENANT ROUTES */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute currentUser={currentUser} allowedRoles={companyRoles}>
                            <CompanyLayout 
                                currentUser={currentUser!} 
                                onLogout={handleLogout}
                                announcements={announcements}
                                onPostAnnouncement={handlePostAnnouncement}
                                onMarkAnnouncementsAsRead={handleMarkAnnouncementsAsRead}
                                unreadNotificationCount={unreadNotificationCount}
                            />
                        </ProtectedRoute>
                    }
                >
                    <Route path="dashboard" element={ currentUser && [UserRole.ADMIN, UserRole.HR].includes(currentUser.role) ? <ManagerDashboard currentUser={currentUser} onViewChange={handleViewChange} announcements={announcements} /> : <TimeClock currentUser={currentUser!} isOnline={true} announcements={announcements} /> } />
                    <Route path="leave" element={<LeaveManagement currentUser={currentUser!} />} />
                    <Route path="payslips" element={<Payslips currentUser={currentUser!} onViewChange={handleViewChange} />} />
                    <Route path="expenses" element={<Expenses currentUser={currentUser!} />} />
                    <Route path="profile" element={<Profile currentUser={currentUser!} />} />
                    <Route path="announcements" element={<Announcements currentUser={currentUser!} announcements={announcements} onPost={handlePostAnnouncement} onDelete={() => {}} onMarkAsRead={handleMarkAnnouncementsAsRead} />} />
                    <Route path="approvals" element={<ProtectedRoute currentUser={currentUser} allowedRoles={PERMISSIONS['/approvals']}><Approvals currentUser={currentUser!} /></ProtectedRoute>} />
                    <Route path="employees" element={<EmployeeManagement currentUser={currentUser!} />} />
                    <Route path="payroll" element={<MobileMoneyPayroll currentUser={currentUser!} />} />
                    <Route path="reports" element={<Reports currentUser={currentUser!} />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
                
                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Suspense>
    );
};


// Layout for the main company application

const CompanyLayout = ({ 
    currentUser, 
    onLogout, 
    announcements, 
    onPostAnnouncement, 
    onMarkAnnouncementsAsRead,
    unreadNotificationCount 
}: { 
    currentUser: User, 
    onLogout: () => void,
    announcements: Announcement[],
    onPostAnnouncement: (announcement: Announcement) => void,
    onMarkAnnouncementsAsRead: () => void,
    unreadNotificationCount: number
}) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Default modules for tenant-based system
    const defaultModules = {
        payroll: true,
        leave: true,
        expenses: true,
        reports: true,
        announcements: true
    };

    const navigationItems = useMemo(() => {
        if (!currentUser) return [];
        const modules = defaultModules;
        const allItems = [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboardIcon, enabled: true },
            { name: 'Leave', path: '/leave', icon: BriefcaseIcon, enabled: modules.leave },
            { name: 'Payslips', path: '/payslips', icon: DollarSignIcon, enabled: modules.payroll },
            { name: 'Expenses', path: '/expenses', icon: ReceiptIcon, enabled: modules.expenses },
            { name: 'Announcements', path: '/announcements', icon: MegaphoneIcon, enabled: modules.announcements, badge: unreadNotificationCount },
            { name: 'My Profile', path: '/profile', icon: UserCircleIcon, enabled: true },
            { name: 'Approvals', path: '/approvals', icon: CheckSquareIcon, enabled: true },
            { name: 'Employees', path: '/employees', icon: UsersIcon, enabled: true },
            { name: 'Payroll', path: '/payroll', icon: SmartphoneIcon, enabled: modules.payroll },
            { name: 'Reports', path: '/reports', icon: FileTextIcon, enabled: modules.reports },
            { name: 'Settings', path: '/settings', icon: CogIcon, enabled: true },
        ];
        return allItems.filter(item => item.enabled && PERMISSIONS[item.path]?.includes(currentUser.role));
    }, [currentUser]);

    const pageTitle = useMemo(() => {
        const item = navigationItems.find(navItem => navItem.path === location.pathname);
        return item ? item.name : 'Dashboard';
    }, [location.pathname, navigationItems]);

     const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
         <>
            <div className={`h-16 flex items-center justify-center border-b shrink-0 ${isCollapsed ? 'px-2' : 'px-4'}`}>
                 <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'}`}>
                    {isCollapsed ? (
                        <LogoIcon className="h-6 w-6" />
                    ) : (
                        <>
                            <LogoIcon className="h-8 w-8" />
                            <span className="text-xl font-bold text-gray-800 truncate">{currentUser.companyName || 'OPoint-P360'}</span>
                        </>
                    )}
                </div>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={`absolute ${isCollapsed ? 'right-1' : 'right-2'} top-4 p-1 rounded-lg hover:bg-gray-100 transition-colors`}
                >
                    {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
                </button>
            </div>
            <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 space-y-2 overflow-y-auto`}>
                {navigationItems.map(item => (
                    <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => {
                            // Close sidebar on mobile when clicking navigation items
                            if (window.innerWidth < 768) {
                                setIsSidebarCollapsed(true);
                            }
                        }}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-2 text-sm font-medium rounded-lg transition-colors ${
                            location.pathname === item.path
                                ? 'bg-primary-light text-primary'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={isCollapsed ? item.name : undefined}
                    >
                        <div className={`flex items-center ${isCollapsed ? '' : 'mr-3'}`}>
                            <item.icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                            {!isCollapsed && item.name}
                        </div>
                        {!isCollapsed && item.badge && item.badge > 0 && <span className="bg-primary text-white text-xs font-bold rounded-full h-5 w-5">{item.badge}</span>}
                    </Link>
                ))}
            </nav>
            <div className={`${isCollapsed ? 'px-2' : 'px-4'} py-4 border-t shrink-0`}>
                <button onClick={onLogout} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100`}>
                    <LogOutIcon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && 'Logout'}
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            {/* Mobile backdrop */}
            {!isSidebarCollapsed && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setIsSidebarCollapsed(true)}
                />
            )}
            <aside className={`bg-white border-r flex-col shrink-0 fixed md:relative z-50 md:z-auto transform transition-all duration-300 ease-in-out ${
                isSidebarCollapsed ? 'w-16 md:w-16' : 'w-64'
            } ${isSidebarCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'} ${isSidebarCollapsed ? 'hidden md:flex' : 'flex'}`}>
                <SidebarContent isCollapsed={isSidebarCollapsed}/>
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white border-b flex justify-between items-center px-6 shrink-0">
                    <div className="flex items-center space-x-4">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            {isSidebarCollapsed ? <MenuIcon className="h-5 w-5" /> : <XIcon className="h-5 w-5" />}
                        </button>
                        <h1 className="text-xl font-semibold text-gray-800 capitalize">{pageTitle}</h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        <NotificationBell 
                            count={unreadNotificationCount} 
                            onClick={() => navigate('/announcements')} 
                        />
                        <Link to="/profile" className="flex items-center space-x-3 hover:bg-slate-50 p-2 rounded-lg">
                            <span className="text-right text-sm hidden sm:block"><p className="font-semibold">{currentUser.name}</p><p className="text-gray-500">{currentUser.role}</p></span>
                            {currentUser.avatarUrl && (
                                <img src={currentUser.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full object-cover border border-gray-300" />
                            )}
                        </Link>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
                    <Outlet />
                </main>
            </div>
            <MobileBottomNav
                onNavigate={() => {
                    // Close sidebar if open on mobile when using bottom nav
                    if (window.innerWidth < 768 && !isSidebarCollapsed) {
                        setIsSidebarCollapsed(true);
                    }
                }}
            />
        </div>
    );
}

export default App;
