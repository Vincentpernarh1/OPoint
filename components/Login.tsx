import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LogoIcon, MailIcon, LockIcon } from './Icons';
import { api } from '../services/api';
import { setCompanyContextByEncryptedId, getCurrentCompanyName } from '../services/database';
import './Login.css';

interface LoginProps {
    onLogin: (user: any) => void;
}

interface PasswordStrength {
    isValid: boolean;
    errors: string[];
    strength: string;
    score: number;
}

const Login = ({ onLogin }: LoginProps) => {
    console.log('Login component rendered');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Password change state
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
    const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

    const location = useLocation();
    const [companyName, setCompanyName] = useState<string | null>(null);

    // Set company context if encryptedId is present
    useEffect(() => {
        const path = location.pathname;
        console.log('Path:', path);
        let encryptedId = '';
        if (path.startsWith('/login/')) {
            encryptedId = path.replace('/login/', '');
        } else if (path.endsWith('/login')) {
            encryptedId = path.replace('/login', '');
        }
        console.log('Extracted encryptedId:', encryptedId);
        if (encryptedId && encryptedId !== 'login') {  // avoid if just /login
            const setContext = async () => {
                console.log('Encrypted ID:', encryptedId);
                const success = await setCompanyContextByEncryptedId(encryptedId);
                console.log('Set context success:', success);
                if (success) {
                    setCompanyName(getCurrentCompanyName());
                    console.log('Company name:', getCurrentCompanyName());
                } else {
                    setError('Invalid company link. Please check the URL.');
                }
            };
            setContext();
        }
    }, [location.pathname]);
    useEffect(() => {
        const validatePassword = async () => {
            if (newPassword.length === 0) {
                setPasswordStrength(null);
                return;
            }

            try {
                const response = await fetch('/api/auth/validate-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ password: newPassword }),
                });
                const data = await response.json();
                
                if (data.success) {
                    setPasswordStrength({
                        isValid: data.isValid,
                        errors: data.errors,
                        strength: data.strength,
                        score: data.score
                    });
                }
            } catch (err) {
                console.error('Password validation error:', err);
            }
        };

        const debounceTimer = setTimeout(validatePassword, 300);
        return () => clearTimeout(debounceTimer);
    }, [newPassword]);

    const getStrengthColor = (strength: string) => {
        switch (strength) {
            case 'very strong': return 'strength-very-strong';
            case 'strong': return 'strength-strong';
            case 'moderate': return 'strength-moderate';
            case 'fair': return 'strength-fair';
            default: return 'strength-weak';
        }
    };

    const getStrengthBarClass = (strength: string) => {
        switch (strength) {
            case 'very strong': return 'strength-bar-very-strong';
            case 'strong': return 'strength-bar-strong';
            case 'moderate': return 'strength-bar-moderate';
            case 'fair': return 'strength-bar-fair';
            default: return 'strength-bar-weak';
        }
    };

    const getStrengthWidth = (score: number) => {
        return `${Math.min(100, Math.max(0, score))}%`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setError(null);
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (data.success) {
                // Check if user needs to change password
                if (data.requiresPasswordChange) {
                    setCurrentUserEmail(email);
                    setShowPasswordChange(true);
                    setIsLoading(false);
                } else {
                    // Login successful
                    onLogin(data.user);
                }
            } else {
                setError(data.error || 'Login failed. Please try again.');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Unable to connect to server. Please try again later.');
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        // Validation
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (passwordStrength && !passwordStrength.isValid) {
            setError('Password does not meet security requirements');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: currentUserEmail,
                    currentPassword: password, // This is the temporary password for first-time login
                    newPassword
                }),
            });
            const data = await response.json();

            if (data.success) {
                // Password changed successfully
                onLogin(data.user);
            } else {
                setError(data.error || 'Failed to change password');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('Password change error:', err);
            setError(err.message || 'Unable to connect to server. Please try again later.');
            setIsLoading(false);
        }
    };

    // Password change form
    if (showPasswordChange) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl animate-fade-in">
                    <div className="text-center mb-8">
                        <LogoIcon className="h-16 w-16 mx-auto mb-2" />
                        <h1 className="text-2xl font-bold text-gray-800">Set Your Password</h1>
                        <p className="text-gray-500 mt-2">Please create a new password for your account</p>
                    </div>
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    onFocus={() => setShowPasswordRequirements(true)}
                                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                    placeholder="At least 8 characters"
                                />
                            </div>
                            
                            {/* Password Strength Indicator */}
                            {newPassword && passwordStrength && (
                                <div className="mt-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs password-strength-label">Password Strength:</span>
                                        <span className={`text-xs font-medium ${getStrengthColor(passwordStrength.strength)}`}>
                                            {passwordStrength.strength.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="password-strength-bar-container">
                                        <div
                                            className={`password-strength-bar ${getStrengthBarClass(passwordStrength.strength)}`}
                                            data-strength-score={passwordStrength.score}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Password Requirements */}
                            {showPasswordRequirements && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs">
                                    <p className="font-medium text-gray-700 mb-2">Password must contain:</p>
                                    <ul className="space-y-1">
                                        <li className={newPassword.length >= 8 ? 'text-green-600' : 'text-gray-600'}>
                                            {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                                        </li>
                                        <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}>
                                            {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
                                        </li>
                                        <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}>
                                            {/[a-z]/.test(newPassword) ? '✓' : '○'} One lowercase letter
                                        </li>
                                        <li className={/\d/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}>
                                            {/\d/.test(newPassword) ? '✓' : '○'} One number
                                        </li>
                                        <li className={/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword) ? 'text-green-600' : 'text-gray-600'}>
                                            {/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword) ? '✓' : '○'} One special character
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                    placeholder="Re-enter password"
                                />
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                            )}
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
                                    'Set Password & Login'
                                )}
                            </button>
                        </div>
                    </form>
                    <div className="mt-4 text-center">
                        <button
                            onClick={() => {
                                setShowPasswordChange(false);
                                setPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                                setError(null);
                            }}
                            className="text-sm text-primary hover:text-primary-hover"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Standard login form
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl animate-fade-in">
                <div className="text-center mb-8">
                    <LogoIcon className="h-16 w-16 mx-auto mb-2" />
                    <h1 className="text-3xl font-bold text-gray-800">{companyName || 'OPoint-P360'}</h1>
                    <p className="text-gray-500">Sign in to your workspace</p>
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
                    <p className='font-semibold text-gray-600 mb-2'>Test User</p>
                    <p>Email: <span className="font-mono text-primary">vpernarh@gmail.com</span></p>
                    <p>Password: <span className="font-mono text-primary">Vpernarh@20</span></p>
                </div>
            </div>
        </div>
    );
};

export default Login;