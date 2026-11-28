/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { type IconName, kindTone, type ToneKind } from '@/design-system';

// The kinds an answer is drawn in, each with its own icon in `kindTone`.
type AnswerToneKind = Extract<ToneKind, 'meal' | 'study' | 'event' | 'party' | 'meet'>;

// The colour an answer takes by its kind (`kindTone`; the user's rule of 2026-11-28, one colour for one thing): a meal
// answer's the meal's, a study answer's the 공부공간 layer's, an events answer's and the Quests' the app's navy. Gold
// is the time's alone. A seat or a room booked from a library card is study. A meet answer's is its own, navy for now.
const TONES: Record<ReplyStep['kind'], AnswerToneKind> = {
  meal: 'meal',
  study: 'study',
  events: 'event',
  quests: 'party',
  'new-quest': 'party',
  meet: 'meet',
  seat: 'study',
  room: 'study',
};

export function answerTone(kind: ReplyStep['kind']): AnswerToneKind {
  return TONES[kind];
}

// A step's icon, its kind's beside its colour in the one table (`kindTone`): on the steps card before its words and
// inside its round on the map, in place of a number, so that numbers mean an answer's candidates alone (P03 ticket 26).
export function stepIcon(kind: ReplyStep['kind']): IconName {
  return kindTone[answerTone(kind)].icon;
}

// A step's colour: its kind's when it was done, grey when not.
export function stepTone({ kind, status }: Pick<ReplyStep, 'kind' | 'status'>): ToneKind {
  return status === 'not-done' ? 'dropped' : answerTone(kind);
}
