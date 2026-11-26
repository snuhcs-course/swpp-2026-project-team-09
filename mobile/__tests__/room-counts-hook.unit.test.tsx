/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { STUDY_BUILDINGS } from '@/api/mock/data/study-spaces';
import { studySpacesQuery } from '@/api/queries';
import type { Slot } from '@/library/cards/payloads';
import { library } from '@/library/library';
import type { LibrarySeat } from '@/library/replies';
import { forgetKeptCounts } from '@/screens/main/library/room-counting';
import { useRoomCounts, useRooms } from '@/screens/main/library/use-room-counts';

// The seat card holds its counting of the rooms (P01 ticket 08): each count that arrives draws what reads the counts,
// the list of rooms, and not the card. Expected values: how often each was drawn.

jest.mock('@/library/library-session', () => ({
  useLibrarySession: (): { loggedIn: boolean } => ({ loggedIn: true }),
}));

const SLOT: Slot = { date: '2026-11-02', start: '17:00', minutes: 180 };

const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

beforeEach(() => {
  forgetKeptCounts();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('draws the card once while the counts arrive, and the list with each', async () => {
  const comes: ((seats: LibrarySeat[]) => void)[] = [];
  jest.spyOn(library, 'seats').mockImplementation(
    () =>
      new Promise((resolve) => {
        comes.push(resolve);
      }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(studySpacesQuery.queryKey, STUDY_BUILDINGS);
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  let cardDrawn = 0;
  const card = await renderHook(
    () => {
      cardDrawn += 1;
      return useRoomCounts(SLOT);
    },
    { wrapper },
  );
  const list = await renderHook(() => useRooms(card.result.current), { wrapper });
  const drawnBefore = cardDrawn;

  await act(async () => {
    void card.result.current.read();
    await flush();
    for (const come of comes.splice(0)) {
      come([]);
      // oxlint-disable-next-line no-await-in-loop -- each count arrives on its own
      await flush();
    }
  });

  expect(cardDrawn).toBe(drawnBefore);
  expect(list.result.current.state).toBe('listed');
});
