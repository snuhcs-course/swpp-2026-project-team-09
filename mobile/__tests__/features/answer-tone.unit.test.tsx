/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';
import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { QUESTS_ANSWER } from '@/api/mock/data/quests-answer';
import { STUDY_PLAN_ANSWER } from '@/api/mock/data/study-plan-answer';
import { color, kindTone, MapAnswerMark, type ToneKind } from '@/design-system';
import { drawingOf } from '@/features/assistant/answer-marks';
import { answerTone, stepTone } from '@/features/assistant/answer-tone';
import { type Seen, seen } from '../support/answer-marks';

// One colour means one thing, the same on every screen (the user's rule of 2026-11-28): a table of each kind's colour
// (`kindTone`), which the map's marks, the list and the steps read by their answer's kind.

const KINDS: readonly ReplyStep['kind'][] = ['meal', 'study', 'events', 'quests', 'new-quest', 'meet', 'seat', 'room'];
const HEX = /^#[0-9A-F]{6}$/u;

// The kinds of the table whose ink is this colour.
function tonesOf(ink: string): string[] {
  return Object.entries(kindTone).flatMap(([kind, tone]) => (tone.ink === ink ? [kind] : []));
}

// The pick of the answer's first Plan whose pick draws its own round, not under a Friend's face.
function ownPick(answer: AnswerReply): Seen {
  const picks = answer.plans.map((_, index) => seen(drawingOf(answer, index), 'answer:pick'));
  const pick = picks.find(({ symbol }) => symbol !== null);
  if (pick === undefined) {
    throw new Error('No pick draws its own round');
  }
  return pick;
}

// Partitions: every kind of the table, every kind an answer or a step has. Expected values: the user's rule.
describe('the colour table', () => {
  it('gives every kind an ink, a soft ground and an icon or none', () => {
    for (const { ink, soft, icon } of Object.values(kindTone)) {
      expect([ink, soft]).toEqual([expect.stringMatching(HEX), expect.stringMatching(HEX)]);
      expect(icon === null || typeof icon === 'string').toBe(true);
    }
  });

  it('gives every kind of answer and of step a tone of the table', () => {
    expect(KINDS.map((kind) => kindTone[answerTone(kind)])).toHaveLength(KINDS.length);
    expect(KINDS.every((kind) => answerTone(kind) in kindTone)).toBe(true);
    expect([answerTone('seat'), answerTone('room')]).toEqual(['study', 'study']);
    expect(kindTone[answerTone('meet')].ink).toBe(color.snuBlue);
  });

  it('gives a step done its kind’s colour and a step not done the grey of what could not be done', () => {
    expect(stepTone({ kind: 'seat', status: 'shown' })).toBe('study');
    expect(stepTone({ kind: 'meal', status: 'shown' })).toBe('meal');
    expect(KINDS.map((kind) => stepTone({ kind, status: 'not-done' }))).toEqual(KINDS.map(() => 'dropped'));
    expect(kindTone.dropped).toMatchObject({ ink: color.inkSubtle, soft: color.border });
  });

  it('keeps gold for the time alone and the danger red for a warning alone', () => {
    expect(tonesOf(color.quest)).toEqual(['time']);
    expect(tonesOf(color.danger)).toEqual(['late']);
  });
});

// Partitions: a meal, a study, an events and a Quests answer. Expected values: the user's rule, an events answer and
// the Quests in the navy of the 참여하기 button.
describe("an answer's pick on the map", () => {
  it.each<[string, AnswerReply, ToneKind, string]>([
    ['a meal answer', MEAL_ANSWER_MENUS, 'meal', color.meal],
    ['a study answer', STUDY_PLAN_ANSWER, 'study', color.svcStudy],
    ['an events answer', EVENTS_ANSWER, 'event', color.snuBlue],
    ['a Quests answer', QUESTS_ANSWER, 'party', color.snuBlue],
  ])('of %s takes its kind’s colour, its round and its label’s edge', async (_, answer, kind, ink) => {
    const { symbol, label } = ownPick(answer);
    await render(<MapAnswerMark label={label} symbol={symbol} testID="m" />);

    expect(kindTone[kind].ink).toBe(ink);
    expect(symbol).toMatchObject({ kind });
    expect(screen.getByTestId('m:dot')).toHaveStyle({ backgroundColor: ink });
    expect(screen.getByTestId('m:label')).toHaveStyle({ borderColor: ink });
  });
});
