'use client';

import { useSession } from '../context/session-context';
import { useExtensionDetector } from '@/features/system/hooks/use-extension-detector';
import { AetherUI } from './aether-ui';
import { DebugControls } from './debug/debug-controls';

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
