import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement, type ReactNode, useState } from 'react';
import { createQueryClient } from '@/api/query-client';
import { ToastProvider } from '@/design-system';
import { LiveUpdates } from '@/live/live-updates';
import { MarkerImageStage } from '@/map';
import { SessionProvider } from '@/session/session';

// What every screen stands in: the data's cache, where the User is in the flow, the connection to the socket server,
// the toast, and the stage that the map's marker pictures are made on.
export function AppProviders({ children }: { children: ReactNode }): ReactElement {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <LiveUpdates />
        <ToastProvider>
          {children}
          <MarkerImageStage />
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
