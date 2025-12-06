import React, { useState } from 'react';
import { LogoIcon, MailIcon, LockIcon } from './Icons';

interface LoginProps {
    onLogin: (email: string, password: string) => boolean;
}

const Login = ({ onLogin }: LoginProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setError(null);
        setIsLoading(true);
        
        // Simulate network delay for a better user experience
        setTimeout(() => {
            const success = onLogin(email, password);
            if (!success) {
                setError('Invalid email or password. Please try again.');
            }
            setIsLoading(false);
        }, 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl animate-fade-in">
                <div className="text-center mb-8">
                    <LogoIcon className="h-16 w-16 mx-auto mb-2" />
                    <h1 className="text-3xl font-bold text-gray-800">Vpena Opoint</h1>
                    <p className="text-gray-500">Sign in to your company's workspace</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MailIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                placeholder="you@company.com"
                            />
                        </div>
                    </div>

                    <div>
                         <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                         <div className="mt-1 relative rounded-md shadow-sm">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LockIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 p-3 rounded-md animate-fade-in">
                            <p className="text-sm text-red-600 text-center">{error}</p>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-indigo-300"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>
                </form>
                 <div className="mt-6 text-center text-sm text-gray-500 bg-slate-100 p-4 rounded-lg border border-slate-200">
                    <p className='font-semibold text-gray-600 mb-2'>Demo Credentials</p>
                    <p>Employee: <span className="font-mono text-primary">alice@vertex.com</span></p>
                    <p>Manager: <span className="font-mono text-primary">charlie@summit.inc</span></p>
                    <p>Password: <span className="font-mono text-primary">password123</span></p>
                </div>
            </div>
        </div>
    );
};

export default Login;