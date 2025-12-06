
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { User, View, UserRole, Company, Announcement } from './types';
import { USERS, SUPER_ADMIN_USER, COMPANIES, ANNOUNCEMENTS as initialAnnouncements } from './constants';
import InitialLogin from './components/InitialLogin';
import SuperAdminLogin from './components/SuperAdminLogin';
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import TimeClock from './components/TimeClock';
import ManagerDashboard from './components/ManagerDashboard';
import LeaveManagement from './components/LeaveManagement';
import Approvals from './components/Approvals';
import EmployeeManagement from './components/EmployeeManagement';
import Payslips from './components/Payslips';
import Reports from './components/Reports';
import Announcements from './components/Announcements';
import Expenses from './components/Expenses';
import Profile from './components/Profile';
import MobileMoneyPayroll from './components/MobileMoneyPayroll';
import Settings from './components/Settings';
import { LogoIcon, LogOutIcon, LayoutDashboardIcon, BriefcaseIcon, CheckSquareIcon, UsersIcon, DollarSignIcon, MenuIcon, XIcon, FileTextIcon, MegaphoneIcon, ReceiptIcon, UserCircleIcon, SmartphoneIcon, CogIcon, SearchIcon } from './components/Icons';
import { api, InAppNotification } from './services/api';

type AppState = 'loading' | 'login_choice' | 'company_login' | 'superadmin_login' | 'company_app' | 'superadmin_app';

const PERMISSIONS: Record<View, UserRole[]> = {
    dashboard: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    leave: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    payslips: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    expenses: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    announcements: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    profile: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    approvals: [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS],
    employees: [UserRole.ADMIN, UserRole.HR],
    payroll: [UserRole.ADMIN, UserRole.PAYMENTS],
    reports: [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS],
    settings: [UserRole.ADMIN],
};

// Notification Bell Icon Component
const BellIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
);


