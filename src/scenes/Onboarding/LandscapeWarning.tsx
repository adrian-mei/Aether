import React from 'react';

export const LandscapeWarning = () => {
  return (
    <div className="fixed inset-0 z-[9999] hidden landscape:flex md:landscape:hidden flex-col items-center justify-center bg-black/95 text-center p-6 touch-none">
      <div className="text-emerald-400 mb-4 animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          <path d="M19 3v4"></path>
          <path d="M21 5h-4"></path>
        </svg>
      </div>
      <h2 className="text-xl font-medium text-white mb-2">Please Rotate Device</h2>
      <p className="text-white/60 text-sm max-w-xs mx-auto">
        Aether is designed for portrait mode on mobile devices.
      </p>
      
      <style jsx>{`
        @media (orientation: landscape) and (max-height: 500px) {
          .landscape\\:flex {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};
