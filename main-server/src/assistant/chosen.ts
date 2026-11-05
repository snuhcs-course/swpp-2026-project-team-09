/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FriendsService } from '../friends/friends.service.js';
import { GlobalEventsService } from '../global-events/global-events.service.js';
import { PlacesService } from '../places/places.service.js';
import { type Asker, type Choice, type ChoiceKind } from './feature.js';

// The candidate a User's message answers with, as the app sends it back from a chip: what was tapped, and the words
// it was a candidate for.
export interface SentChoice {
  kind: ChoiceKind;
  id: string;
  words: string;
}

// The services a tapped candidate is checked with.
export interface ChoiceServices {
  places: PlacesService;
  friends: FriendsService;
  globalEvents: GlobalEventsService;
}

async function labelOf(
  { kind, id }: SentChoice,
  { userId, now }: Asker,
  { places, friends, globalEvents }: ChoiceServices,
): Promise<string | undefined> {
  if (kind === 'place') {
    return (await places.list()).find((place) => place.id === id)?.name;
  }
  if (kind === 'friend') {
    return (await friends.listFriends(userId)).find((friend) => friend.id === id)?.name;
  }
  const [event] = await globalEvents.notEndedAmong([id], now);
  return event?.title;
}

// A tapped candidate, checked again as proposeQuest checks ids (P07 ticket 02): a Place of the catalog, a current
// Friend of the User or a published event that has not ended, with its name or title. Null when it is none of them,
// and the message then stands as its text alone.
export async function checkedChoice(sent: SentChoice, asker: Asker, services: ChoiceServices): Promise<Choice | null> {
  const label = await labelOf(sent, asker, services);
  return label === undefined ? null : { ...sent, label };
}
