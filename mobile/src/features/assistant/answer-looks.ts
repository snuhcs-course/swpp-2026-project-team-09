/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import type { MarkerLook } from '@/map';
import { lookName } from '@/map/marker-looks';
import type { Draft } from './answer-groups';
import type { LabelView } from './answer-labels';
import { type AnswerDrawing, drawingOf } from './answer-marks';
import { NO_STANDINGS } from './invited-friends';

// Moved out of `answer-marks.ts` for its length. Marks `beside` the answer's own (`Beside`) are drawn in each Plan's
// drawing, so their looks are asked for with the Plans'.
// The looks of every Plan's drawing, each once: at the view `viewOf` gives for the Plan's drawing with its sides
// chosen in metres, or with those sides.
export function looksOf(
  answer: AnswerReply,
  viewOf: (drawing: AnswerDrawing) => LabelView | null = (): null => null,
  beside: readonly Draft[] = [],
): MarkerLook[] {
  const looks = answer.plans.flatMap((_, index) => {
    const view = viewOf(drawingOf(answer, index, NO_STANDINGS, null, undefined, beside));
    return drawingOf(answer, index, NO_STANDINGS, view, undefined, beside).things.map(({ look }) => look);
  });
  return looks.filter((look, index) => looks.findIndex((other) => lookName(other) === lookName(look)) === index);
}
