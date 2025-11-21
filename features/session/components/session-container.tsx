'use client';

import { Bug, Compass, Lock } from 'lucide-react';
import { useSessionManager } from '@/features/session/hooks/use-session-manager';
import { ActiveSessionView } from './active-session-view';
import DebugOverlay from '@/shared/components/debug-overlay';
import { testApiConnection } from '@/features/ai/services/chat-service';

export function SessionContainer() {
  const { state, actions } = useSessionManager();

  const renderContent = () => {
    if (state.status === 'insecure-context') {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <Lock className="w-10 h-10 text-red-400" />
                <h2 className="text-lg font-medium text-slate-200">Insecure Connection</h2>
                <p className="text-sm text-slate-400 max-w-xs">
                    Microphone access is disabled on insecure connections. Please use `localhost` or a secure `https` connection to use Aether.
                </p>
            </div>
        );
    }

    if (state.status === 'unsupported') {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <Compass className="w-10 h-10 text-yellow-400" />
          <h2 className="text-lg font-medium text-slate-200">Browser Not Supported</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            Aether uses advanced speech technologies that are not available in your current browser. Please use Google Chrome or Microsoft Edge for the best experience.
          </p>
        </div>
      );
    }
    
    return (
      <ActiveSessionView
        status={state.status}
        voiceState={state.voiceState}
        permissionStatus={state.permissionStatus}
        onStartSession={actions.handleStartSession}
        onToggleListening={actions.toggleListening}
        onToggleMute={actions.toggleMute}
        onRetryPermission={actions.onRetryPermission}
      />
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
      <DebugOverlay 
        isOpen={state.isDebugOpen} 
        onClose={actions.toggleDebug} 
        onTestApi={testApiConnection}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 to-slate-950 pointer-events-none" />

      {/* Debug Toggle - Bottom Right Corner */}
      <button
        onClick={actions.toggleDebug}
        className={`fixed bottom-4 right-4 z-20 p-2 rounded-full transition-all duration-300 ${
          state.isDebugOpen
            ? 'bg-indigo-500/20 text-indigo-400 scale-100'
            : 'bg-slate-800/40 text-slate-600 hover:text-slate-500 hover:bg-slate-800/60 scale-90 opacity-30 hover:opacity-100'
        }`}
        aria-label="Toggle debug mode"
      >
        <Bug size={16} />
      </button>

      <div className="z-10 max-w-lg w-full text-center space-y-16">

        <div className="space-y-3">
          <h1 className="text-5xl font-extralight tracking-tight text-slate-100">Aether</h1>
          <p className="text-slate-500 text-sm font-light">Empathetic Voice Companion</p>
        </div>

        <div className="min-h-[280px] flex flex-col items-center justify-center">
            {renderContent()}
        </div>

        <div className="pt-8 border-t border-slate-800/50">
          <p className="text-xs text-slate-600 leading-relaxed font-light max-w-md mx-auto">
            Aether is an AI demo, not a healthcare provider. Responses may be inaccurate.
            If you are in crisis, please contact emergency services immediately.
          </p>
        </div>
      </div>
    </main>
  );
}
