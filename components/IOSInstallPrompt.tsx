import React, { useEffect, useState } from 'react';
import { XIcon } from './Icons';

const IOSInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Check if already installed (running in standalone mode)
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    // Check if user has dismissed the prompt before
    const hasSeenPrompt = localStorage.getItem('ios-install-prompt-dismissed');
    
    // Show prompt only on iOS Safari, not in standalone mode, and if not previously dismissed
    if (isIOS && !isInStandaloneMode && !hasSeenPrompt) {
      // Wait 2 seconds before showing to not be intrusive
      setTimeout(() => setShowPrompt(true), 2000);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl shadow-2xl z-50 animate-slide-up ios-install-prompt">
      <button
      title="Dismiss install prompt"
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
      >
        <XIcon className="h-5 w-5" />
      </button>
      
      <div className="pr-6">
        <h3 className="font-bold text-lg mb-2">📱 Install Opoint</h3>
        <p className="text-sm mb-3 opacity-90">
          Add this app to your home screen for quick access and offline use!
        </p>
        
        <div className="bg-white/10 rounded-lg p-3 text-sm backdrop-blur-sm">
          <p className="mb-2">
            <span className="font-semibold">1.</span> Tap the{' '}
            <svg className="inline h-4 w-4 mx-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 14H4v-7h2v5h12v-5h2v7z"/>
            </svg>
            Share button
          </p>
          <p className="mb-2">
            <span className="font-semibold">2.</span> Scroll and tap <strong>"Add to Home Screen"</strong>
          </p>
          <p>
            <span className="font-semibold">3.</span> Tap <strong>"Add"</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default IOSInstallPrompt;
