/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { drawsMeal } from '@/features/assistant/meal-marks';
import { type ShownSteps, stepNumberOf } from '@/features/assistant/steps-scene';

// What a press on a step's flag does, which the flag's "›" says, by one rule for every kind of step (P03 ticket 25):
// - another step's makes it the step shown;
// - the step shown opens its card when it is the booking on screen;
// - the step shown as an answer opens what that answer's chosen place opens alone (`withMealMenu`): a meal's menu or a
//   study place's spaces, else the pick's card;
// - else nothing (a step not done, or a card not on screen), and its flag carries no "›".
export type StepPress = 'choose' | 'card' | 'menu' | 'pick';

// Whether a step is the booking on screen: its card is the seat card the frame shows (PR 462's review).
export function isCardStep(step: ReplyStep, key: string | null): boolean {
  return key !== null && step.shows?.kind === 'card' && step.shows.key === key;
}

export function stepPressOf(
  step: ReplyStep,
  index: number,
  { active, key, answer }: { active: number; key: string | null; answer: AnswerReply | null },
): StepPress | null {
  if (index !== active) {
    return 'choose';
  }
  if (isCardStep(step, key)) {
    return 'card';
  }
  if (step.shows?.kind === 'answer' && answer !== null) {
    return drawsMeal(answer) ? 'menu' : 'pick';
  }
  return null;
}

// Whether a mark is the flag of a step shown as an answer, whose card is that answer's pick's (`MarkRows`), not a card
// of the scene the app made.
export function isAnswerStepFlag(steps: ShownSteps | null, id: string): boolean {
  const number = stepNumberOf(id);
  return number !== null && steps?.steps[number - 1]?.shows?.kind === 'answer';
}
