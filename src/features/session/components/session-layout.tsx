'use client';

import { useSession } from '@/features/session/context/session-context';
import { useExtensionDetector } from '@/shared/hooks/use-extension-detector';
import { AetherUI } from './aether-ui';
import { DebugControls } from './debug-controls';

export function SessionLayout() {
  const { state, actions } = useSession();
  useExtensionDetector();

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <AetherUI />
      <DebugControls 
        isOpen={state.isDebugOpen}
        onToggle={actions.toggleDebug}
        onSimulateInput={actions.handleInputComplete}
      />
    </main>
  );
}
