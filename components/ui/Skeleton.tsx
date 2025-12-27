import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseStyles = 'bg-gray-200';
  
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };
  
  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer shimmer',
    none: '',
  };
  
  // Build width/height classes using Tailwind arbitrary values
  const widthClass = width 
    ? (typeof width === 'number' ? `w-[${width}px]` : `w-[${width}]`)
    : 'w-full';
  
  const heightClass = height 
    ? (typeof height === 'number' ? `h-[${height}px]` : `h-[${height}]`)
    : variant === 'text' ? 'h-[1em]' : 'h-full';
  
  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${widthClass} ${heightClass} ${className}`}
    />
  );
};

export default Skeleton;

// Pre-built skeleton components for common use cases

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-medium ${className}`}>
    <div className="space-y-4">
      <Skeleton variant="rectangular" height={24} width="60%" />
      <Skeleton variant="text" height={16} width="40%" />
      <div className="space-y-2">
        <Skeleton variant="text" height={14} />
        <Skeleton variant="text" height={14} />
        <Skeleton variant="text" height={14} width="80%" />
      </div>
    </div>
  </div>
);

export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({ 
  count = 3, 
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={16} width="40%" />
          <Skeleton variant="text" height={14} width="60%" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({ 
  rows = 5, 
  cols = 4,
  className = '' 
}) => {
  // Map cols to Tailwind grid classes
  const gridColsClass = cols === 1 ? 'grid-cols-1' 
    : cols === 2 ? 'grid-cols-2'
    : cols === 3 ? 'grid-cols-3'
    : cols === 4 ? 'grid-cols-4'
    : cols === 5 ? 'grid-cols-5'
    : cols === 6 ? 'grid-cols-6'
    : 'grid-cols-4'; // fallback
  
  return (
    <div className={`bg-white rounded-xl shadow-medium overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className={`grid gap-4 ${gridColsClass}`}>
          {Array.from({ length: cols }).map((_, index) => (
            <Skeleton key={index} variant="text" height={16} width="80%" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className={`grid gap-4 ${gridColsClass}`}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <Skeleton key={colIndex} variant="text" height={14} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <SkeletonTable rows={5} cols={4} />
  </div>
);
