'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}