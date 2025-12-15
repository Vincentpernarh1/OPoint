import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User, UserRole } from '../types';

interface ProtectedRouteProps {
    currentUser: User | null;
    allowedRoles: UserRole[];
    children: React.ReactElement;
}

const ProtectedRoute = ({ currentUser, allowedRoles, children }: ProtectedRouteProps) => {
    const location = useLocation();

    if (!currentUser) {
        // Not logged in, redirect to login page
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(currentUser.role)) {
        // Logged in but does not have permission, redirect to a 'not authorized' page or dashboard
        return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
