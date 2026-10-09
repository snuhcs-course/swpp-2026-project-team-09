/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { JoinPolicy, Place } from './types';

// What a Quest's room sends and reads besides the Quest, the Parties and the lists of what waits.

// Where a Meetup is: a Place of the list, or a point on the map with the words the app showed for it.
export type MeetupPlace = { placeId: string } | { latitude: number; longitude: number; label: string };

// Where a Sub Quest is: as a Meetup, or words the User typed that name no Place, alone.
export type SubQuestPlace = MeetupPlace | { label: string };

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
