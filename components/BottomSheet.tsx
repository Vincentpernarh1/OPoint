import React, { useState, useEffect, useRef, ReactNode } from 'react';
import './BottomSheet.css';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    maxHeight?: string;
    snapPoints?: number[];
    initialSnap?: number;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
    isOpen,
    onClose,
    children,
    title,
    maxHeight = '85vh',
    snapPoints = [0.85],
    initialSnap = 0
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [currentSnap, setCurrentSnap] = useState(initialSnap);
    const sheetRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const startDragY = useRef(0);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setDragY(0);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        const sheet = sheetRef.current;
        if (!sheet) return;

        // Only allow dragging from the handle or header
        const target = e.target as HTMLElement;
        if (!target.closest('.bottom-sheet-handle') && !target.closest('.bottom-sheet-header')) {
            return;
        }

        startY.current = e.touches[0].clientY;
        startDragY.current = dragY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;
        
        // Only allow dragging down
        if (diff > 0) {
            setDragY(startDragY.current + diff);
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);

        // Close if dragged down more than 150px
        if (dragY > 150) {
            onClose();
        } else {
            // Snap back
            setDragY(0);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="bottom-sheet-overlay"
            onClick={handleBackdropClick}
        >
            {/* Backdrop */}
            <div className={`bottom-sheet-backdrop ${isOpen ? 'open' : 'closed'}`} />

            {/* Bottom Sheet */}
            <div
                ref={(el) => {
                    sheetRef.current = el;
                    if (el && isOpen) {
                        if (dragY > 0) {
                            el.style.transform = `translateY(${dragY}px)`;
                        } else if (!isDragging) {
                            el.style.transform = 'translateY(0)';
                        }
                    }
                }}
                className={`bottom-sheet-panel ${isOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="bottom-sheet-handle">
                    <div className="bottom-sheet-handle-bar" />
                </div>

                {/* Header */}
                {title && (
                    <div className="bottom-sheet-header">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                            <button
                                onClick={onClose}
                                className="touch-target haptic-feedback text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Close bottom sheet"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="bottom-sheet-content">
                    <div className="bottom-sheet-content-inner">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BottomSheet;
