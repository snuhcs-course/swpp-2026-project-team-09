/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import type { ToneKind } from '@/design-system';

// The colour an answer takes by its kind (`kindTone`; the user's rule of 2026-11-28, one colour for one thing): a meal
// answer's the meal's, a study answer's the 공부공간 layer's, an events answer's and the Quests' the app's navy. Gold
// is the time's alone. A seat or a room booked from a library card is study.
const TONES: Record<ReplyStep['kind'], ToneKind> = {
  meal: 'meal',
  study: 'study',
  events: 'event',
  quests: 'party',
  'new-quest': 'party',
  meet: 'party',
  seat: 'study',
  room: 'study',
};

export function answerTone(kind: ReplyStep['kind']): ToneKind {
  return TONES[kind];
}
