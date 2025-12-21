import React, { useState } from 'react';
import { NewCompanyData } from '../types';
import { XIcon, UserCircleIcon, MailIcon } from './Icons';

interface AddCompanyModalProps {
    onClose: () => void;
    onSubmit: (data: NewCompanyData) => void;
    isLoading: boolean;
    error: string | null;
}

const AddCompanyModal = ({ onClose, onSubmit, isLoading, error }: AddCompanyModalProps) => {
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

    const handleModuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setModules(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        onSubmit({ name, licenseCount, modules, adminName, adminEmail });
    };

    const moduleKeys = Object.keys(modules) as (keyof typeof modules)[];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-8">
                        <button title="Close" onClick={onClose} disabled={isLoading} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"><XIcon className="h-6 w-6"/></button>
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Onboard New Company</h3>
                            <p className="text-gray-500 mb-6">Enter company details and create the initial administrator account.</p>
                        </div>
                        <fieldset disabled={isLoading} className="space-y-6">
                            <div className="border-t border-b border-gray-200 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Column 1: Company Info */}
                                <div className="space-y-6">
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
                                <label className="block text-sm font-medium text-gray-700">Enabled Modules</label>
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {moduleKeys.map(key => (
                                        <label key={key} className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                                            <input type="checkbox" name={key} checked={modules[key]} onChange={handleModuleChange} className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary disabled:bg-gray-100" />
                                            <span className="ml-3 text-sm text-gray-700 capitalize">{key}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className="bg-gray-50 px-8 py-4 flex justify-between items-center rounded-b-lg">
                         <div className="text-sm text-red-600">
                            {error && (
                                <p role="alert">{error}</p>
                            )}
                        </div>
                        <div className="flex space-x-4">
                            <button type="button" onClick={onClose} disabled={isLoading} className="py-2 px-5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50">Cancel</button>
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
        </div>
    );
};

export default AddCompanyModal;