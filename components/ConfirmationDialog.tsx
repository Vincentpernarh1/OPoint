import React from 'react';

interface ConfirmationDialogProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isVisible: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    message,
    onConfirm,
    onCancel,
    isVisible
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-70 p-4 pointer-events-none">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel}></div>
            <div className="relative w-full max-w-sm pointer-events-auto animate-fade-in">
                <div className="bg-white border-2 border-yellow-200 bg-yellow-50 rounded-xl shadow-2xl p-6">
                    <div className="text-center text-yellow-800">
                        <div className="mb-4">
                            <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <p className="text-lg font-semibold mb-6">{message}</p>
                        <div className="flex space-x-3">
                            <button
                                onClick={onCancel}
                                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationDialog;