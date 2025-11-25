'use client';

import dynamic from 'next/dynamic';

const SessionContainer = dynamic(
  () => import('@/scenes/Session').then(mod => mod.SessionContainer),
  { ssr: false }
);

export default function Home() {
  return <SessionContainer />;
}
