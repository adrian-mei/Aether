'use client';

import { SessionProvider } from '@/features/session/context/session-context';
import { SessionLayout } from './session-layout';

export function SessionContainer() {
  return (
    <SessionProvider>
      <SessionLayout />
    </SessionProvider>
  );
}
