/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// A Global Event's Plan carries the event's own times (P05 ticket 05), which the map shows as the event's (P04 ticket
// 08): its startAt is the asker's arrival for an event under way. The field is optional: a main server before it, and
// every other Plan, sends none.

function withEvent(event: unknown): unknown {
  const [first, ...rest] = EVENTS_ANSWER.plans;
  return { ...EVENTS_ANSWER, plans: [{ ...first, event }, ...rest] };
}

describe("An event Plan's own times", () => {
  it.each([
    ['with a start and an end', { startAt: '2026-11-21T06:00:00+09:00', endAt: '2026-11-21T08:00:00+09:00' }],
    ['with no end', { startAt: '2026-11-21T06:00:00+09:00', endAt: null }],
  ])('are believed %s', (_, event) => {
    expect(isAnswerReply(withEvent(event))).toBe(true);
  });

  it('may be absent', () => {
    expect(isAnswerReply(EVENTS_ANSWER)).toBe(true);
  });

  it.each([
    ['without a start', { endAt: null }],
    ['with an end as a number', { startAt: '2026-11-21T06:00:00+09:00', endAt: 8 }],
  ])('are refused %s', (_, event) => {
    expect(isAnswerReply(withEvent(event))).toBe(false);
  });
});
