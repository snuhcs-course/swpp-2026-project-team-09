/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

type Wrapper = (props: { children: ReactNode }) => ReactElement;

// One cache for a test, shared by the hooks rendered with it. A failure is told at once, without the second try of
// the app's own client.
export function freshWrapper(): Wrapper {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return function wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

// Long enough for a slow mock's answer. Running every timer would never end: the map ages its positions on a timer
// that repeats.
const SETTLE_MS = 5000;

// Lets the mocks' waits pass and the hooks take the answers. Use with Jest's fake timers.
export async function settle(): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(SETTLE_MS);
  });
}
