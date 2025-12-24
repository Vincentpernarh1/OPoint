import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboardIcon, DollarSignIcon, UserCircleIcon, MegaphoneIcon, BriefcaseIcon } from './Icons';

interface MobileBottomNavProps {
  onNavigate?: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onNavigate }) => {
  const location = useLocation();

  const bottomNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboardIcon },
    { name: 'Payslips', path: '/payslips', icon: DollarSignIcon },
    { name: 'Leave', path: '/leave', icon: BriefcaseIcon },
    { name: 'Profile', path: '/profile', icon: UserCircleIcon },
    { name: 'Alerts', path: '/announcements', icon: MegaphoneIcon },
  ];

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center py-2 px-2 safe-area-pb">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={handleNavClick}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;