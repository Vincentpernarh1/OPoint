import React, { useState } from 'react';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('integrations');

    const tabs = [
        { id: 'profile', label: 'Company Profile' },
        { id: 'integrations', label: 'Integrations' },
        { id: 'billing', label: 'Billing' },
    ];

    return (
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

                    {activeTab !== 'integrations' && (
                        <div className="text-center py-12 text-gray-500">
                            <p className="font-semibold">
                                {tabs.find(t => t.id === activeTab)?.label || 'Settings'} settings coming soon.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
