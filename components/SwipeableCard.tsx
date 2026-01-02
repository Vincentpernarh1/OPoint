import React, { useState, useRef, ReactNode } from 'react';
import './SwipeableCard.css';

interface SwipeableCardProps {
    children: ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    leftAction?: {
        icon: ReactNode;
        color: string;
        label: string;
    };
    rightAction?: {
        icon: ReactNode;
        color: string;
        label: string;
    };
    threshold?: number;
    className?: string;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    leftAction,
    rightAction,
    threshold = 100,
    className = ''
}) => {
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;
        
        // Limit swipe distance
        const maxSwipe = 150;
        const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
        setDragX(limitedDiff);
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);

        // Trigger action if threshold is met
        if (dragX > threshold && onSwipeRight) {
            onSwipeRight();
        } else if (dragX < -threshold && onSwipeLeft) {
            onSwipeLeft();
        }

        // Reset position
        setDragX(0);
    };

    const opacity = Math.abs(dragX) / threshold;

    return (
        <div className={`swipeable-card-container ${className}`}>
            {/* Left Action Background */}
            {rightAction && dragX > 0 && (
                <div 
                    className={`swipe-action swipe-action-right ${rightAction.color}`}
                    ref={(el) => {
                        if (el) {
                            el.style.width = `${Math.abs(dragX)}px`;
                            el.style.opacity = String(Math.min(opacity, 1));
                        }
                    }}
                >
                    <div className="flex flex-col items-center text-white">
                        {rightAction.icon}
                        <span className="text-xs mt-1">{rightAction.label}</span>
                    </div>
                </div>
            )}

            {/* Right Action Background */}
            {leftAction && dragX < 0 && (
                <div 
                    className={`swipe-action swipe-action-left ${leftAction.color}`}
                    ref={(el) => {
                        if (el) {
                            el.style.width = `${Math.abs(dragX)}px`;
                            el.style.opacity = String(Math.min(opacity, 1));
                        }
                    }}
                >
                    <div className="flex flex-col items-center text-white">
                        {leftAction.icon}
                        <span className="text-xs mt-1">{leftAction.label}</span>
                    </div>
                </div>
            )}

            {/* Card Content */}
            <div
                ref={(el) => {
                    cardRef.current = el;
                    if (el) {
                        el.style.transform = `translateX(${dragX}px)`;
                    }
                }}
                className={`swipe-card-content ${isDragging ? 'dragging' : 'not-dragging'}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
};

export default SwipeableCard;