const App = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [appState, setAppState] = useState<AppState>('loading');
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
    
    // Notification State
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Initial load and event listeners
    useEffect(() => {
        // Session Persistence
        const savedUserJSON = localStorage.getItem('currentUser');
        if (savedUserJSON) {
            const user: User = JSON.parse(savedUserJSON);
            const company = COMPANIES.find(c => c.id === user.companyId);
            if (user && company) {
                setCurrentUser(user);
                setCurrentCompany(company);
                setAppState('company_app');
                setCurrentView('dashboard');
            } else {
                 setAppState('login_choice');
            }
        } else {
            setAppState('login_choice');
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Click outside to close notifications
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        // Request notification permission
        if ('Notification' in window) {
            Notification.requestPermission();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Polling for Notifications
    useEffect(() => {
        if (!currentUser) return;
        
        const fetchNotifications = () => {
            const notifs = api.getNotifications(currentUser);
            setNotifications(notifs);
        };

        fetchNotifications(); // Fetch immediately
        const interval = setInterval(fetchNotifications, 5000); // Poll every 5s

        return () => clearInterval(interval);
    }, [currentUser]);
    
    const handleSetLoginMode = (mode: 'company' | 'superadmin') => {
        setAppState(mode === 'company' ? 'company_login' : 'superadmin_login');
    };

    const handleCompanyLogin = useCallback((email: string, password: string): boolean => {
        const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (user && user.companyId) {
            const company = COMPANIES.find(c => c.id === user.companyId);
            if (company) {
                localStorage.setItem('currentUser', JSON.stringify(user));
                setCurrentUser(user);
                setCurrentCompany(company);
                setAppState('company_app');
                setCurrentView('dashboard');
                return true;
            }
        }
        return false;
    }, []);
    
    const handleSuperAdminLogin = useCallback((email: string, password: string): boolean => {
        if (email.toLowerCase() === SUPER_ADMIN_USER.email.toLowerCase() && password === SUPER_ADMIN_USER.password) {
            setCurrentUser(SUPER_ADMIN_USER);
            setAppState('superadmin_app');
            return true;
        }
        return false;
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
        setCurrentCompany(null);
        setAppState('login_choice');
    }, []);

    const handleSetView = (view: View) => {
        setCurrentView(view);
        setIsSidebarOpen(false); // Close sidebar on navigation
    };
    
    const handlePostAnnouncement = useCallback((newAnnouncement: Announcement) => {
        setAnnouncements(prev => [newAnnouncement, ...prev]);
    }, []);

    const handleMarkAnnouncementsAsRead = useCallback(() => {
        setAnnouncements(prev => {
            if (prev.some(ann => !ann.isRead)) {
                return prev.map(ann => ({ ...ann, isRead: true }));
            }
            return prev;
        });
    }, []);
    
    const unreadAnnouncementsCount = useMemo(() => {
        return announcements.filter(ann => !ann.isRead).length;
    }, [announcements]);

    const unreadNotificationsCount = useMemo(() => {
        return notifications.filter(n => !n.read).length;
    }, [notifications]);

    const handleMarkNotificationsRead = () => {
        if(isNotificationOpen) {
             setIsNotificationOpen(false);
        } else {
             setIsNotificationOpen(true);
             // Mark as read when opening (mock update)
             setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    };

    const navigationItems = useMemo(() => {
        if (!currentUser || !currentCompany || currentUser.role === UserRole.SUPER_ADMIN) return [];

        const modules = currentCompany.modules;

        const allItems = [
            { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboardIcon, enabled: true },
            // Employee-level pages removed - admins use employee login for these:
            // { name: 'Leave', view: 'leave', icon: BriefcaseIcon, enabled: modules.leave },
            // { name: 'Expenses', view: 'expenses', icon: ReceiptIcon, enabled: modules.expenses },
            // { name: 'My Profile', view: 'profile', icon: UserCircleIcon, enabled: true },
            
            // Admin pages:
            { name: 'Approvals', view: 'approvals', icon: CheckSquareIcon, enabled: true },
            { name: 'Employees', view: 'employees', icon: UsersIcon, enabled: true },
            { name: 'Payslips', view: 'payslips', icon: DollarSignIcon, enabled: modules.payroll },
            { name: 'Payroll', view: 'payroll', icon: SmartphoneIcon, enabled: modules.payroll },
            { name: 'Reports', view: 'reports', icon: FileTextIcon, enabled: modules.reports },
            { name: 'Announcements', view: 'announcements', icon: MegaphoneIcon, enabled: modules.announcements, badge: unreadAnnouncementsCount },
            { name: 'Settings', view: 'settings', icon: CogIcon, enabled: true },
        ];
        
        return allItems.filter(item => item.enabled && PERMISSIONS[item.view as View]?.includes(currentUser.role));

    }, [currentUser, currentCompany, unreadAnnouncementsCount]);
    
    if (appState === 'loading') {
        return <div className="h-screen w-screen flex items-center justify-center"><LogoIcon className="h-16 w-16 animate-pulse" /></div>;
    }
    if (appState === 'login_choice') {
        return <InitialLogin onSelectMode={handleSetLoginMode} />;
    }
    if (appState === 'company_login') {
        return <Login onLogin={handleCompanyLogin} />;
    }
    if (appState === 'superadmin_login') {
        return <SuperAdminLogin onLogin={handleSuperAdminLogin} />;
    }
    if (appState === 'superadmin_app' && currentUser) {
        return <SuperAdminDashboard currentUser={currentUser} onLogout={handleLogout} />;
    }
    if (!currentUser || !currentCompany) {
        return <InitialLogin onSelectMode={handleSetLoginMode} />;
    }

    const isAdminRole = [UserRole.ADMIN, UserRole.HR, UserRole.OPERATIONS, UserRole.PAYMENTS].includes(currentUser.role);

    const renderView = () => {
        switch (currentView) {
            case 'dashboard': return isAdminRole ? <ManagerDashboard currentUser={currentUser} onViewChange={handleSetView} /> : <TimeClock currentUser={currentUser} isOnline={isOnline} />;
            case 'leave': return <LeaveManagement currentUser={currentUser} />;
            case 'payslips': return <Payslips currentUser={currentUser} onViewChange={handleSetView} />;
            case 'expenses': return <Expenses currentUser={currentUser} />;
            case 'profile': return <Profile currentUser={currentUser} />;
            case 'announcements': return <Announcements currentUser={currentUser} announcements={announcements} onPost={handlePostAnnouncement} onMarkAsRead={handleMarkAnnouncementsAsRead} />;
            case 'approvals': return <Approvals />;
            case 'employees': return <EmployeeManagement currentUser={currentUser} />;
            case 'payroll': return <MobileMoneyPayroll />;
            case 'reports': return <Reports />;
            case 'settings': return <Settings />;
            default: return isAdminRole ? <ManagerDashboard currentUser={currentUser} onViewChange={handleSetView} /> : <TimeClock currentUser={currentUser} isOnline={isOnline} />;
        }
    };
    
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
                    <button
                        key={item.name}
                        onClick={() => handleSetView(item.view as View)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentView === item.view
                                ? 'bg-primary-light text-primary'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <div className="flex items-center">
                            <item.icon className="h-5 w-5 mr-3" />
                            {item.name}
                        </div>
                        {item.badge && item.badge > 0 && (
                            <span className="bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </nav>
            <div className="px-4 py-4 border-t shrink-0">
                <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100">
                    <LogOutIcon className="h-5 w-5 mr-3" />
                    Logout
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
             {/* Mobile Sidebar */}
            <div className={`fixed inset-0 z-40 flex md:hidden ${isSidebarOpen ? '' : 'pointer-events-none'}`}>
                <div 
                    className={`fixed inset-0 bg-black transition-opacity ${isSidebarOpen ? 'opacity-50' : 'opacity-0'}`}
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
                <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition-transform ease-in-out duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                        <button
                          onClick={() => setIsSidebarOpen(false)}
                          className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        >
                          <span className="sr-only">Close sidebar</span>
                          <XIcon className="h-6 w-6 text-white" />
                        </button>
                    </div>
                   <SidebarContent />
                </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className="w-64 bg-white border-r flex-col hidden md:flex shrink-0">
                <SidebarContent/>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-gradient-to-r from-white to-slate-50 border-b flex justify-between items-center px-6 shrink-0 relative">
                    <div className="flex items-center">
                         <button onClick={() => setIsSidebarOpen(true)} className="md:hidden mr-4 text-gray-500 hover:text-gray-700">
                            <MenuIcon className="h-6 w-6" />
                        </button>
                        <h1 className="text-xl font-semibold text-gray-800 capitalize">{currentView}</h1>
                    </div>
                     {!isOnline && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-yellow-400 text-yellow-900 text-xs font-semibold px-3 py-1 rounded-full shadow animate-pulse">
                            Offline Mode
                        </div>
                    )}
                    <div className="flex items-center space-x-3 md:space-x-6">
                        {/* Notification Bell */}
                        <div className="relative" ref={notificationRef}>
                            <button onClick={handleMarkNotificationsRead} className="p-2 text-gray-500 hover:text-primary transition-colors relative">
                                <BellIcon />
                                {unreadNotificationsCount > 0 && (
                                    <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>
                            
                            {/* Notification Dropdown */}
                            {isNotificationOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 animate-fade-in-down overflow-hidden">
                                    <div className="p-4 border-b bg-slate-50">
                                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map(n => (
                                                <div key={n.id} className={`p-4 border-b last:border-b-0 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-indigo-50/50' : ''}`}>
                                                    <p className="text-sm text-gray-800">{n.message}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{n.timestamp.toLocaleTimeString()}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-gray-500 text-sm">No notifications</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => setCurrentView(prev => prev === 'profile' ? 'dashboard' : 'profile')}
                            className="flex items-center space-x-3 hover:bg-slate-50 p-2 rounded-lg transition-colors focus:outline-none"
                        >
                            <span className="text-right text-sm hidden sm:block">
                                <p className="font-semibold">{currentUser.name}</p>
                                <p className="text-gray-500">{currentUser.role}</p>
                            </span>
                            <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-10 w-10 rounded-full" />
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

export default App;
