/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions of the check of an invitation's card: the main server's card for 민수 in the worked example; each checked
// field left out, null where null is not allowed, or of another type; and null where it is allowed. Expected values:
// main-server `plans/dto/invitation-card.dto.ts`.

import { inList, inside, type Variant, wrongFields } from '../support/answer-variants';
import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import { isInvitationCard } from '@/api/server/invitation-card-client';

type Shape = Record<string, unknown>;

const CARD: Shape = { ...INVITATION_CARD };
const WAY: Shape = { ...INVITATION_CARD.way };
const GATHERING: Shape = { ...INVITATION_CARD.gathering };
const STEP: Shape = { ...INVITATION_CARD.steps[0] };
const HOLDER: Shape = { ...INVITATION_CARD.holders[0] };
const PLACE = INVITATION_CARD.gathering?.place;

const inWay = (variants: readonly Variant[]): Variant[] => inside(CARD, 'way', variants);

const ACCEPTED: Variant[] = [
  ["the main server's card", CARD],
  ['no gathering and no way', { ...CARD, gathering: null, way: null }],
  ['a gathering without an end', { ...CARD, gathering: { ...GATHERING, endAt: null } }],
  [
    'a way of an unknown origin',
    {
      ...CARD,
      way: { ...WAY, status: 'unknown', origin: null, leaveAt: null, walkMinutes: null, arriveAt: null, lines: [] },
    },
  ],
  [
    'a way with something after it',
    {
      ...CARD,
      way: {
        ...WAY,
        leaveBy: '2026-11-17T12:55:00+09:00',
        next: { startAt: '2026-11-17T13:00:00+09:00', place: PLACE },
      },
    },
  ],
  [
    'a step without a start, an end, or a place',
    { ...CARD, steps: [{ ...STEP, startsAt: null, endsAt: null, place: null }] },
  ],
];

const REFUSED: Variant[] = [
  ['null', null],
  ...wrongFields(
    CARD,
    { id: [1], sentAt: [1], quest: ['점심'], holders: [HOLDER], steps: [STEP], gathering: ['12:33'], way: ['ok'] },
    ['gathering', 'way'],
  ),
  ...inside(CARD, 'holders', inList(HOLDER, wrongFields(HOLDER, { id: [1], name: [1] }))),
  ...inside(CARD, 'steps', inList(STEP, wrongFields(STEP, { id: [1], title: [1], startsAt: [1] }, ['startsAt']))),
  ...inside(CARD, 'gathering', wrongFields(GATHERING, { place: ['63동'], startAt: [1], endAt: [1] }, ['endAt'])),
  ...inWay(
    wrongFields(
      WAY,
      {
        status: ['late'],
        origin: [{ place: PLACE, basis: 'chosen' }],
        leaveAt: [1],
        walkMinutes: ['18'],
        arriveAt: [1],
        meeting: [{ place: PLACE }],
        leaveBy: [1],
        next: [{ place: PLACE }],
        lines: ['12:15'],
        scene: [{ people: [] }],
      },
      ['origin', 'leaveAt', 'walkMinutes', 'arriveAt', 'meeting', 'leaveBy', 'next'],
    ),
  ),
];

describe('the check of an invitation card', () => {
  it.each(ACCEPTED)('accepts %s', (_label, value) => {
    expect(isInvitationCard(value)).toBe(true);
  });

  it.each(REFUSED)('refuses %s', (_label, value) => {
    expect(isInvitationCard(value)).toBe(false);
  });
});
