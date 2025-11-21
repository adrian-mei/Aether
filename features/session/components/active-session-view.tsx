'use client';

import { Mic, MicOff, Play, Pause } from 'lucide-react';
import VoiceVisualizer from '@/features/voice/components/voice-visualizer';
import { VoiceAgentState } from '@/features/voice/hooks/use-voice-agent';
import { PermissionStatus } from '@/features/voice/utils/permissions';

interface ActiveSessionViewProps {
  voiceState: VoiceAgentState;
  permissionStatus: PermissionStatus;
  onToggleListening: () => void;
  onToggleMute: () => void;
  onRetryPermission: () => void;
}

export function ActiveSessionView({ voiceState, permissionStatus, onToggleListening, onToggleMute, onRetryPermission }: ActiveSessionViewProps) {
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

  return (
    <div className="flex flex-col items-center gap-8">
      <VoiceVisualizer state={voiceState} />

      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={onToggleListening}
          disabled={voiceState === 'muted' || voiceState === 'speaking' || voiceState === 'processing'}
          className={`p-4 rounded-full transition-all duration-300 cursor-pointer active:scale-95 border ${
            voiceState === 'listening'
              ? 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30'
              : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={voiceState === 'listening' ? 'Pause listening' : 'Start listening'}
        >
          {voiceState === 'listening' ? <Pause className="w-6 h-6 text-red-400" /> : <Play className="w-6 h-6 text-white" />}
        </button>
      </div>
    </div>
  );
}
