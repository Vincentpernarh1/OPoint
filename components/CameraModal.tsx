import React, { useRef, useEffect, useState } from 'react';
import { XIcon } from './Icons';

interface CameraModalProps {
    onClose: () => void;
    onCapture: (imageDataUrl: string) => void;
}

const CameraModal = ({ onClose, onCapture }: CameraModalProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'user' },
                    audio: false,
                });
                if (isMounted) {
                    streamRef.current = mediaStream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                } else {
                    mediaStream.getTracks().forEach(track => track.stop());
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                if (isMounted) {
                    setError("Could not access the camera. Please check permissions and try again.");
                }
            }
        };

        startCamera();

        return () => {
            isMounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // Empty array ensures this runs only once.

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                // Flip the canvas context horizontally to mirror the selfie
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageDataUrl = canvas.toDataURL('image/jpeg');
                onCapture(imageDataUrl);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative animate-fade-in-down">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                    <XIcon className="h-6 w-6"/>
                </button>
                <h3 className="text-xl font-semibold mb-4 text-center">Take a Selfie</h3>
                {error ? (
                    <div className="text-red-500 bg-red-100 p-4 rounded-md text-center">{error}</div>
                ) : (
                    <div className="relative w-full aspect-square bg-gray-200 rounded-md overflow-hidden mb-4">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                            // Mirror the video feed for a selfie experience
                            style={{ transform: 'scaleX(-1)' }}
                        ></video>
                        <canvas ref={canvasRef} className="hidden"></canvas>
                    </div>
                )}
                <div className="flex justify-center space-x-4">
                    <button onClick={onClose} className="py-2 px-6 bg-gray-200 text-gray-800 rounded-lg font-medium">Cancel</button>
                    <button onClick={handleCapture} disabled={!!error} className="py-2 px-6 bg-primary text-white rounded-lg font-bold disabled:bg-gray-400">Capture</button>
                </div>
            </div>
        </div>
    );
};

export default CameraModal;