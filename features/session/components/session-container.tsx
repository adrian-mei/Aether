'use client';

import { Bug } from 'lucide-react';
import { useSessionManager } from '@/features/session/hooks/use-session-manager';
import { AetherUI } from './aether-ui';
import DebugOverlay from '@/shared/components/debug-overlay';
import { testApiConnection } from '@/features/ai/services/chat-service';

export function SessionContainer() {
  const { state, actions } = useSessionManager();

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <AetherUI
        voiceState={state.voiceState}
        permissionStatus={state.permissionStatus}
        sessionStatus={state.status}
        onStartSession={actions.handleStartSession}
        onToggleListening={actions.toggleListening}
        onBypass={actions.verifyAccessCode}
      />

      <DebugOverlay 
        isOpen={state.isDebugOpen} 
        onClose={actions.toggleDebug} 
        onTestApi={testApiConnection}
      />

      {/* Debug Toggle - Bottom Right Corner */}
      <button
        onClick={actions.toggleDebug}
        className={`fixed bottom-4 right-4 z-50 p-2 rounded-full transition-all duration-300 ${
          state.isDebugOpen
            ? 'bg-emerald-500/20 text-emerald-400 scale-100'
            : 'bg-emerald-900/40 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-900/60 scale-90 opacity-30 hover:opacity-100'
        }`}
        aria-label="Toggle debug mode"
      >
        <Bug size={16} />
      </button>
    </main>
  );
}
