import React, { useState } from 'react';
import { Company } from '../types';
import { XIcon } from './Icons';

type CompanyData = Omit<Company, 'id'>;

interface AddCompanyModalProps {
    onClose: () => void;
    onSubmit: (data: CompanyData) => void;
}

const AddCompanyModal = ({ onClose, onSubmit }: AddCompanyModalProps) => {
    const [name, setName] = useState('');
    const [licenseCount, setLicenseCount] = useState(10);
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
        onSubmit({ name, licenseCount, modules });
    };

    const moduleKeys = Object.keys(modules) as (keyof typeof modules)[];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6"/></button>
                <h3 className="text-xl font-semibold mb-4">Onboard New Company</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company Name</label>
                        <input type="text" id="companyName" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="licenseCount" className="block text-sm font-medium text-gray-700">Number of Employee Licenses</label>
                        <input type="number" id="licenseCount" value={licenseCount} onChange={e => setLicenseCount(parseInt(e.target.value, 10))} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Enabled Modules</label>
                        <div className="mt-2 grid grid-cols-2 gap-4">
                            {moduleKeys.map(key => (
                                <label key={key} className="flex items-center">
                                    <input type="checkbox" name={key} checked={modules[key]} onChange={handleModuleChange} className="h-4 w-4 text-primary border-gray-300 rounded" />
                                    <span className="ml-2 text-sm text-gray-600 capitalize">{key}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-lg">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-primary text-white rounded-lg font-bold">Add Company</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCompanyModal;
