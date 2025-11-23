import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Monitor, Smartphone } from 'lucide-react';
import { checkDeviceCapabilities } from '@/features/system/utils/device-capabilities';

export const MobileSupportNotice = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const { isMobile } = checkDeviceCapabilities();
    const hasSeenNotice = localStorage.getItem('aether_mobile_notice_seen');

    if (isMobile && !hasSeenNotice) {
      // Small delay to appear after initial load
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('aether_mobile_notice_seen', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
            <AlertTriangle size={18} />
          </div>
          <h3 className="font-semibold text-gray-200 text-sm tracking-wide">Beta Mobile Support</h3>
          <button 
            onClick={handleDismiss}
            className="ml-auto text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Aether is optimized for Desktop. You can continue on mobile, but you may experience limited performance or audio capabilities.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                <Monitor size={16} className="text-emerald-400" />
                <div>
                    <div className="text-xs font-medium text-gray-200">Desktop</div>
                    <div className="text-[10px] text-emerald-400/80">Fully Supported • Neural Voice</div>
                </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 opacity-75">
                <Smartphone size={16} className="text-amber-400" />
                <div>
                    <div className="text-xs font-medium text-gray-200">Mobile</div>
                    <div className="text-[10px] text-amber-400/80">Limited • System Voice Recommended</div>
                </div>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition-colors border border-white/5"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
