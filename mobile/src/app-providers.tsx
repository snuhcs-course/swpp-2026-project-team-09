import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement, type ReactNode, useState } from 'react';
import { createQueryClient } from '@/api/query-client';
import { ToastProvider } from '@/design-system';
import { SessionProvider } from '@/session/session';

// What every screen stands in: the data's cache, where the User is in the flow, and the toast.
export function AppProviders({ children }: { children: ReactNode }): ReactElement {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
