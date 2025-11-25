import React from 'react';
import { Lock, Compass, AlertCircle, Play } from 'lucide-react';
import { SessionStatus } from '../Session.logic';
import { PermissionStatus } from '@/shared/utils/voice/permissions';

interface OrbStatusOverlayProps {
  sessionStatus: SessionStatus;
  permissionStatus: PermissionStatus;
}

export const OrbStatusOverlay = ({ 
  sessionStatus, 
  permissionStatus, 
}: OrbStatusOverlayProps) => {
  return (
    <>
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
        {sessionStatus === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center z-20 animate-pulse pointer-events-none">
                <Play className="w-16 h-16 text-emerald-200/80 fill-emerald-200/50 ml-2" />
            </div>
        )}
    </>
  );
};
