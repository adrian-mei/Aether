'use client';

import { useSessionManager } from '@/features/session/hooks/use-session-manager';
import { AetherUI } from './aether-ui';
import { useExtensionDetector } from '@/features/session/hooks/use-extension-detector';
import { DebugControls } from '@/shared/components/debug-controls';

export function SessionContainer() {
  const { state, actions } = useSessionManager();
  useExtensionDetector();

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <AetherUI
        voiceState={state.voiceState}
        permissionStatus={state.permissionStatus}
        sessionStatus={state.status}
        modelCacheStatus={state.modelCacheStatus}
        downloadProgress={state.downloadProgress}
        currentAssistantMessage={state.currentAssistantMessage}
        transcript={state.transcript}
        onStartSession={state.status === 'awaiting-boot' ? actions.startBootSequence : actions.handleStartSession}
        onToggleListening={actions.toggleListening}
        onBypass={actions.verifyAccessCode}
      />

      <DebugControls 
        isOpen={state.isDebugOpen}
        onToggle={actions.toggleDebug}
        onSimulateInput={actions.handleInputComplete}
      />
    </main>
  );
}
