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
  'which-friend',
  'course-and-room',
  'other-library',
  'for-someone-else',
] as const;

export type RefusalKind = (typeof REFUSAL_KINDS)[number];

export const REFUSAL_SCREENS = ['friend-add', 'location-sharing', 'timetable', 'interests', 'location'] as const;

// `location` is the map's explanation of the User's location.
export type RefusalScreen = (typeof REFUSAL_SCREENS)[number];

// One of the Friends the User's words fit (`which-friend`): its press sends `text` as the User's words with that
// Friend tapped, so that the server takes them by id. Two Friends of one full name may send the same words.
export interface PickFriendOffer {
  kind: 'pick-friend';
  userId: string;
  label: string;
  aside: string | null;
  text: string;
}

// `ask` sends its text as if the User typed it; `open` opens a screen.
export type RefusalOffer =
  | { kind: 'ask'; label: string; text: string }
  | { kind: 'open'; label: string; screen: RefusalScreen }
  | PickFriendOffer;

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
