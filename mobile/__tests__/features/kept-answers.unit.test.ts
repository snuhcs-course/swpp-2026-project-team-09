/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { severalAnswersReplyTo } from '@/api/mock/data/several-answers';
import { type Kept, keptWith, recalculatedConversation } from '@/features/assistant/kept-answers';

// What is kept of each step's answer on screen (P03 ticket 21), through recalculations that give the answer another
// key, as "＋ 같이" does to a study (`… alone` → `… together`) and the bar's other meal to a meal (TaeHyun79's review of
// #725): one entry per step, and the conversation's answers and steps at the last answer, whatever the keys did.

function twoMeals(): {
  lunch: AnswerReply;
  dinner: AnswerReply;
  given: Parameters<typeof recalculatedConversation>[0];
} {
  const reply = severalAnswersReplyTo('점심이랑 저녁 짜줘', '2026-10-07');
  const [lunch, dinner] = reply?.answers ?? [];
  if (reply === null || lunch === undefined || dinner === undefined || reply.steps === undefined) {
    throw new Error('No stored reply of lunch and dinner');
  }
  return { lunch, dinner, given: { answers: reply.answers ?? [], steps: reply.steps } };
}

const { lunch, dinner, given } = twoMeals();
const D0 = dinner.key ?? '';
const L0 = lunch.key ?? '';

// The main server's recalculation of dinner under `key`, a new object as every answer is.
const dinnerAs = (key: string): AnswerReply => ({ ...dinner, key });

const NONE: ReadonlyMap<string, Kept> = new Map();

function keep(
  last: ReadonlyMap<string, Kept>,
  chosenKey: string,
  key: string,
  answer: AnswerReply | null,
): ReadonlyMap<string, Kept> {
  return keptWith(last, chosenKey, { key, answer, index: 0, after: 1 }, []);
}

// Each step's key in the conversation's steps, and the answer under dinner's place.
function shown(kept: ReadonlyMap<string, Kept>): { keys: (string | undefined)[]; dinner: AnswerReply | undefined } {
  const conversation = recalculatedConversation(given, kept);
  const keys = (conversation.steps ?? []).map(({ shows }) => (shows?.kind === 'answer' ? shows.key : undefined));
  return { keys, dinner: conversation.answers[1] };
}

// Partitions: two key changes back to the first; three, back to the first; two that do not come back; a change after
// another step's entry; the same answer kept again.
describe("What is kept of a step's answer as its key changes", () => {
  it('is one entry at the last answer after two changes back to the first key', () => {
    const together = dinnerAs(`${D0} together`);
    const back = dinnerAs(D0);
    const first = keep(NONE, D0, D0, null);
    const kept = keep(keep(first, D0, together.key ?? '', together), together.key ?? '', D0, back);

    expect([...kept.keys()]).toEqual([D0]);
    expect(kept.get(D0)).toMatchObject({ from: D0, answer: back });
    expect(shown(kept)).toEqual({ keys: [L0, D0], dinner: back });
  });

  it('is one entry at the last answer after three changes back to the first key', () => {
    const [one, two, back] = [dinnerAs('meal 2026-10-07 lunch'), dinnerAs('meal 2026-10-07 late'), dinnerAs(D0)];
    const kept = keep(
      keep(keep(NONE, D0, one.key ?? '', one), one.key ?? '', two.key ?? '', two),
      two.key ?? '',
      D0,
      back,
    );

    expect([...kept.keys()]).toEqual([D0]);
    expect(shown(kept)).toEqual({ keys: [L0, D0], dinner: back });
  });

  it('is one entry under the last key, from the key the reply gave, after two changes that do not come back', () => {
    const [one, two] = [dinnerAs('k1'), dinnerAs('k2')];
    const kept = keep(keep(NONE, D0, 'k1', one), 'k1', 'k2', two);

    expect([...kept.keys()]).toEqual(['k2']);
    expect(kept.get('k2')).toMatchObject({ from: D0, answer: two });
    expect(shown(kept)).toEqual({ keys: [L0, 'k2'], dinner: two });
  });

  it("keeps another step's entry as it is", () => {
    const together = dinnerAs(`${D0} together`);
    const kept = keep(keep(NONE, L0, L0, null), D0, together.key ?? '', together);

    expect(kept.get(L0)).toMatchObject({ from: L0, answer: null });
    expect(shown(kept).keys).toEqual([L0, together.key]);
  });

  it('stays the same map when the same answer and plan are kept again', () => {
    const kept = keep(NONE, D0, D0, null);

    expect(keep(kept, D0, D0, null)).toBe(kept);
  });
});
