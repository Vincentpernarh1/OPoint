import React, { useEffect } from 'react';
import { XIcon, CheckCircleIcon } from './Icons';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Notification = ({ message, type, onClose }: NotificationProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const Icon = type === 'success' ? CheckCircleIcon : XIcon;

  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white ${bgColor} animate-fade-in-down`}>
      <Icon className="w-6 h-6 mr-3 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 -mr-2 p-1 rounded-full hover:bg-black/20 transition-colors">
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Notification;
