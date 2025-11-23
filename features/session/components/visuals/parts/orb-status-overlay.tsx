import React from 'react';
import { Lock, Compass, AlertCircle, Play } from 'lucide-react';
import { SessionStatus } from '@/features/session/hooks/use-session-manager';
import { PermissionStatus } from '@/features/voice/utils/permissions';

interface OrbStatusOverlayProps {
  sessionStatus: SessionStatus;
  permissionStatus: PermissionStatus;
  downloadProgress: number | null;
  bootStatus?: string;
}

export const OrbStatusOverlay = ({ 
  sessionStatus, 
  permissionStatus, 
  downloadProgress,
  bootStatus 
}: OrbStatusOverlayProps) => {
  return (
    <>
        {/* Boot Status Text Overlay (When 100% or waiting) */}
        {((downloadProgress === 100 && sessionStatus === 'booting') || (bootStatus && bootStatus.length > 0)) && (
            <div className="absolute -bottom-16 w-64 text-center animate-fade-in pointer-events-none">
                <p className="text-sm font-medium text-emerald-300/90 animate-pulse">
                    {bootStatus || 'Finalizing...'}
                </p>
            </div>
        )}

        {/* Error/Status Icons Overlay */}
        {sessionStatus === 'insecure-context' && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <Lock className="w-16 h-16 text-red-300/80" />
            </div>
        )}
        {sessionStatus === 'unsupported' && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <Compass className="w-16 h-16 text-yellow-300/80" />
            </div>
        )}
        {permissionStatus === 'denied' && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <AlertCircle className="w-16 h-16 text-red-300/80" />
            </div>
        )}

        {/* Start Prompt Overlay */}
        {sessionStatus === 'awaiting-boot' && (
            <div className="absolute inset-0 flex items-center justify-center z-20 animate-pulse pointer-events-none">
                <Play className="w-16 h-16 text-emerald-200/80 fill-emerald-200/50 ml-2" />
            </div>
        )}
    </>
  );
};
