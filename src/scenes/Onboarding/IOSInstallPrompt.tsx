import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export const IOSInstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Check if already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    // Check if user has dismissed it before
    const hasDismissed = localStorage.getItem('aether_install_dismissed');

    if (isIOS && !isStandalone && !hasDismissed) {
      // Delay slightly to not overwhelm on load
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('aether_install_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[9999] animate-slide-up">
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-2 text-white/40 hover:text-white/80 transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-start gap-4 pr-6">
          <div className="w-12 h-12 bg-emerald-900/50 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0">
            <img src="/icons/globe.svg" alt="App Icon" className="w-8 h-8 opacity-80" />
          </div>
          
          <div>
            <h3 className="text-white font-medium text-sm mb-1">Install Aether</h3>
            <p className="text-white/60 text-xs leading-relaxed">
              Add to Home Screen for the best full-screen experience.
            </p>
            
            <div className="flex items-center gap-2 mt-3 text-xs text-emerald-400/90 font-medium">
              <span>Tap</span>
              <Share size={14} />
              <span>then</span>
              <PlusSquare size={14} />
              <span>Add to Home Screen</span>
            </div>
          </div>
        </div>
        
        {/* Pointer arrow (optional, usually bottom center for Safari toolbar) */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-black/80 backdrop-blur-xl border-r border-b border-white/10 rotate-45 transform origin-center"></div>
      </div>
    </div>
  );
};
