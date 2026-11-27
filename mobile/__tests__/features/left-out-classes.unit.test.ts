/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LeftOutClass, PlanInput, RequestContext } from '@/api/assistant-types';
import { leftOutOf, withPutBack } from '@/features/assistant/left-out';
import { withoutSkipped } from '@/features/assistant/plan-input';
import { contextFor } from '@/features/assistant/request-context';
import type { ChatBubble } from '@/features/assistant/use-chat';

// The Classes the conversation leaves out, for every kind of answer (P01 ticket 40, the main server's P05 ticket 70):
// the latest reply's list, sent with every request of the conversation, and a ✕ that puts one back.

const ONE_PM: LeftOutClass = { date: '2026-11-17', classId: 'class-13' };
const THREE_PM: LeftOutClass = { date: '2026-11-17', classId: 'class-15' };

function bubble(id: number, role: 'user' | 'assistant', skipped?: LeftOutClass[]): ChatBubble {
  return {
    id,
    role,
    text: '…',
    cards: [],
    mapButtons: [],
    proposal: null,
    failure: null,
    ...(skipped === undefined ? {} : { skipped }),
  };
}

const CONTEXT: RequestContext = {
  location: null,
  locationMissing: null,
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

// Partitions: no reply gave a list; the latest that gave one, with a later reply that gave none; put back.
describe("The conversation's Classes left out", () => {
  it('are the latest list a reply gave, none before any', () => {
    expect(leftOutOf([bubble(1, 'user')])).toEqual([]);
    expect(leftOutOf([bubble(1, 'user'), bubble(2, 'assistant', [ONE_PM, THREE_PM]), bubble(3, 'assistant')])).toEqual([
      ONE_PM,
      THREE_PM,
    ]);
  });

  it('lose one a ✕ puts back, at once', () => {
    const bubbles = withPutBack([bubble(1, 'user'), bubble(2, 'assistant', [ONE_PM, THREE_PM])], ONE_PM.classId);

    expect(leftOutOf(bubbles)).toEqual([THREE_PM]);
  });

  it('go with every request of the conversation, and with none when there are none', () => {
    const bubbles = [bubble(1, 'user'), bubble(2, 'assistant', [ONE_PM]), bubble(3, 'user')];

    expect(contextFor(CONTEXT, bubbles).skipped).toEqual([ONE_PM]);
    expect(contextFor(CONTEXT, [bubble(1, 'user'), bubble(2, 'assistant', [])])).not.toHaveProperty('skipped');
  });
});

// Partitions: a meet, a study place and the events of a day. Expected values: new conditions of the same value.
describe('A ✕ on the time card of any kind of answer', () => {
  it.each<PlanInput>([
    { kind: 'meet', date: '2026-11-17', people: [], window: { from: null, until: null }, placeId: null },
    { kind: 'events', date: '2026-11-17', eventIds: null },
  ])('asks a recalculation of a $kind', (input) => {
    const put = withoutSkipped(input, ONE_PM.classId);

    expect(put).toEqual(input);
    expect(put).not.toBe(input);
  });
});
