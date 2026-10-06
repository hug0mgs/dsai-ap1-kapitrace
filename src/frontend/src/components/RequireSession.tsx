'use client';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { hasSession, subscribeSession, serverSessionSnapshot } from '../lib/session';

export default function RequireSession({ children }: { children: ReactNode }) {
  const authenticated = useSyncExternalStore(subscribeSession, hasSession, serverSessionSnapshot);
  const router = useRouter();
  useEffect(() => { if (!authenticated) router.replace('/login'); }, [authenticated, router]);
  return authenticated ? children : <p role="status">Entre na sua conta para continuar.</p>;
}
