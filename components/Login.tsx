import React, { useState, useEffect } from 'react';
import { LogoIcon, MailIcon, LockIcon } from './Icons';
import { Button, Input } from './ui';
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
                    credentials: 'include', // Include cookies
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
                credentials: 'include', // Include cookies
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
                credentials: 'include', // Include cookies
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
                            <Input
                                variant="floating"
                                label="New Password"
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                onFocus={() => setShowPasswordRequirements(true)}
                                leftIcon={<LockIcon className="h-5 w-5" />}
                                placeholder="At least 8 characters"
                            />
                            
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

                        <Input
                            variant="floating"
                            label="Confirm Password"
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            leftIcon={<LockIcon className="h-5 w-5" />}
                            placeholder="Re-enter password"
                            error={confirmPassword && newPassword !== confirmPassword ? "Passwords do not match" : undefined}
                        />
                        
                        {error && (
                            <div className="bg-red-50 p-3 rounded-md animate-fade-in">
                                <p className="text-sm text-red-600 text-center">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            isLoading={isLoading}
                            disabled={isLoading}
                        >
                            Set Password & Login
                        </Button>
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
                    <h1 className="text-3xl font-bold text-gray-800">Opoint</h1>
                    <p className="text-gray-500">Sign in to your workspace</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        variant="floating"
                        label="Email Address"
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<MailIcon className="h-5 w-5" />}
                        placeholder="you@company.com"
                    />

                    <Input
                        variant="floating"
                        label="Password"
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        leftIcon={<LockIcon className="h-5 w-5" />}
                        placeholder="••••••••"
                    />
                    
                    {error && (
                        <div className="bg-red-50 p-3 rounded-md animate-fade-in">
                            <p className="text-sm text-red-600 text-center">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        isLoading={isLoading}
                        disabled={isLoading}
                    >
                        Sign In
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default Login;