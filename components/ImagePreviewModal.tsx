
import React, { useEffect } from 'react';
import { XIcon } from './Icons';

interface ImagePreviewModalProps {
    imageUrl: string;
    onClose: () => void;
    isSecureContext?: boolean; // New prop to enable security features
}

const ImagePreviewModal = ({ imageUrl, onClose, isSecureContext = false }: ImagePreviewModalProps) => {
    
    useEffect(() => {
        if (!isSecureContext) return;

        // Prevent right-click context menu
        const preventRightClick = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', preventRightClick);
        
        return () => {
            document.removeEventListener('contextmenu', preventRightClick);
        };
    }, [isSecureContext]);

    const containerClasses = [
        "fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50",
        isSecureContext ? "no-print select-none" : ""
    ].join(" ");

    return (
        <div className={containerClasses} onClick={onClose}>
            <div className="relative p-4" onClick={e => e.stopPropagation()}>
                <img 
                    src={imageUrl} 
                    alt="Captured selfie" 
                    className="max-w-full max-h-[80vh] w-auto h-auto rounded-lg shadow-xl" 
                    // Prevent dragging the image in secure mode
                    onDragStart={(e) => { if (isSecureContext) e.preventDefault(); }}
                />
                
                {isSecureContext && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-white text-3xl font-bold opacity-40 transform -rotate-12 border-2 border-white/40 p-4 rounded-lg">
                            CONFIDENTIAL
                        </p>
                    </div>
                )}

                <button  title="Close image preview" onClick={onClose} className="absolute -top-4 -right-4 text-white bg-gray-800 rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-600">
                    <XIcon className="h-6 w-6"/>
                </button>
            </div>
        </div>
    );
};

export default ImagePreviewModal;