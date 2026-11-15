/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine } from '../dto/answer.dto.js';

// A request the Assistant cannot or will not answer, in the reply beside the answer and the Lookup, declared with the
// same shape in the app's `refusal-types.ts`. The model only names the case; the server writes the words.

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

// The kinds whose words name a Friend of the asker.
export const FRIEND_KINDS = ['past-location', 'others-sharing', 'not-watched-friend'] as const satisfies RefusalKind[];

export type FriendKind = (typeof FRIEND_KINDS)[number];

// `location` is the map's explanation of the User's location.
export type RefusalScreen = 'friend-add' | 'location-sharing' | 'timetable' | 'interests' | 'location';

// A button under the lines: `ask` sends its text as if the User typed it, `open` opens a screen.
export type RefusalOffer =
  { kind: 'ask'; label: string; text: string } | { kind: 'open'; label: string; screen: RefusalScreen };

export interface Refusal {
  kind: RefusalKind;
  // One or two.
  lines: AnswerLine[];
  // In the board's order.
  offers: RefusalOffer[];
}
