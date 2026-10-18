/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { QuestProposal } from '@/api/assistant-types';
import type { Friend, GlobalEvent, Place } from '@/api/types';
import type { PickedPlace } from '@/features/places/picked-place';
import { type Announcer, type PartyForm, proposalForm } from '@/features/party/making';

// What `어디서` holds: the words shown, and the place picked behind them.
export interface WhereStart {
  words: string;
  picked: PickedPlace | null;
}

// The form a Proposal of the Assistant's opens with, before the User corrects it.
export interface ProposalStart extends WhereStart {
  form: PartyForm;
  // The Friends to invite.
  chosen: string[];
  // The form made the Quest.
  made: () => void;
}

// `어디서` as choosing an event fills it: the event's place as a point with its words, or nothing.
export function eventWhere(event: GlobalEvent | null): WhereStart {
  const place = event?.place ?? null;
  if (event === null || place === null) {
    return { words: '', picked: null };
  }
  return {
    words: place,
    picked: { placeId: null, position: { latitude: event.latitude, longitude: event.longitude }, words: place },
  };
}

// `어디서` of a Proposal: its Place as the map view gives one of the list, else its event's place as choosing the event
// gives it. A Place the list no longer has keeps its name alone, which sending names again.
function whereOf({ place, globalEvent }: QuestProposal, places: readonly Place[]): WhereStart {
  if (place === null) {
    return eventWhere(globalEvent);
  }
  const listed = places.find(({ id }) => id === place.id);
  const picked =
    listed === undefined
      ? null
      : { placeId: place.id, position: { latitude: listed.latitude, longitude: listed.longitude }, words: place.name };
  return { words: place.name, picked };
}

// The form 수정 on a Proposal opens: its fields as `proposalForm` fills them, with no photo or tags, the Friends to
// invite who are still the User's Friends, and its place. The event is set as it is, not chosen again, so that the
// Proposal's title and time stay.
export function proposalStart(
  proposal: QuestProposal,
  {
    announcers,
    places,
    friends,
  }: { announcers: readonly Announcer[]; places: readonly Place[]; friends: readonly Friend[] },
): Omit<ProposalStart, 'made'> {
  const chosen = proposal.invitees.map(({ id }) => id).filter((id) => friends.some((friend) => friend.id === id));
  return { form: proposalForm(proposal, announcers), chosen, ...whereOf(proposal, places) };
}
