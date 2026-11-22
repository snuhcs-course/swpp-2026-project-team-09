/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MapScene, PlacePoint, QuestProposal } from '@/api/assistant-types';
import type { LatLng, Place } from '@/api/types';
import { koreaClock, koreaDayWord } from '@/korea-time';
import { metresBetween } from './answer-drawing';
import type { SceneSetting } from './answer-marks';
import { turnOf } from './turn';
import type { ChatBubble } from './use-chat';
import { NO_STANDINGS } from './invited-friends';

// A Proposal of the turn on screen that the map draws (P04 ticket 06): the bubble it came in, and where it meets.
export interface ShownProposal {
  bubbleId: number;
  proposal: QuestProposal;
  place: PlacePoint;
}

// Where a Proposal meets: its Place, found in the list of Places. Null when it has none, as a Proposal for a Global
// Event whose place the card names, or when its Place is not in the list: its card stays.
export function proposalPlaceOf({ place }: QuestProposal, places: readonly Place[]): PlacePoint | null {
  const found = place === null ? undefined : places.find(({ id }) => id === place.id);
  return place === null || found === undefined
    ? null
    : { placeId: found.id, label: place.name, latitude: found.latitude, longitude: found.longitude };
}

// The Proposal the turn on screen replied with alone, while it has a place to stand at: a reply with a Plan, a Lookup,
// or cards keeps its own drawing.
export function shownProposalOf(bubbles: readonly ChatBubble[], places: readonly Place[]): ShownProposal | null {
  const after = turnOf(bubbles)?.after ?? [];
  const [reply] = after;
  if (after.length !== 1 || reply === undefined || reply.role !== 'assistant' || reply.proposal === null) {
    return null;
  }
  if ((reply.answer ?? null) !== null || (reply.lookup ?? null) !== null || reply.cards.length > 0) {
    return null;
  }
  const place = proposalPlaceOf(reply.proposal, places);
  return place === null ? null : { bubbleId: reply.id, proposal: reply.proposal, place };
}

// About 80 metres a minute on foot.
const WALK_METRES_A_MINUTE = 80;

// The User at `me` and a walk from there to `at`, both none without a position: what a scene the app makes draws of the
// User (a Proposal's, a booking's).
export function meAndWalk(me: LatLng | null, at: LatLng): { mine: MapScene['people']; walk: MapScene['routes'] } {
  if (me === null) {
    return { mine: [], walk: [] };
  }
  const minutes = Math.max(1, Math.round(metresBetween(me, at) / WALK_METRES_A_MINUTE));
  return {
    mine: [{ userId: 'me', name: '나', me: true, at: me, source: 'exact', tag: '나' }],
    walk: [{ userId: 'me', role: 'me', from: me, to: at, minutes }],
  };
}

// The words a Proposal's flag says after its day: its start and who sees it ("14:00 · 비공개").
function flagWords({ startsAt, joinPolicy }: QuestProposal): string {
  return `${koreaClock(startsAt)} · ${joinPolicy === 'closed' ? '비공개' : '공개'}`;
}

// The scene the app makes for a Proposal, drawn as a Lookup's is: the flag at its place with its title, which opens its
// card, the User at `me` with a walk there, and each invited Friend at their position in `friends`, by user id, those
// whose position cannot be shown left out.
export function proposalScene(
  { proposal, place }: Pick<ShownProposal, 'proposal' | 'place'>,
  me: LatLng | null,
  friends: ReadonlyMap<string, LatLng>,
): MapScene {
  const at = { latitude: place.latitude, longitude: place.longitude };
  const invited = proposal.invitees.flatMap(({ id, name }): MapScene['people'] => {
    const position = friends.get(id);
    return position === undefined ? [] : [{ userId: id, name, me: false, at: position, source: 'building', tag: name }];
  });
  const { mine, walk } = meAndWalk(me, at);
  return {
    people: [...mine, ...invited],
    places: [{ place, role: 'pick', tag: `${proposal.title} ›` }],
    routes: walk,
    flags: [{ at, text: flagWords(proposal), role: 'place' }],
  };
}

// How a Proposal's scene is drawn: its start's day on the flag before its time ("내일(수) 14:00 · 공개").
export function proposalSetting(proposal: QuestProposal, now: Date): SceneSetting {
  return { number: null, plans: [], standings: NO_STANDINGS, day: koreaDayWord(proposal.startsAt, now) };
}
