/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import type { ShownQuestInvitation } from '@/api/quest-parts-types';
import { cardId } from '@/features/map/adapter';
import { forgetAnswerSwitch } from '@/features/assistant/answer-switch';
import { useInvitationCards } from '@/screens/main/use-main-layers';
import { type Kept, readKept } from '@/storage/kept';
import { RECEIVED } from './support/invitation-cards';
import { freshWrapper, settle } from './support/queries';

// Whether the main screen knows the cards of the invitations the User received, which an address waits for (P02
// ticket 06), over a stand-in of what the phone keeps and of the main server's list.

jest.mock('@/storage/kept', () => ({ readKept: jest.fn(), keep: jest.fn() }));

// What the phone keeps, of which the switch reads one field.
function kept(answerOnMap: boolean): Kept {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the switch reads only this field of what is kept
  return { answerOnMap } as Kept;
}

// The list as the app's client gives it: the invitation with the parts the app adds, left empty, as the card reads
// only the Quest's title and its Leader.
const LISTED: ShownQuestInvitation = {
  ...RECEIVED,
  quest: { ...RECEIVED.quest, photo: null, tags: [], faces: [] },
  startsAt: null,
  place: null,
};

beforeEach(() => {
  jest.useFakeTimers();
  forgetAnswerSwitch();
  jest.mocked(readKept).mockReset();
  jest.spyOn(apiClient, 'listQuestInvitations').mockResolvedValue([LISTED]);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the switch's read held back and then on; the switch read off.
describe('the cards of the received invitations, and whether they are known', () => {
  it('are not known while the switch is unread, and known once it is read on and the list came', async () => {
    const phone: { say?: (answer: Kept) => void } = {};
    jest.mocked(readKept).mockReturnValue(
      new Promise((resolve) => {
        phone.say = resolve;
      }),
    );
    const { result } = await renderHook(() => useInvitationCards(), { wrapper: freshWrapper() });
    await settle();
    expect(result.current.known).toBe(false);

    await act(async () => {
      phone.say?.(kept(true));
      await Promise.resolve();
    });
    await settle();

    expect(result.current.known).toBe(true);
    expect(result.current.cards.map(({ id }) => id)).toEqual([cardId.invitation(RECEIVED.id)]);
  });

  it('are none and known once the switch is read off, and the list is not asked for', async () => {
    jest.mocked(readKept).mockResolvedValue(kept(false));

    const { result } = await renderHook(() => useInvitationCards(), { wrapper: freshWrapper() });
    await settle();

    expect(result.current).toEqual({ cards: [], known: true });
    expect(apiClient.listQuestInvitations).not.toHaveBeenCalled();
  });
});
