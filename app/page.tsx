'use client';

import dynamic from 'next/dynamic';

const SessionContainer = dynamic(
  () => import('@/features/session/components/session-container').then(mod => mod.SessionContainer),
  { ssr: false }
);

export default function Home() {
  return <SessionContainer />;
}
