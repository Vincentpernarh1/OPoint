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

// Import Services
import { authService } from './services/authService';
import { getCurrentTenantId, setTenantContext } from './services/database';
import db from './services/database';
import { api } from './services/api';

import { LogoIcon, LogOutIcon, LayoutDashboardIcon, BriefcaseIcon, CheckSquareIcon, UsersIcon, DollarSignIcon, MenuIcon, XIcon, FileTextIcon, MegaphoneIcon, ReceiptIcon, UserCircleIcon, SmartphoneIcon, CogIcon } from './components/Icons';

const PERMISSIONS: Record<string, UserRole[]> = {
    '/dashboard': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/leave': [UserRole.EMPLOYEE, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/payslips': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/expenses': [UserRole.EMPLOYEE, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/announcements': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/profile': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/approvals': [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS],
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

    const handlePostAnnouncement = useCallback(async (newAnnouncement: Announcement) => {
        setAnnouncements(prev => [newAnnouncement, ...prev]);
    }, []);

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
            console.log('[useEffect] Checking session...');
            try {
                const userFromCookie: any = authService.getCurrentUser();
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
                    };
                    console.log('[useEffect] Mapped appUser:', appUser);

                    if (isSuperAdmin) {
                        setCurrentUser(appUser);
                    } else {
                        // Set tenant context
                        if (appUser.tenantId) {
                            setTenantContext(appUser.tenantId, appUser.id);
                            setCurrentUser(appUser);
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
        }
    }, [currentUser?.tenantId, currentUser?.id, fetchAnnouncements]);

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
            tenantId: isSuperAdmin ? user?.tenant_id : user?.tenant_id,
            companyName: user?.company_name || '',
            team: user?.team || '',
            avatarUrl: user?.avatar_url || '',
            basicSalary: user?.basic_salary || 0,
            hireDate: user?.hire_date ? new Date(user?.hire_date) : new Date(),
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

    const handleLogout = useCallback(() => {
        authService.logout();
        setCurrentUser(null);
    }, []);

    const unreadNotificationCount = useMemo(() => {
        if (!currentUser) return 0;
        // Admins don't see unread announcement counts
        if (currentUser.role === UserRole.ADMIN) return 0;
        return announcements.filter(ann => 
            ann.tenant_id === currentUser.tenantId && 
            (!ann.readBy || !ann.readBy.includes(currentUser.id))
        ).length;
    }, [announcements, currentUser]);

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
                    <Route path="approvals" element={<Approvals currentUser={currentUser!} />} />
                    <Route path="employees" element={<EmployeeManagement currentUser={currentUser!} />} />
                    <Route path="payroll" element={<MobileMoneyPayroll />} />
                    <Route path="reports" element={<Reports />} />
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

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

     const SidebarContent = () => (
         <>
            <div className="h-16 flex items-center justify-center border-b shrink-0 px-4">
                 <div className="flex items-center space-x-2">
                    <LogoIcon className="h-8 w-8" />
                    <span className="text-xl font-bold text-gray-800 truncate">{currentUser.companyName || 'OPoint-P360'}</span>
                </div>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navigationItems.map(item => (
                    <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            location.pathname === item.path
                                ? 'bg-primary-light text-primary'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <div className="flex items-center">
                            <item.icon className="h-5 w-5 mr-3" />
                            {item.name}
                        </div>
                        {item.badge && item.badge > 0 && <span className="bg-primary text-white text-xs font-bold rounded-full h-5 w-5">{item.badge}</span>}
                    </Link>
                ))}
            </nav>
            <div className="px-4 py-4 border-t shrink-0">
                <button onClick={onLogout} className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100">
                    <LogOutIcon className="h-5 w-5 mr-3" />
                    Logout
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            {/* Mobile backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            <aside className={`w-64 bg-white border-r flex-col shrink-0 fixed md:relative z-50 md:z-auto transform transition-transform duration-300 ease-in-out ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            } ${isSidebarOpen ? 'flex' : 'hidden md:flex'}`}>
                <SidebarContent/>
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white border-b flex justify-between items-center px-6 shrink-0">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                        >
                            {isSidebarOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                        </button>
                        <h1 className="text-xl font-semibold text-gray-800 capitalize">{pageTitle}</h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        <Link to="/profile" className="flex items-center space-x-3 hover:bg-slate-50 p-2 rounded-lg">
                            <span className="text-right text-sm hidden sm:block"><p className="font-semibold">{currentUser.name}</p><p className="text-gray-500">{currentUser.role}</p></span>
                            {currentUser.avatarUrl && (
                                <img src={currentUser.avatarUrl} alt="avatar" className="h-8 w-8 rounded-full object-cover border border-gray-300" />
                            )}
                        </Link>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default App;
