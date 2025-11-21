'use client';

import { Mic, MicOff, Play, Pause } from 'lucide-react';
import VoiceVisualizer from '@/features/voice/components/voice-visualizer';
import { VoiceAgentState } from '@/features/voice/hooks/use-voice-agent';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { SessionStatus } from '../hooks/use-session-manager';

interface ActiveSessionViewProps {
  status: SessionStatus;
  voiceState: VoiceAgentState;
  permissionStatus: PermissionStatus;
  onStartSession: () => void;
  onToggleListening: () => void;
  onToggleMute: () => void;
  onRetryPermission: () => void;
}

export function ActiveSessionView({ status, voiceState, permissionStatus, onStartSession, onToggleListening, onToggleMute, onRetryPermission }: ActiveSessionViewProps) {
    if (permissionStatus === 'denied') {
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <MicOff className="w-10 h-10 text-red-400" />
            <h2 className="text-lg font-medium text-slate-200">Microphone Access Denied</h2>
            <p className="text-sm text-slate-400 max-w-xs">
              Aether needs microphone access. Please enable it in your browser's settings.
            </p>
            <button
                onClick={onRetryPermission}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white font-medium"
            >
                Retry Permission
            </button>
          </div>
        );
      }
    
      if (permissionStatus === 'pending') {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <Mic className="w-10 h-10 text-blue-400 animate-pulse" />
                <h2 className="text-lg font-medium text-slate-200">Microphone Access</h2>
                <p className="text-sm text-slate-400 max-w-xs">
                    Please allow microphone access in the browser prompt to begin.
                </p>
            </div>
        );
      }

  const isSessionActive = status === 'running';

  const handleVisualizerClick = () => {
    if (!isSessionActive) {
      onStartSession();
    } else if (voiceState === 'muted') {
      onToggleMute();
    } else {
      onToggleListening();
    }
  };

  return (
    <div className="flex flex-col items-center gap-12">
      <VoiceVisualizer
        state={voiceState}
        onClick={handleVisualizerClick}
        size={180}
        isInteractive={true}
      />

      {isSessionActive && (
        <div className="flex justify-center gap-3">
          {/* Play/Pause Listening Button */}
          <button
            onClick={onToggleListening}
            disabled={voiceState === 'muted' || voiceState === 'speaking' || voiceState === 'processing'}
            className={`p-3 rounded-full transition-all duration-300 active:scale-95 ${
              voiceState === 'listening'
                ? 'bg-slate-700/80 hover:bg-slate-700'
                : 'bg-slate-800/50 hover:bg-slate-800'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            aria-label={voiceState === 'listening' ? 'Pause listening' : 'Start listening'}
          >
            {voiceState === 'listening' ? (
              <Pause className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
            ) : (
              <Play className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
