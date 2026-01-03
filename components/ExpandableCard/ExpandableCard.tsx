import React, { useState, ReactNode } from 'react';
import { ChevronDownIcon } from "../Icons/Icons";

interface ExpandableCardProps {
    title: string;
    children: ReactNode;
    defaultExpanded?: boolean;
    className?: string;
    icon?: ReactNode;
    badge?: ReactNode;
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({
    title,
    children,
    defaultExpanded = false,
    className = '',
    icon,
    badge
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-gray-50 transition-colors touch-target haptic-feedback"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {icon && (
                        <div className="flex-shrink-0 text-primary">
                            {icon}
                        </div>
                    )}
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 truncate">
                        {title}
                    </h3>
                    {badge && (
                        <div className="flex-shrink-0">
                            {badge}
                        </div>
                    )}
                </div>
                <ChevronDownIcon
                    className={`h-6 w-6 text-gray-600 transition-transform duration-300 flex-shrink-0 ml-2 ${
                        isExpanded ? 'rotate-180' : ''
                    }`}
                />
            </button>
            
            <div
                className={`expandable-card expandable-card-transition ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="px-4 md:px-6 pb-4 md:pb-6 border-t">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ExpandableCard;
