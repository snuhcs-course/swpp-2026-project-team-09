/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import type { ShownQuestInvitation } from '@/api/quest-parts-types';
import { cardId } from '@/features/map/adapter';
import { useInvitationCards } from '@/screens/main/use-main-layers';
import { RECEIVED } from './support/invitation-cards';
import { freshWrapper, settle } from './support/queries';

// Whether the main screen knows the cards of the invitations the User received, which an address waits for (P02
// ticket 06), over a stand-in of the main server's list.

// The list as the app's client gives it: the invitation with the parts the app adds, left empty, as the card reads
// only the Quest's title and its Leader.
const LISTED: ShownQuestInvitation = {
  ...RECEIVED,
  quest: { ...RECEIVED.quest, faces: [] },
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the list held back and then come.
describe('the cards of the received invitations, and whether they are known', () => {
  it('are not known while the list is read, and known once it came', async () => {
    const list: { give?: (invitations: ShownQuestInvitation[]) => void } = {};
    jest.spyOn(apiClient, 'listQuestInvitations').mockReturnValue(
      new Promise((resolve) => {
        list.give = resolve;
      }),
    );
    const { result } = await renderHook(() => useInvitationCards(), { wrapper: freshWrapper() });
    await settle();
    expect(result.current.known).toBe(false);

    await act(async () => {
      list.give?.([LISTED]);
      await Promise.resolve();
    });
    await settle();

    expect(result.current.known).toBe(true);
    expect(result.current.cards.map(({ id }) => id)).toEqual([cardId.invitation(RECEIVED.id)]);
  });
});
