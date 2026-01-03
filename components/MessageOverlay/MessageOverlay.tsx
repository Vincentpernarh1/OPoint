import React, { useEffect } from 'react';

interface MessageOverlayProps {
    message: { type: 'success' | 'error', text: string } | null;
    onClose: () => void;
}

const MessageOverlay: React.FC<MessageOverlayProps> = ({ message, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => onClose(), 5000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
            <div className="w-full max-w-xs pointer-events-auto animate-fade-in z-[10000]">
                <div className={`bg-white border-2 rounded-xl shadow-2xl p-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className={`text-center ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                        <div className="mb-4">
                            {message.type === 'success' ? (
                                <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            )}
                        </div>
                        <p className="text-lg font-semibold mb-6">{message.text}</p>
                        <button
                            onClick={onClose}
                            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                                message.type === 'success'
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                            } shadow-lg`}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageOverlay;