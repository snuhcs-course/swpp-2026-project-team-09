/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type Lookup } from '../dto/answer.dto.js';

// A request the Assistant cannot or will not answer, in the reply beside the answer and the Lookup, declared with the
// same shape in the app's `refusal-types.ts`. The model only names the case; the server writes the words.

// The cases the model names with refuse.
export const REFUSE_KINDS = [
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
  'course-and-room',
  'other-library',
  'for-someone-else',
] as const;

export type RefuseKind = (typeof REFUSE_KINDS)[number];

// Those and the question of which Friend, which resolveFriend asks without refuse (P01-20).
export const REFUSAL_KINDS = [...REFUSE_KINDS, 'which-friend'] as const;

export type RefusalKind = (typeof REFUSAL_KINDS)[number];

// The kinds whose words name a Friend of the asker.
export const FRIEND_KINDS = [
  'past-location',
  'others-sharing',
  'not-watched-friend',
  'course-and-room',
  'for-someone-else',
] as const satisfies RefuseKind[];

export type FriendKind = (typeof FRIEND_KINDS)[number];

// The kinds whose words name a Place.
export const PLACE_KINDS = ['other-library'] as const satisfies RefuseKind[];

export type PlaceKind = (typeof PLACE_KINDS)[number];

// The kinds that answer the part they can on the map, with the kind of Lookup each stands beside (boards n4, n20).
export const BESIDE_LOOKUP: Partial<Record<RefusalKind, Lookup['kind']>> = {
  'course-and-room': 'friend',
  'other-library': 'way',
};

// `location` is the map's explanation of the User's location.
export type RefusalScreen = 'friend-add' | 'location-sharing' | 'timetable' | 'interests' | 'location';

// One of the Friends the User's words fit (`which-friend`): a press sends `text` as the User's words with that Friend
// tapped, so that the server takes them by id.
export interface PickFriendOffer {
  kind: 'pick-friend';
  userId: string;
  // The full name.
  label: string;
  // The department, or null when the Friend gave none.
  aside: string | null;
  text: string;
}

// A button under the lines: `ask` sends its text as if the User typed it, `open` opens a screen.
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
