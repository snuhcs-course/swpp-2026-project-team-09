/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine } from './assistant-types';

// The main server's `Refusal` (`assistant/refusals/refusal.dto.ts`), the same shape: a request the Assistant cannot or
// will not answer, its lines written by the server, and buttons of what it can do instead.

export const REFUSAL_KINDS = [
  'off-campus',
  'general-work',
  'vague',
  'not-a-friend',
  'past-location',
  'who-looked',
  'others-sharing',
  'not-understood',
  'not-watched-friend',
  'not-watched-shuttle',
] as const;

export type RefusalKind = (typeof REFUSAL_KINDS)[number];

export const REFUSAL_SCREENS = ['friend-add', 'location-sharing', 'timetable', 'interests', 'location'] as const;

// `location` is the map's explanation of the User's location.
export type RefusalScreen = (typeof REFUSAL_SCREENS)[number];

// `ask` sends its text as if the User typed it; `open` opens a screen.
export type RefusalOffer =
  { kind: 'ask'; label: string; text: string } | { kind: 'open'; label: string; screen: RefusalScreen };

export interface Refusal {
  kind: RefusalKind;
  // One or two.
  lines: AnswerLine[];
  // In the board's order.
  offers: RefusalOffer[];
}

// The refusal's part of the Assistant's reply, null when there is none. A main server before P02-10 leaves it out.
export interface WithRefusal {
  refusal?: Refusal | null;
}
