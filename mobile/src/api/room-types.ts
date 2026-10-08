import type { JoinPolicy, Place } from './types';

// What a Quest's room sends and reads besides the Quest, the Parties and the lists of what waits.

// Where a Sub Quest is: a Place of the list, or a point on the map with the words the app showed for it.
export type SubQuestPlace = { placeId: string } | { latitude: number; longitude: number; label: string };

// The body of adding a Sub Quest and of replacing one.
export interface SubQuestContent {
  title: string;
  startsAt: string;
  place?: SubQuestPlace;
}

// POST /parties.
export interface PartyOpening {
  title: string;
  capacity: number;
  joinPolicy: JoinPolicy;
  questId: string;
}

// GET /places/at: the Place a point is inside or near, or none.
export type PlaceAt = { place: Place; relation: 'inside' | 'near' } | { place: null; relation: 'none' };
