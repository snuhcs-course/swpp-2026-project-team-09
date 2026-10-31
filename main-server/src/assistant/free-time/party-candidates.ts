/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type PublishedGlobalEventDto } from '../../global-events/dto/global-event.dto.js';
import { GlobalEventsService } from '../../global-events/global-events.service.js';
import { QuestBoard } from '../../generated/prisma/client.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { type EnterableQuest, RecruitingService } from '../../quests/recruiting.service.js';
import { type TravelProvider } from '../../travel/travel.js';
import { type Asker } from '../feature.js';
import { type DayItem, endOfDay, type FreeInterval, onDay, startOfDay } from './free-time.js';
import { type AfterGap, type Candidate, fitOf, type Gap } from './party-fit.js';
import { bySoonest, cardKey, type JudgedCandidate } from './travel-boxes.js';

// Which recruiting Quests and Global Events fit the gaps asked about. What is left out is neither returned nor
// explained: a Quest entering would refuse, what has no start inside a gap, what starts inside one but cannot be
// reached or left in time, and what stands at a place that is unknown.

// The services the search for candidates calls.
export interface PartyServices {
  recruiting: RecruitingService;
  globalEvents: GlobalEventsService;
  places: PlaceLookup;
  travel: TravelProvider;
}

// The part of a stretch of Free Time the User asked about.
export type AskedInterval = FreeInterval & { askedStart: Date; askedEnd: Date };

// What the User asked for beside the gaps. `clockEnd` is the clock time that ends what was asked, when one does.
export interface PartySearch {
  date: string;
  clockEnd: string | null;
  board: QuestBoard | undefined;
  departurePlace: string | undefined;
  leaveBy: string | undefined;
}

// A candidate of a gap, with what its card and the model are told of it.
type Found = Candidate & Pick<JudgedCandidate, 'kind' | 'id' | 'title'>;

function afterOf(next: DayItem | null, { date, leaveBy }: PartySearch): AfterGap | null {
  if (next === null) {
    return null;
  }
  const { start, placeId, isClass } = next;
  if (placeId !== null) {
    return { kind: 'item', at: start, placeId, isClass };
  }
  return leaveBy === undefined ? null : { kind: 'leaveBy', at: onDay(date, leaveBy) };
}

function gapOf({ start, previous, next }: AskedInterval, search: PartySearch): Gap {
  const { date, clockEnd, departurePlace } = search;
  return {
    leavesAt: start,
    origin: previous === null ? null : (previous.placeId ?? departurePlace ?? null),
    after: afterOf(next, search),
    // An item or the end of the day leaves the end to the side after the gap.
    endsBy: clockEnd === null ? null : onDay(date, clockEnd),
  };
}

function startsIn(start: Date, { askedStart, askedEnd }: AskedInterval): boolean {
  return start >= askedStart && start < askedEnd;
}

// A Quest is judged on its first Sub Quest that starts inside the gap, not on the Board's next Sub Quest.
function questIn({ id, title, subQuests }: EnterableQuest, part: AskedInterval, places: PlaceLookup): Found | null {
  const judged = subQuests
    .flatMap(({ startsAt, endsAt, place, cancelled }) => {
      const start = startsAt === null ? null : new Date(startsAt);
      return cancelled || start === null || !startsIn(start, part) ? [] : [{ start, endsAt, place }];
    })
    .toSorted((a, b) => a.start.getTime() - b.start.getTime())
    .at(0);
  const placeId = judged === undefined ? null : places.placeIdOf(judged.place);
  if (judged === undefined || placeId === null) {
    return null;
  }
  const end = judged.endsAt === null ? null : new Date(judged.endsAt);
  return { kind: 'quest', id, title, start: judged.start, end, placeId };
}

function globalEventIn(event: PublishedGlobalEventDto, part: AskedInterval, places: PlaceLookup): Found | null {
  const { id, title, startsAt, endsAt, place, latitude, longitude } = event;
  const start = startsAt === null ? null : new Date(startsAt);
  if (start === null || !startsIn(start, part)) {
    return null;
  }
  const placeId = places.placeIdOf({ placeId: null, label: place ?? '', latitude, longitude });
  if (placeId === null) {
    return null;
  }
  return { kind: 'globalEvent', id, title, start, end: endsAt === null ? null : new Date(endsAt), placeId };
}

// Every candidate that fits, each once, in the first gap it fits, soonest first.
export async function fittingCandidates(
  { recruiting, globalEvents, places, travel }: PartyServices,
  { userId, now }: Asker,
  parts: readonly AskedInterval[],
  search: PartySearch,
): Promise<JudgedCandidate[]> {
  const { date, board } = search;
  const [quests, events] = await Promise.all([
    recruiting.enterable(userId, board),
    globalEvents.searchPublished({ period: { from: startOfDay(date), to: endOfDay(date) } }, now),
  ]);
  const judged = new Map<string, JudgedCandidate>();
  for (const part of parts) {
    const gap = gapOf(part, search);
    const found = [
      ...quests.flatMap((quest) => questIn(quest, part, places) ?? []),
      ...events.flatMap((event) => globalEventIn(event, part, places) ?? []),
    ];
    for (const candidate of found) {
      const { kind, id, title, start, end } = candidate;
      const key = cardKey(kind, id);
      const box = judged.has(key) ? null : fitOf(candidate, gap, travel, now);
      if (box !== null) {
        judged.set(key, { kind, id, title, start, end, box });
      }
    }
  }
  return [...judged.values()].toSorted(bySoonest);
}
