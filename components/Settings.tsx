import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import './Settings.css';
import MessageOverlay from './MessageOverlay';

const Settings = ({ currentUser }: { currentUser: User }) => {
    const [activeTab, setActiveTab] = useState('working-hours');
    const [workingHours, setWorkingHours] = useState('8.00');
    const [breakDuration, setBreakDuration] = useState('60');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const tabs = [
        { id: 'working-hours', label: 'Working Hours' },
        { id: 'profile', label: 'Company Profile' },
        { id: 'integrations', label: 'Integrations' },
        { id: 'billing', label: 'Billing' },
    ];

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
            setBreakDuration(settings.break_duration_minutes?.toString() || '60');
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
            await api.updateCompanySettings(currentUser.tenantId, { 
                workingHoursPerDay: parseFloat(workingHours),
                break_duration_minutes: parseInt(breakDuration)
            });
            setMessage({ type: 'success', text: 'Settings updated successfully!' });
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage({ type: 'error', text: 'Failed to update settings' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="space-y-8 max-w-6xl mx-auto">
                {/* Modern Header Section */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-8 shadow-2xl">
                    <div className="relative z-10">
                        <h1 className="text-4xl font-extrabold text-white mb-2">Company Settings</h1>
                        <p className="text-primary-light text-lg opacity-90">
                            Configure and optimize your organization's workspace
                        </p>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mb-20"></div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Modern Tab Navigation */}
                    <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <nav className="flex space-x-1 px-6 py-4" aria-label="Tabs">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300
                                        ${activeTab === tab.id 
                                            ? 'bg-primary text-white shadow-lg transform scale-105' 
                                            : 'text-gray-600 hover:text-primary hover:bg-primary/5'
                                        }
                                    `}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-8">
                        {activeTab === 'working-hours' && (
                            <div className="animate-fade-in space-y-8">
                                {/* Section Header */}
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg">
                                        <span className="text-2xl">⏰</span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Working Hours & Breaks</h2>
                                        <p className="text-gray-600 mt-1">
                                            Define your company's work schedule to ensure accurate time tracking and payroll processing
                                        </p>
                                    </div>
                                </div>

                                {/* Settings Form */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Working Hours Card */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center mb-4">
                                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                                                <span className="text-white text-xl">📊</span>
                                            </div>
                                            <label htmlFor="working-hours" className="text-lg font-bold text-gray-900">
                                                Daily Working Hours
                                            </label>
                                        </div>
                                        <div className="relative">
                                            <input
                                                id="working-hours"
                                                type="text"
                                                inputMode="decimal"
                                                value={workingHours}
                                                onChange={(e) => {
                                                    let value = e.target.value;
                                                    value = value.replace(/,/g, '.');
                                                    if (/^\d*\.?\d*$/.test(value)) {
                                                        setWorkingHours(value);
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    const num = parseFloat(workingHours);
                                                    if (isNaN(num) || num < 1 || num > 24) {
                                                        setWorkingHours('8.00');
                                                    } else {
                                                        setWorkingHours(num.toFixed(2));
                                                    }
                                                }}
                                                className="block w-full px-4 py-3 pr-20 text-lg font-semibold border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white shadow-sm"
                                                disabled={loading}
                                                placeholder="8.0"
                                                lang="en"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                <span className="text-blue-600 font-medium">hours</span>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 flex items-center">
                                            <span className="mr-2">💡</span>
                                            Standard workday: 1.0 - 24.0 hours (recommended: 8.0)
                                        </p>
                                    </div>

                                    {/* Break Duration Card */}
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center mb-4">
                                            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center mr-3">
                                                <span className="text-white text-xl">☕</span>
                                            </div>
                                            <label htmlFor="break-duration" className="text-lg font-bold text-gray-900">
                                                Auto Break Deduction
                                            </label>
                                        </div>
                                        <div className="relative">
                                            <input
                                                id="break-duration"
                                                type="number"
                                                value={breakDuration}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (/^\d*$/.test(value)) {
                                                        setBreakDuration(value);
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    const num = parseInt(breakDuration);
                                                    if (isNaN(num) || num < 0 || num > 240) {
                                                        setBreakDuration('60');
                                                    } else {
                                                        setBreakDuration(num.toString());
                                                    }
                                                }}
                                                className="block w-full px-4 py-3 pr-24 text-lg font-semibold border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white shadow-sm"
                                                disabled={loading}
                                                placeholder="60"
                                                min="0"
                                                max="240"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                <span className="text-amber-600 font-medium">minutes</span>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 flex items-center">
                                            <span className="mr-2">💡</span>
                                            Applied to single-session days (0-240 min)
                                        </p>
                                    </div>
                                </div>

                                {/* Impact Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-xl">
                                        <div className="flex items-center mb-3">
                                            <span className="text-3xl mr-3">💰</span>
                                            <h4 className="text-lg font-bold">Payroll Impact</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-blue-100 text-sm">Expected monthly hours</p>
                                            <p className="text-4xl font-extrabold">{Math.round(parseFloat(workingHours) * 22)}</p>
                                            <p className="text-blue-100 text-xs">
                                                Based on {workingHours} hrs/day × 22 working days
                                            </p>
                                            <div className="pt-3 mt-3 border-t border-blue-400">
                                                <p className="text-xs text-blue-100">
                                                    ✓ Automatic payroll calculations<br/>
                                                    ✓ Overtime tracking enabled
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-2xl text-white shadow-xl">
                                        <div className="flex items-center mb-3">
                                            <span className="text-3xl mr-3">⚡</span>
                                            <h4 className="text-lg font-bold">Break Policy</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                                                <p className="text-xs font-semibold mb-1">Single Session Days</p>
                                                <p className="text-2xl font-bold">-{breakDuration} min</p>
                                                <p className="text-xs text-amber-100 mt-1">Auto-deducted</p>
                                            </div>
                                            <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                                                <p className="text-xs font-semibold mb-1">Multiple Session Days</p>
                                                <p className="text-sm font-bold">No deduction</p>
                                                <p className="text-xs text-amber-100 mt-1">Clock in/out tracked</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={saveWorkingHours}
                                        disabled={saving || loading}
                                        className="group relative bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-bold py-4 px-10 rounded-xl shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                                    >
                                        <span className="flex items-center">
                                            {saving ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="mr-2">💾</span>
                                                    Save Settings
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'integrations' && (
                            <div className="animate-fade-in space-y-8">
                                {/* Section Header */}
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <span className="text-2xl">🔌</span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Payment Integrations</h2>
                                        <p className="text-gray-600 mt-1">
                                            Connect payment providers to streamline payroll disbursements
                                        </p>
                                    </div>
                                </div>

                                {/* MTN MoMo Card */}
                                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-8 border-2 border-yellow-200 shadow-md">
                                    <div className="flex items-center mb-6">
                                        <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                                            <span className="text-3xl">📱</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">MTN Mobile Money</h3>
                                            <p className="text-sm text-gray-600">Instant payroll disbursement via MoMo API</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="momo-key" className="block text-sm font-bold text-gray-700 mb-2">
                                                API Key
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <span className="text-2xl">🔒</span>
                                                </div>
                                                <input
                                                    id="momo-key"
                                                    type="password"
                                                    disabled
                                                    value="************************"
                                                    className="block w-full px-4 py-3 pl-14 border-2 border-gray-300 rounded-xl bg-gray-100 cursor-not-allowed text-gray-500 font-mono"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-blue-100 border border-blue-300 rounded-xl p-4">
                                            <p className="text-sm text-blue-800 font-medium flex items-center">
                                                <span className="mr-2">ℹ️</span>
                                                Coming Soon: Full MoMo integration for automated payments
                                            </p>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                disabled
                                                className="bg-gray-300 text-gray-500 font-bold py-3 px-8 rounded-xl cursor-not-allowed shadow-sm"
                                            >
                                                Save Configuration
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab !== 'working-hours' && activeTab !== 'integrations' && (
                            <div className="text-center py-20">
                                <div className="inline-block">
                                    <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                                        <span className="text-5xl">🚧</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                        {tabs.find(t => t.id === activeTab)?.label || 'Settings'}
                                    </h3>
                                    <p className="text-gray-500 text-lg">
                                        Feature in development. Check back soon!
                                    </p>
                                </div>
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
