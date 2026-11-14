/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement, type ReactNode, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createQueryClient } from '@/api/query-client';
import { OverlayHost, ToastProvider } from '@/design-system';
import { LibrarySessionProvider } from '@/library/library-session';
import { LiveUpdates } from '@/live/live-updates';
import { MarkerImageStage } from '@/map';
import { PushArrivals } from '@/push/push-arrivals';
import { SessionProvider } from '@/session/session';

// What every screen stands in: the data's cache, where the User is in the flow, the connection to the socket server,
// what a push that arrives in front fetches again,
// the toast, the library session with its hidden web view and login, the layer of side panels and bottom sheets over every screen, and the stage that the map's marker
// pictures are made on. The root of the swipes, for the edge's swipe back and the 파티 tab's.
export function AppProviders({ children }: { children: ReactNode }): ReactElement {
  const [queryClient] = useState(createQueryClient);
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <LiveUpdates />
          <PushArrivals />
          <ToastProvider>
            <LibrarySessionProvider>
              <OverlayHost>{children}</OverlayHost>
            </LibrarySessionProvider>
            <MarkerImageStage />
          </ToastProvider>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
