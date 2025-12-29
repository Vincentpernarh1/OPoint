import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoIcon, UsersIcon } from './Icons';

const InitialLogin = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl text-center animate-fade-in">
                <LogoIcon className="h-16 w-16 mx-auto mb-2" />
                <h1 className="text-3xl font-bold text-gray-800">Welcome to Opoint</h1>
                <p className="text-gray-500 mt-2 mb-8">Please select your login method.</p>

                <div className="space-y-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full flex items-center text-left p-4 rounded-lg border-2 border-transparent bg-slate-50 hover:bg-indigo-50 hover:border-primary transition-all duration-200"
                    >
                        <UsersIcon className="h-8 w-8 text-primary mr-4" />
                        <div>
                            <h2 className="font-semibold text-lg text-gray-800">Login</h2>
                            <p className="text-sm text-gray-500">Sign in to your account.</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InitialLogin;

