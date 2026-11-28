/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { ChatSheetControl } from './chat-sheet';

// What a press on a step's flag does, which the flag's "›" says, by one rule for every kind of step (P03 ticket 25):
// - another step's makes it the step shown;
// - the step shown opens its card when it is the booking on screen;
// - else nothing, and its flag carries no "›".
// The step shown as an answer with a Plan, or as the booking on screen, is drawn as that answer or booking alone, its
// own pick in place of its flag (P03 ticket 26): a press on it does what it does alone.
export type StepPress = 'choose' | 'card';

// Whether a step is the booking on screen: its card is the seat card the frame shows (PR 462's review).
export function isCardStep(step: ReplyStep, key: string | null): boolean {
  return key !== null && step.shows?.kind === 'card' && step.shows.key === key;
}

export function stepPressOf(
  step: ReplyStep,
  index: number,
  { active, key }: { active: number; key: string | null },
): StepPress | null {
  if (index !== active) {
    return 'choose';
  }
  return isCardStep(step, key) ? 'card' : null;
}

// Whether the step shown is drawn by its answer's own part of the map, as that answer alone: its Plan's pick, its
// numbered candidates, which a press chooses, and its pick's card (P03 ticket 26). The other steps stand beside it.
export function answerStepDrawn({
  steps,
  activeStep,
  answer,
}: Pick<ChatSheetControl, 'steps' | 'activeStep'> & { answer: Pick<ShownAnswer, 'plan'> }): boolean {
  return steps?.steps[activeStep]?.shows?.kind === 'answer' && answer.plan !== null;
}
