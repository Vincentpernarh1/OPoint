import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, Navigate, useLocation, Outlet } from 'react-router-dom';
import { User, UserRole, Company } from './types';
import { COMPANIES } from './constants';

// Import Components with lazy loading
const Login = lazy(() => import('./components/Login'));
const InitialLogin = lazy(() => import('./components/InitialLogin'));
const TimeClock = lazy(() => import('./components/TimeClock'));
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'));
const LeaveManagement = lazy(() => import('./components/LeaveManagement'));
const Approvals = lazy(() => import('./components/Approvals'));
const EmployeeManagement = lazy(() => import('./components/EmployeeManagement'));
const Payslips = lazy(() => import('./components/Payslips'));
const Reports = lazy(() => import('./components/Reports'));
const Announcements = lazy(() => import('./components/Announcements'));
const Expenses = lazy(() => import('./components/Expenses'));
const Profile = lazy(() => import('./components/Profile'));
const MobileMoneyPayroll = lazy(() => import('./components/MobileMoneyPayroll'));
const Settings = lazy(() => import('./components/Settings'));
const AddCompanyPage = lazy(() => import('./components/AddCompanyPage'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute')); // Correctly import ProtectedRoute

// Import Services
import { authService } from './services/authService';

// Import Icons
import { LogoIcon, LogOutIcon, LayoutDashboardIcon, BriefcaseIcon, CheckSquareIcon, UsersIcon, DollarSignIcon, MenuIcon, XIcon, FileTextIcon, MegaphoneIcon, ReceiptIcon, UserCircleIcon, SmartphoneIcon, CogIcon } from './components/Icons';

const PERMISSIONS: Record<string, UserRole[]> = {
    '/dashboard': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/leave': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/payslips': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/expenses': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/announcements': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/profile': [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/approvals': [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS],
    '/employees': [UserRole.ADMIN, UserRole.HR],
    '/payroll': [UserRole.ADMIN, UserRole.PAYMENTS],
    '/reports': [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    '/settings': [UserRole.ADMIN],
};

const App = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    console.log('--- App Render ---');
    console.log('isLoading:', isLoading);
    console.log('currentUser:', currentUser);
    console.log('currentCompany:', currentCompany);

    useEffect(() => {
        setIsLoading(true);
        console.log('[useEffect] Checking session...');
        try {
            const userFromCookie: any = authService.getCurrentUser();
            console.log('[useEffect] User from cookie:', userFromCookie);
            if (userFromCookie) {
                // Normalize role string
                let role = userFromCookie.role;
                if (role === 'SuperAdmin') role = 'Super Admin';
                const isSuperAdmin = role === 'Super Admin';
                // Use only valid User fields
                const appUser: User = {
                    id: userFromCookie?.id || userFromCookie?.auth_user_id || '',
                    name: userFromCookie?.name || userFromCookie?.full_name || '',
                    email: userFromCookie?.email || '',
                    role: role as UserRole,
                    companyId: isSuperAdmin ? undefined : userFromCookie?.company_id,
                    team: userFromCookie?.team || '',
                    avatarUrl: userFromCookie?.avatar_url || '',
                    basicSalary: userFromCookie?.basic_salary || 0,
                    hireDate: userFromCookie?.hire_date ? new Date(userFromCookie?.hire_date) : new Date(),
                };
                console.log('[useEffect] Mapped appUser:', appUser);

                if (isSuperAdmin) {
                    setCurrentUser(appUser);
                } else {
                    const company = COMPANIES.find(c => c.id === appUser.companyId);
                    console.log('[useEffect] Found company:', company);
                    setCurrentUser(appUser);
                    setCurrentCompany(company || null);
                }
            } else {
                console.log('[useEffect] No active session found.');
            }
        } catch (error) {
            console.error("Session check failed:", error);
        } finally {
            console.log('[useEffect] Finished session check, setting isLoading to false.');
            setIsLoading(false);
        }
    }, []);

    const handleLogin = (userFromApi: any) => {
        console.log('[handleLogin] User from API:', userFromApi);
        // Normalize role string
        let role = userFromApi.role;
        if (role === 'SuperAdmin') role = 'Super Admin';
        const isSuperAdmin = role === 'Super Admin';
        // Use only valid User fields
        const user: any = userFromApi;
        const appUser: User = {
            id: user?.id || user?.auth_user_id || '',
            name: user?.name || user?.full_name || '',
            email: user?.email || '',
            role: role as UserRole,
            companyId: isSuperAdmin ? undefined : user?.company_id,
            team: user?.team || '',
            avatarUrl: user?.avatar_url || '',
            basicSalary: user?.basic_salary || 0,
            hireDate: user?.hire_date ? new Date(user?.hire_date) : new Date(),
        };
        console.log('[handleLogin] Mapped appUser:', appUser);

        if (isSuperAdmin) {
            setCurrentUser(appUser);
        } else {
            const company = COMPANIES.find(c => c.id === appUser.companyId);
            console.log('[handleLogin] Found company:', company);
            setCurrentUser(appUser);
            setCurrentCompany(company || null);
        }
        setIsLoading(false);
    };

    const handleLogout = useCallback(() => {
        authService.logout();
        setCurrentUser(null);
        setCurrentCompany(null);
    }, []);

    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center"><LogoIcon className="h-16 w-16 animate-pulse" /></div>;
    }

    const companyRoles = [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS, UserRole.EMPLOYEE];

    // Guard: If user is logged in but has no company, show error and prevent app crash/loop
    if (
        currentUser &&
        !currentCompany
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

    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><LogoIcon className="h-16 w-16 animate-pulse" /></div>}>
            <Routes>
                {/* AUTH ROUTES */}
                <Route path="/login/*" element={currentUser ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
                <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
                <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <InitialLogin />} />

                {/* PROTECTED COMPANY ROUTES */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute currentUser={currentUser} allowedRoles={companyRoles}>
                            <CompanyLayout currentUser={currentUser!} currentCompany={currentCompany!} onLogout={handleLogout} />
                        </ProtectedRoute>
                    }
                >
                    <Route path="dashboard" element={ currentUser && [UserRole.ADMIN, UserRole.HR].includes(currentUser.role) ? <ManagerDashboard currentUser={currentUser} onViewChange={() => {}} /> : <TimeClock currentUser={currentUser!} isOnline={true} /> } />
                    <Route path="leave" element={<LeaveManagement currentUser={currentUser!} />} />
                    <Route path="payslips" element={<Payslips currentUser={currentUser!} onViewChange={() => {}} />} />
                    <Route path="expenses" element={<Expenses currentUser={currentUser!} />} />
                    <Route path="profile" element={<Profile currentUser={currentUser!} />} />
                    <Route path="announcements" element={<Announcements currentUser={currentUser!} announcements={[]} onPost={()=>{}} onMarkAsRead={()=>{}} />} />
                    <Route path="approvals" element={<Approvals />} />
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
const CompanyLayout = ({ currentUser, currentCompany, onLogout }: { currentUser: User, currentCompany: Company, onLogout: () => void }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const navigationItems = useMemo(() => {
        if (!currentUser || !currentCompany) return [];
        const modules = currentCompany.modules;
        const allItems = [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboardIcon, enabled: true },
            { name: 'Leave', path: '/leave', icon: BriefcaseIcon, enabled: modules.leave },
            { name: 'Payslips', path: '/payslips', icon: DollarSignIcon, enabled: modules.payroll },
            { name: 'Expenses', path: '/expenses', icon: ReceiptIcon, enabled: modules.expenses },
            { name: 'Announcements', path: '/announcements', icon: MegaphoneIcon, enabled: modules.announcements, badge: 0 },
            { name: 'My Profile', path: '/profile', icon: UserCircleIcon, enabled: true },
            { name: 'Approvals', path: '/approvals', icon: CheckSquareIcon, enabled: true },
            { name: 'Employees', path: '/employees', icon: UsersIcon, enabled: true },
            { name: 'Payroll', path: '/payroll', icon: SmartphoneIcon, enabled: modules.payroll },
            { name: 'Reports', path: '/reports', icon: FileTextIcon, enabled: modules.reports },
            { name: 'Settings', path: '/settings', icon: CogIcon, enabled: true },
        ];
        return allItems.filter(item => item.enabled && PERMISSIONS[item.path]?.includes(currentUser.role));
    }, [currentUser, currentCompany]);

    const pageTitle = useMemo(() => {
        const item = navigationItems.find(navItem => navItem.path === location.pathname);
        return item ? item.name : 'Dashboard';
    }, [location.pathname, navigationItems]);

     const SidebarContent = () => (
         <>
            <div className="h-16 flex items-center justify-center border-b shrink-0 px-4">
                 <div className="flex items-center space-x-2">
                    <LogoIcon className="h-8 w-8" />
                    <span className="text-xl font-bold text-gray-800 truncate">{currentCompany?.name || 'Vpena Opoint'}</span>
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
            <aside className="w-64 bg-white border-r flex-col hidden md:flex shrink-0"><SidebarContent/></aside>
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white border-b flex justify-between items-center px-6 shrink-0">
                    <div className="flex items-center">
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
