/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement, type ReactNode, useState } from 'react';
import { createQueryClient } from '@/api/query-client';
import { OverlayHost, ToastProvider } from '@/design-system';
import { LiveUpdates } from '@/live/live-updates';
import { MarkerImageStage } from '@/map';
import { SessionProvider } from '@/session/session';

// What every screen stands in: the data's cache, where the User is in the flow, the connection to the socket server,
// the toast, the layer of side panels and bottom sheets over every screen, and the stage that the map's marker
// pictures are made on.
export function AppProviders({ children }: { children: ReactNode }): ReactElement {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <LiveUpdates />
        <ToastProvider>
          <OverlayHost>{children}</OverlayHost>
          <MarkerImageStage />
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
