'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSessionManager } from '../hooks/use-session-manager';

// Infer the return type of the hook
type SessionManagerReturn = ReturnType<typeof useSessionManager>;

const SessionContext = createContext<SessionManagerReturn | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSessionManager();

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
