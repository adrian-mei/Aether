'use client';

import { SessionProvider } from './Session.context';
import { SessionLayout } from './SessionLayout';

export function SessionContainer() {
  return (
    <SessionProvider>
      <SessionLayout />
    </SessionProvider>
  );
}
