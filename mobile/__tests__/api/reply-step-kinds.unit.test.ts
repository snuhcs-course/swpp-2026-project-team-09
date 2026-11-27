/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { isReplyStep } from '@/api/server/step-answers';

// The steps of a reply that answered several requests (P03): every kind a step may have, which the main server takes
// from the answer's input (`plan-steps.ts`), is read. A study answer's step is "study" (P10 ticket 26), and one step
// the app refuses drops all of them.

const STEP: ReplyStep = {
  kind: 'meal',
  title: '저녁',
  place: null,
  from: null,
  startAt: '2026-11-05T18:00:00+09:00',
  endAt: null,
  status: 'shown',
  reason: null,
  shows: { kind: 'answer' },
};

// Every kind of the type, so that a kind added to `ReplyStep` fails to compile here until it is listed.
const EVERY_KIND: Record<ReplyStep['kind'], true> = {
  seat: true,
  room: true,
  meal: true,
  meet: true,
  events: true,
  quests: true,
  'new-quest': true,
  study: true,
};
const KINDS = Object.keys(EVERY_KIND);

// Partitions: each kind of the type, and one outside it. Expected values: `ReplyStep['kind']`.
describe('A step of several requests', () => {
  it.each(KINDS)('is read with the kind %s', (kind) => {
    expect(isReplyStep({ ...STEP, kind })).toBe(true);
  });

  it('is refused with a kind the app does not know', () => {
    expect(isReplyStep({ ...STEP, kind: 'cafe' })).toBe(false);
  });
});
