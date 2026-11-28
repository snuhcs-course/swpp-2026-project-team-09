/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions of the address a kept Notification opens: each of a 파티's own seven kinds on its card, the other kinds
// on a 파티's card and on cards of their own. Expected values: P06 ticket 37.

import { openedAddress } from '../src/notifications/card-address.js';

const QUEST_ID = '6a1e2f3c-4b5d-4e6f-8a7b-9c0d1e2f3a4b';
const PARTY = { kind: 'party', id: QUEST_ID };

describe('openedAddress', () => {
  it.each(['became-leader', 'join-accepted', 'step-changed', 'arrived', 'late', 'accepted', 'declined'])(
    'a 파티’s own %s, kept on its card → its room',
    (kind) => {
      expect(openedAddress(kind, PARTY)).toBe(`/main?card=room:${QUEST_ID}`);
    },
  );

  it.each([
    ['the time to leave, which opens the card for 파티 켜기', 'leave-by', PARTY],
    ['a room request’s', 'room-ending', PARTY],
    ['a 파티 activated', 'party-activated', PARTY],
    ['a recruiting 파티 that matches an interest', 'interest-new', PARTY],
    ['a 파티 gone', 'party-ended', { kind: 'party-gone', id: QUEST_ID }],
    ['a request declined', 'join-declined', { kind: 'find-parties', id: QUEST_ID }],
    ['an event that matches an interest', 'interest-new', { kind: 'event', id: 'e1' }],
  ])('%s (%s) → its own card', (_, kind, card) => {
    expect(openedAddress(kind, card)).toBe(`/main?card=${card.kind}:${card.id}`);
  });
});
