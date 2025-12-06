import React, { useState } from 'react';
import { LogoIcon, MailIcon, LockIcon } from './Icons';

interface SuperAdminLoginProps {
    onLogin: (email: string, password: string) => boolean;
}

const SuperAdminLogin = ({ onLogin }: SuperAdminLoginProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setError(null);
        setIsLoading(true);

        setTimeout(() => {
            const success = onLogin(email, password);
            if (!success) {
                setError('Invalid Super Admin credentials.');
            }
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl animate-fade-in">
                <div className="text-center mb-8">
                    <LogoIcon className="h-16 w-16 mx-auto mb-2" />
                    <h1 className="text-3xl font-bold text-gray-800">Super Admin Portal</h1>
                    <p className="text-gray-500">B2B Client Management</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Admin Email</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MailIcon className="h-5 w-5 text-gray-400" /></div>
                            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary" placeholder="admin@vpena.com" />
                        </div>
                    </div>

                    <div>
                         <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                         <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><LockIcon className="h-5 w-5 text-gray-400" /></div>
                            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary" placeholder="••••••••" />
                         </div>
                    </div>
                    
                    {error && (<p className="text-sm text-red-600 text-center">{error}</p>)}

                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:bg-indigo-300">
                            {isLoading ? (<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>) : 'Sign In'}
                        </button>
                    </div>
                     <div className="mt-4 text-center text-xs text-gray-400">
                        <p>Demo: <span className="font-mono text-gray-500">admin@vpena.com</span> / <span className="font-mono text-gray-500">superadminpassword</span></p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SuperAdminLogin;
