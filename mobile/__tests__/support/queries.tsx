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

// Lets the mocks' waits pass and the hooks take the answers. Use with Jest's fake timers.
export async function settle(): Promise<void> {
  await act(async () => {
    await jest.runAllTimersAsync();
  });
}
