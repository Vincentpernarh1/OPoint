import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import './Settings.css';
import MessageOverlay from './MessageOverlay';

const Settings = ({ currentUser }: { currentUser: User }) => {
    const [activeTab, setActiveTab] = useState('working-hours');
    const [workingHours, setWorkingHours] = useState('8.00');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const tabs = [
        { id: 'working-hours', label: 'Working Hours' },
        { id: 'profile', label: 'Company Profile' },
        { id: 'integrations', label: 'Integrations' },
        { id: 'billing', label: 'Billing' },
    ];

    // Get current user from props
    // const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (activeTab === 'working-hours' && currentUser?.tenantId) {
            loadCompanySettings();
        }
    }, [activeTab, currentUser?.tenantId]);

    const loadCompanySettings = async () => {
        if (!currentUser?.tenantId) return;

        setLoading(true);
        try {
            const settings = await api.getCompanySettings(currentUser.tenantId);
            setWorkingHours(settings.workingHoursPerDay?.toFixed(2) || '8.00');
        } catch (error) {
            console.error('Failed to load company settings:', error);
            setMessage({ type: 'error', text: 'Failed to load company settings' });
        } finally {
            setLoading(false);
        }
    };

    const saveWorkingHours = async () => {
        if (!currentUser?.tenantId) return;

        setSaving(true);
        setMessage(null);

        try {
            await api.updateCompanySettings(currentUser.tenantId, { workingHoursPerDay: parseFloat(workingHours) });
            setMessage({ type: 'success', text: 'Working hours updated successfully!' });
        } catch (error) {
            console.error('Failed to save working hours:', error);
            setMessage({ type: 'error', text: 'Failed to update working hours' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Company Settings</h1>
                <p className="text-gray-500 mt-1">Manage your company's configuration and integrations.</p>
            </div>

            <div className="bg-white p-2 rounded-xl shadow-lg">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-4" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="border-b-2 font-medium text-sm"
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'working-hours' && (
                        <div className="animate-fade-in">
                            <h2 className="text-xl font-bold text-gray-800">Working Hours Configuration</h2>
                            <p className="text-sm text-gray-500 mt-1 mb-6">
                                Set the standard working hours per day for your company. This affects payroll calculations and time tracking.
                            </p>


                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label htmlFor="working-hours" className="block text-sm font-medium text-gray-700">
                                        Working Hours Per Day
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <input
                                            id="working-hours"
                                            type="text"
                                            inputMode="decimal"
                                            value={workingHours}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                // Replace commas with periods to ensure consistent decimal separator
                                                value = value.replace(/,/g, '.');
                                                // Allow only numbers and one decimal point
                                                if (/^\d*\.?\d*$/.test(value)) {
                                                    setWorkingHours(value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                // Ensure valid value on blur
                                                const num = parseFloat(workingHours);
                                                if (isNaN(num) || num < 1 || num > 24) {
                                                    setWorkingHours('8.00');
                                                } else {
                                                    setWorkingHours(num.toFixed(2));
                                                }
                                            }}
                                            className="block w-full px-3 py-2 pr-16 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                                            disabled={loading}
                                            placeholder="8.0"
                                            lang="en"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            <span className="text-gray-500 text-sm">hours</span>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Range: 1.0 - 24.0 hours (default: 8.0). Use period (.) for decimals.
                                    </p>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-md">
                                    <h4 className="text-sm font-medium text-blue-800 mb-2">Payroll Impact</h4>
                                    <p className="text-xs text-blue-700">
                                        Setting {workingHours} hours/day means employees are expected to work approximately {Math.round(parseFloat(workingHours) * 26)} hours per month.
                                        Pay will be calculated based on actual hours worked vs. this standard.
                                    </p>
                                </div>

                                <div className="text-right">
                                    <button
                                        onClick={saveWorkingHours}
                                        disabled={saving || loading}
                                        className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div className="animate-fade-in">
                            <h2 className="text-xl font-bold text-gray-800">Mobile Money (MoMo)</h2>
                            <p className="text-sm text-gray-500 mt-1 mb-6">
                                Connect your MTN MoMo API to enable direct payroll payments from the app.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="momo-key" className="block text-sm font-medium text-gray-700">
                                        API Key
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <div className="h-5 w-5 text-gray-400">🔒</div>
                                        </div>
                                        <input
                                            id="momo-key"
                                            type="password"
                                            disabled
                                            value="************************"
                                            className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="text-right">
                                    <button
                                        disabled
                                        className="bg-gray-300 text-white font-bold py-2 px-4 rounded-lg cursor-not-allowed"
                                    >
                                        Save Configuration
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab !== 'working-hours' && activeTab !== 'integrations' && (
                        <div className="text-center py-12 text-gray-500">
                            <p className="font-semibold">
                                {tabs.find(t => t.id === activeTab)?.label || 'Settings'} settings coming soon.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            </div>
            <MessageOverlay message={message} onClose={() => setMessage(null)} />
        </>
    );
};

export default Settings;
