import { useEffect } from 'react';

/**
 * Handles keyboard shortcuts for debug features.
 * Cmd/Ctrl + . : Toggle Debug Panel
 */
export const useDebugShortcuts = (toggleDebug: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + .
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        toggleDebug();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebug]);
};
