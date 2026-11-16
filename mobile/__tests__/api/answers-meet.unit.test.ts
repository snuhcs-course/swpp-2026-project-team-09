/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TimeBand } from '@/api/assistant-types';
import type { MeetInput } from '@/api/meet-plan-types';
import { mockRecalculation } from '@/api/mock/assistant';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// Partitions of the check of a meet's answer: the stored copy of the main server's answer to board a5, a meet's input
// with and without what the User fixed, the fixed start's chip, and a busy stretch with a label, without one, and with
// one that is no text. Expected values: board a5 and main-server `assistant/dto/answer.dto.ts`.

const [first] = MEET_ANSWER.plans;

type Busy = TimeBand['lanes'][number]['busy'][number];

function withLanes(change: (busy: Busy) => object): object {
  if (first === undefined) {
    throw new Error('The copy has no plan');
  }
  const band = { ...first.band, lanes: first.band.lanes.map((lane) => ({ ...lane, busy: lane.busy.map(change) })) };
  return { ...MEET_ANSWER, plans: [{ ...first, band }] };
}

describe('the stored copy of the real answer of a5', () => {
  it('passes the check and meets at 302동 앞 from 12:15 to 12:43, then at 301동 앞 for 27 minutes', () => {
    expect(isAnswerReply(MEET_ANSWER)).toBe(true);
    expect(MEET_ANSWER.plans.slice(0, 2).map(({ id, togetherMinutes }) => [id, togetherMinutes])).toEqual([
      ['302동 앞', 28],
      ['301동 앞', 27],
    ]);
    expect(first?.band.text).toBe('12:15–12:43 · 함께 28분');
    expect(first?.band.lanes[1]?.busy.map(({ label }) => label)).toEqual(['302동 수업', '302동 수업']);
  });

  it('answers a recalculation of a meet, holding its input', () => {
    // A start that no stored copy holds: a meet from 14:00 is answered with a6's copy (P02-25).
    const input: MeetInput = { ...MEET_ANSWER.input, window: { from: '13:30', until: null } };

    expect(mockRecalculation(input)).toEqual({ ...MEET_ANSWER, input });
  });
});

describe('the check of a meet', () => {
  it.each([
    [
      'a fixed start and Place',
      { ...MEET_ANSWER, input: { ...MEET_ANSWER.input, window: { from: '14:00', until: null }, placeId: 'p1' } },
    ],
    ['the fixed start as a chip', { ...MEET_ANSWER, chips: [{ kind: 'from', text: '14:00부터', userId: null }] }],
    ['busy stretches without a label', withLanes(({ startAt, endAt }) => ({ startAt, endAt }))],
  ])('accepts %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(true);
  });

  it.each([
    ['a meet without its window', { ...MEET_ANSWER, input: { ...MEET_ANSWER.input, window: undefined } }],
    ['a meet without its people', { ...MEET_ANSWER, input: { ...MEET_ANSWER.input, people: undefined } }],
    ['a chip of an unknown kind', { ...MEET_ANSWER, chips: [{ kind: 'to', text: '14:00까지', userId: null }] }],
    ['a busy label that is no text', withLanes((span) => ({ ...span, label: 302 }))],
  ])('refuses %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(false);
  });
});
