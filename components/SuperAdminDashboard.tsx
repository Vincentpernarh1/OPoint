import React, { useState } from 'react';
import { User, Company } from '../types';
import { COMPANIES } from '../constants';
import { LogoIcon, LogOutIcon, BuildingOfficeIcon, UsersIcon, CheckCircleIcon, XIcon, CogIcon } from './Icons';
import AddCompanyModal from './AddCompanyModal';
import Notification from './Notification';

interface SuperAdminDashboardProps {
    currentUser: User;
    onLogout: () => void;
}

const SuperAdminDashboard = ({ currentUser, onLogout }: SuperAdminDashboardProps) => {
    const [companies, setCompanies] = useState<Company[]>(COMPANIES);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    const handleAddCompany = (newCompanyData: Omit<Company, 'id'>) => {
        const newCompany: Company = {
            ...newCompanyData,
            id: `c${Date.now()}`,
        };
        setCompanies(prev => [...prev, newCompany]);
        setIsModalOpen(false);
        setNotification(`Company "${newCompany.name}" onboarded successfully!`);
    };

    const ModuleStatus = ({ name, enabled }: { name: string, enabled: boolean }) => (
        <div className="flex items-center text-xs">
            {enabled ? <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1.5" /> : <XIcon className="h-4 w-4 text-gray-400 mr-1.5" />}
            <span className={enabled ? 'text-gray-700' : 'text-gray-500'}>{name}</span>
        </div>
    );

    return (
        <>
            {isModalOpen && <AddCompanyModal onClose={() => setIsModalOpen(false)} onSubmit={handleAddCompany} />}
            {notification && <Notification message={notification} type="success" onClose={() => setNotification(null)} />}
            <div className="min-h-screen bg-slate-100">
                <header className="bg-white shadow-md h-16 flex items-center justify-between px-6">
                    <div className="flex items-center space-x-2">
                        <LogoIcon className="h-8 w-8" />
                        <span className="text-xl font-bold text-gray-800">Super Admin Portal</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="font-semibold text-sm">{currentUser.name}</p>
                            <p className="text-xs text-gray-500">{currentUser.role}</p>
                        </div>
                        <button onClick={onLogout} className="flex items-center space-x-2 text-sm text-gray-600 hover:text-primary">
                            <LogOutIcon className="h-5 w-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </header>

                <main className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">Client Companies</h1>
                        <button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg">
                            Add New Company
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {companies.map(company => (
                            <div key={company.id} className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center mb-4">
                                        <BuildingOfficeIcon className="h-6 w-6 mr-3 text-primary" />
                                        <h2 className="text-lg font-bold text-gray-800">{company.name}</h2>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600 bg-slate-50 p-2 rounded-md">
                                        <UsersIcon className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>{company.licenseCount} Licenses</span>
                                    </div>
                                </div>
                                <div className="mt-6 border-t pt-4">
                                    <h3 className="text-sm font-semibold text-gray-600 mb-3">Enabled Modules</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ModuleStatus name="Payroll" enabled={company.modules.payroll} />
                                        <ModuleStatus name="Leave" enabled={company.modules.leave} />
                                        <ModuleStatus name="Expenses" enabled={company.modules.expenses} />
                                        <ModuleStatus name="Reports" enabled={company.modules.reports} />
                                        <ModuleStatus name="Announcements" enabled={company.modules.announcements} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </>
    );
};

export default SuperAdminDashboard;