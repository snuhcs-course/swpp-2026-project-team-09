/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import { mockClient } from '@/api/mock/client';
import { INVITATION_CARD } from '@/api/mock/data/invitation-card';

// The mock of an invitation's card, where the app asks no main server: the main server's real card for 민수 in the
// worked example, wherever the phone is.

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("the mock of an invitation's card", () => {
  it("answers with the main server's card", async () => {
    await expect(answered(mockClient.getInvitationCard(INVITATION_CARD.id, null))).resolves.toEqual(INVITATION_CARD);
  });

  it('answers the same card wherever the phone is', async () => {
    const location = { latitude: 37.46709, longitude: 126.95717 };

    await expect(answered(mockClient.getInvitationCard(INVITATION_CARD.id, location))).resolves.toEqual(
      INVITATION_CARD,
    );
  });
});
