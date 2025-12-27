import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { NewCompanyData } from '../types';
import { api } from '../services/api';
import { UserCircleIcon, MailIcon, ArrowLeftIcon, BuildingOfficeIcon } from './Icons';
import Notification from './Notification';

const AddCompanyPage = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [licenseCount, setLicenseCount] = useState(10);
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [modules, setModules] = useState({
        payroll: true,
        leave: true,
        expenses: true,
        reports: true,
        announcements: true,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleModuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setModules(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        const data: NewCompanyData = { name, licenseCount, workingHoursPerDay: 8, modules, adminName, adminEmail };

        try {
            const result = await api.createCompanyAndAdmin(data);
            setSuccess(`Company "${result.company.name}" and admin "${result.user.name}" onboarded successfully!`);
            // Optionally navigate away or clear form after a delay
            setTimeout(() => navigate('/superadmin'), 2000);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const moduleKeys = Object.keys(modules) as (keyof typeof modules)[];

    return (
        <div className="min-h-screen bg-slate-100">
             {success && <Notification message={success} type="success" onClose={() => setSuccess(null)} />}
             {error && <Notification message={error} type="error" onClose={() => setError(null)} />}
            <header className="bg-white shadow-sm p-4">
                 <Link to="/superadmin" className="flex items-center text-sm text-gray-600 hover:text-primary">
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Back to Dashboard
                </Link>
            </header>
            <main className="p-8">
                <div className="max-w-4xl mx-auto">
                     <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg">
                        <div className="p-8">
                            <div className="flex items-center mb-6">
                                <BuildingOfficeIcon className="h-8 w-8 mr-4 text-primary"/>
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-800">Onboard New Company</h1>
                                    <p className="text-gray-500 mt-1">Create a new client company and their first administrator account.</p>
                                </div>
                            </div>
                            <fieldset disabled={isLoading} className="space-y-6">
                                <div className="border-t border-b border-gray-200 py-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    {/* Column 1: Company Info */}
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-700">Company Details</h3>
                                        <div>
                                            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company Name</label>
                                            <input type="text" id="companyName" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100" />
                                        </div>
                                        <div>
                                            <label htmlFor="licenseCount" className="block text-sm font-medium text-gray-700">Employee Licenses</label>
                                            <input type="number" id="licenseCount" value={licenseCount} onChange={e => setLicenseCount(parseInt(e.target.value, 10))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100" />
                                        </div>
                                    </div>
                                    {/* Column 2: Admin Info */}
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-700">Administrator Account</h3>
                                        <div>
                                            <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">Administrator Name</label>
                                            <div className="mt-1 relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserCircleIcon className="h-5 w-5 text-gray-400" /></div>
                                                <input type="text" id="adminName" value={adminName} onChange={e => setAdminName(e.target.value)} required placeholder="e.g., Jane Doe" className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100" />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">Administrator Email</label>
                                            <div className="mt-1 relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MailIcon className="h-5 w-5 text-gray-400" /></div>
                                                <input type="email" id="adminEmail" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required placeholder="admin@company.com" className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-lg font-medium text-gray-700">Enabled Modules</label>
                                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {moduleKeys.map(key => (
                                            <label key={key} className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors border">
                                                <input type="checkbox" name={key} checked={modules[key]} onChange={handleModuleChange} className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary disabled:bg-gray-100" />
                                                <span className="ml-3 text-sm font-medium text-gray-800 capitalize">{key}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                        <div className="bg-gray-50 px-8 py-4 flex justify-end items-center rounded-b-xl border-t">
                            <div className="flex space-x-4">
                                <Link to="/superadmin" className="py-2 px-5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancel</Link>
                                <button type="submit" disabled={isLoading} className="py-2 px-5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors shadow-sm w-52 text-center disabled:bg-indigo-300 disabled:cursor-not-allowed">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                            <span>Onboarding...</span>
                                        </div>
                                    ) : (
                                        'Add Company & Create Admin'
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AddCompanyPage;
