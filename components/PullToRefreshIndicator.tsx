import React, { useEffect, useRef } from 'react';
import '../styles/pull-to-refresh.css';

interface PullToRefreshIndicatorProps {
    isRefreshing: boolean;
    pullDistance: number;
    pullProgress: number;
}

const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
    isRefreshing,
    pullDistance,
    pullProgress
}) => {
    const indicatorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (indicatorRef.current) {
            indicatorRef.current.style.height = isRefreshing ? '60px' : `${pullDistance}px`;
            indicatorRef.current.style.opacity = String(Math.min(pullProgress / 100, 1));
        }
    }, [isRefreshing, pullDistance, pullProgress]);

    return (
        <div 
            ref={indicatorRef}
            className={`pull-to-refresh-indicator ${isRefreshing ? 'refreshing' : ''}`}
        >
            <div className="pull-to-refresh-content">
                {isRefreshing ? (
                    <>
                        <div className="pull-to-refresh-spinner"></div>
                        <p className="pull-to-refresh-text">Refreshing...</p>
                    </>
                ) : (
                    <>
                        <div className={`pull-to-refresh-arrow ${pullProgress >= 100 ? 'ready' : ''}`}>
                            ↓
                        </div>
                        <p className="pull-to-refresh-text">
                            {pullProgress >= 100 ? 'Release to refresh' : 'Pull to refresh'}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default PullToRefreshIndicator;