/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import type { InterestMatches } from '@/api/interest-types';
import type { RecruitingQuest } from '@/api/party-types';
import type { GlobalEvent, LatLng } from '@/api/types';
import type { KeptNotification } from '@/api/waiting-types';
import { koreaClock, koreaDateKey, koreaDay, koreaDaysAfter } from '@/korea-time';
import type { MarkerLook } from '@/map';
import { readCardAddress } from '@/push/card-address';
import { type CardView, cardId, line } from './adapter';
import { placeGroupId } from './place-groups';
import { shortTitle } from './short-name';

// The marks of the everyday map (P05 ticket 13): only what matches the User's interests stands on it, what stands at
// one place shares one mark, and a mark carries "!" while one of its items is newly posted for the User.

// Why items stand on the map, each named by its card's id ("event:<id>", "party:<id>"). `interest`: the matches of the
// profile's hashtags and the watched interests, with whether a watched interest matched. `today`: a few of today's
// events for a User who watches nothing, faded. A starred event is meant to be a source of its own beside them.
export type MarkSource =
  | { kind: 'interest'; items: readonly { id: string; watched: boolean }[] }
  | { kind: 'today'; items: readonly { id: string }[] };

// A mark takes the first look one of its items has, in this order.
const LOOKS = ['fresh', 'plain', 'faded'] as const;
export type MarkLook = (typeof LOOKS)[number];

// An item of a mark: its card's id, the event's or the Quest's own id, its start, and whether it carries "!".
export interface MarkItem {
  id: string;
  ownId: string;
  start: string | null;
  fresh: boolean;
}

export interface InterestMark {
  // The id of the card whose marker stands for the mark: the item's own when it stands alone, else the place's.
  id: string;
  // The first item's title, with " 외 N" for the rest: "채용박람회 외 1". The words of the answer a tap opens.
  title: string;
  // What a screen reader says: the title, and that something is newly posted.
  name: string;
  look: MarkLook;
  // The items' card ids: events by their start, then parties by their next step's.
  items: readonly string[];
  events: readonly MarkItem[];
  parties: readonly MarkItem[];
}

export interface MarkInputs {
  sources: readonly MarkSource[];
  events: readonly GlobalEvent[];
  recruiting: readonly RecruitingQuest[];
  // The card ids of the items with a kept `interest-new` Notification.
  told: ReadonlySet<string>;
  // The card ids of the items whose mark was opened on this phone; null until the phone has said.
  opened: ReadonlySet<string> | null;
}

const FRESH_WORDS = '새로 올라왔어요';
// The most of today's events a User who watches nothing sees.
const TODAY_MOST = 3;
// The most ids an answer's input takes (main-server `EVENT_IDS_MAX`, `QUEST_IDS_MAX`).
const IDS_MOST = 20;

// The events held today in Korea that have not ended, by their start.
function todaysEvents(events: readonly GlobalEvent[], now: Date): GlobalEvent[] {
  return events
    .filter(
      ({ startsAt, endsAt }) =>
        koreaDaysAfter(now, new Date(startsAt)) <= 0 && Date.parse(endsAt ?? startsAt) > now.getTime(),
    )
    .toSorted((one, other) => Date.parse(one.startsAt) - Date.parse(other.startsAt))
    .slice(0, TODAY_MOST);
}

// The sources of the map: the matches, or for a User with no hashtag and no watched interest, today's first events.
export function sourcesOf(
  matches: InterestMatches,
  watchesSomething: boolean,
  events: readonly GlobalEvent[],
  now: Date,
): MarkSource[] {
  if (!watchesSomething) {
    return [{ kind: 'today', items: todaysEvents(events, now).map(({ id }) => ({ id: cardId.globalEvent(id) })) }];
  }
  const items = [
    ...matches.globalEvents.map(({ id, watched }) => ({ id: cardId.globalEvent(id), watched })),
    ...matches.quests.map(({ id, watched }) => ({ id: cardId.quest(id), watched })),
  ];
  return [{ kind: 'interest', items }];
}

// The cards of the items a kept `interest-new` Notification tells of, by the card its address opens.
export function toldItems(kept: readonly KeptNotification[]): ReadonlySet<string> {
  return new Set(
    kept.flatMap(({ kind, url }) => {
      const card = kind === 'interest-new' ? readCardAddress(url) : null;
      return card === null ? [] : [`${card.kind}:${card.id}`];
    }),
  );
}

// An item the map can draw: where it stands, its title and start, and its look.
interface Item {
  id: string;
  type: 'event' | 'party';
  // The event's or the Quest's own id.
  ownId: string;
  title: string;
  position: LatLng;
  start: string | null;
  look: MarkLook;
}

type Found = Omit<Item, 'look'>;

// Where an item stands. A party whose next step names no Place has no place on the map.
function located(id: string, { events, recruiting }: MarkInputs): Found | null {
  const event = events.find((one) => cardId.globalEvent(one.id) === id);
  if (event !== undefined) {
    const { latitude, longitude, title, startsAt } = event;
    return { id, type: 'event', ownId: event.id, title, position: { latitude, longitude }, start: startsAt };
  }
  const quest = recruiting.find((one) => cardId.quest(one.id) === id);
  const place = quest?.nextSubQuest.place ?? null;
  if (quest === undefined || place === null || place.latitude === null || place.longitude === null) {
    return null;
  }
  const position = { latitude: place.latitude, longitude: place.longitude };
  return { id, type: 'party', ownId: quest.id, title: quest.title, position, start: quest.nextSubQuest.startsAt };
}

// "!" only for a match of a watched interest told as newly posted and not opened on this phone.
function sourceLooks(source: MarkSource, { told, opened }: MarkInputs): { id: string; look: MarkLook }[] {
  if (source.kind === 'today') {
    return source.items.map(({ id }) => ({ id, look: 'faded' }));
  }
  return source.items.map(({ id, watched }) => {
    const fresh = watched && told.has(id) && opened !== null && !opened.has(id);
    return { id, look: fresh ? 'fresh' : 'plain' };
  });
}

function firstLook(looks: readonly MarkLook[]): MarkLook {
  return LOOKS.find((look) => looks.includes(look)) ?? 'plain';
}

const LAST = Number.MAX_SAFE_INTEGER;

function inOrder(one: Item, other: Item): number {
  if (one.type !== other.type) {
    return one.type === 'event' ? -1 : 1;
  }
  return (one.start === null ? LAST : Date.parse(one.start)) - (other.start === null ? LAST : Date.parse(other.start));
}

// Each item of the sources once, with the first look any of its sources gives it, in the marks' order.
function itemsOf(inputs: MarkInputs): Item[] {
  const looks = new Map<string, MarkLook>();
  for (const { id, look } of inputs.sources.flatMap((source) => sourceLooks(source, inputs))) {
    const before = looks.get(id);
    looks.set(id, before === undefined ? look : firstLook([before, look]));
  }
  return [...looks]
    .flatMap(([id, look]) => {
      const found = located(id, inputs);
      return found === null ? [] : [{ ...found, look }];
    })
    .toSorted(inOrder);
}

function markItemsOf(members: readonly Item[], type: Item['type']): MarkItem[] {
  return members
    .filter((member) => member.type === type)
    .map(({ id, ownId, start, look }) => ({ id, ownId, start, fresh: look === 'fresh' }));
}

function markOf(id: string, first: Item, members: readonly Item[]): InterestMark {
  const title = members.length === 1 ? first.title : `${first.title} 외 ${members.length - 1}`;
  const look = firstLook(members.map((member) => member.look));
  return {
    id,
    title,
    name: look === 'fresh' ? `${title} · ${FRESH_WORDS}` : title,
    look,
    items: members.map((member) => member.id),
    events: markItemsOf(members, 'event'),
    parties: markItemsOf(members, 'party'),
  };
}

// The marks of the map: the items at exactly one point share one, under the id the map's grouping gives the place
// (`place-groups.ts`); an item alone keeps its card's id. In the order of their first items.
export function marksOf(inputs: MarkInputs): InterestMark[] {
  const atPlace = new Map<string, Item[]>();
  for (const item of itemsOf(inputs)) {
    const key = placeGroupId(item.position);
    atPlace.set(key, [...(atPlace.get(key) ?? []), item]);
  }
  return [...atPlace].flatMap(([key, members]) => {
    const [first] = members;
    return first === undefined ? [] : [markOf(members.length === 1 ? first.id : key, first, members)];
  });
}

// The marks whose marker the map draws as the mark's: a mark of one item, or of a place where nothing else of the map
// stands. Where another thing (a Quest of the User's, a restaurant of a layer) shares the point, the place's own
// card stands as before, and its rows open the mark's items.
export function marksAlone(marks: readonly InterestMark[], cards: readonly CardView[]): Map<string, InterestMark> {
  const alone = marks.filter((mark) => {
    const items = new Set(mark.items);
    return cards.every(({ id, within }) => within !== mark.id || items.has(id));
  });
  return new Map(alone.map((mark) => [mark.id, mark]));
}

// What a tap on the mark asks, as asking would, and the items its answer shows, which then lose "!".
export interface MarkAsk {
  input: PlanInput;
  shown: readonly string[];
}

// The Korea day an item is asked on: its start's, or today once it started.
function askedDay(start: string | null, now: Date): string {
  return koreaDateKey(new Date(Math.max(start === null ? 0 : Date.parse(start), now.getTime())));
}

// The events of one day, that of the earliest new event, else of the earliest event; or the Quests, for a mark of
// parties only or one whose new items are all parties. So the answer of a mark with "!" holds what is new.
export function askOf({ events, parties }: InterestMark, now: Date): MarkAsk {
  const newEvent = events.find(({ fresh }) => fresh);
  const first = newEvent ?? (parties.some(({ fresh }) => fresh) ? undefined : events[0]);
  if (first === undefined) {
    const asked = parties.slice(0, IDS_MOST);
    const questIds = asked.map(({ ownId }) => ownId);
    return { input: { kind: 'quests', globalEventId: null, questIds }, shown: asked.map(({ id }) => id) };
  }
  const date = askedDay(first.start, now);
  const asked = events.filter(({ start }) => askedDay(start, now) === date).slice(0, IDS_MOST);
  return {
    input: { kind: 'events', date, eventIds: asked.map(({ ownId }) => ownId) },
    shown: asked.map(({ id }) => id),
  };
}

// A recruiting party's card, worded as an open Party's: its members, and 참여하기 (참여 신청 for an Approval Quest) to
// its post, where a User who does not hold it joins.
function partyCards(quest: RecruitingQuest, now: Date): CardView[] {
  const { id, title, holderCount, capacity, joinPolicy } = quest;
  const { startsAt, place } = quest.nextSubQuest;
  if (place === null || place.latitude === null || place.longitude === null) {
    return [];
  }
  const card: CardView = {
    id: cardId.quest(id),
    kind: 'party',
    mark: { type: 'place', place: 'party' },
    marker: { name: `파티 · ${title}`, short: shortTitle(title), count: holderCount, minutesOld: null },
    subLabel: `파티 · ${holderCount}/${capacity}명`,
    title,
    lines: [
      ...(startsAt === null ? [] : [line('clock', `${koreaDay(startsAt, now)} ${koreaClock(startsAt)}`)]),
      line('pin', place.label),
    ],
    primary: { label: joinPolicy === 'approval' ? '참여 신청' : '참여하기', action: 'post', questId: id },
    secondary: null,
    position: { latitude: place.latitude, longitude: place.longitude },
  };
  return [card];
}

// The map's cards with the marks: the events no mark holds are left out, and each recruiting party a mark holds gets a
// card after the others, unless the map holds one already. Every other card stays.
export function cardsWithMarks(
  cards: readonly CardView[],
  marks: readonly InterestMark[],
  recruiting: readonly RecruitingQuest[],
  now: Date,
): CardView[] {
  const shown = new Set(marks.flatMap(({ items }) => items));
  const known = new Set(cards.map(({ id }) => id));
  const parties = recruiting.flatMap((quest) => {
    const id = cardId.quest(quest.id);
    return shown.has(id) && !known.has(id) ? partyCards(quest, now) : [];
  });
  return [...cards.filter(({ id, kind }) => kind !== 'global-event' || shown.has(id)), ...parties];
}

// A place's or a group's look with its mark's "!" or fade; any other look, and a plain mark's, as it is.
export function markedLook(look: MarkerLook, mark: InterestMark | undefined): MarkerLook {
  if (mark === undefined || mark.look === 'plain' || !('form' in look)) {
    return look;
  }
  return mark.look === 'fresh' ? { ...look, fresh: true } : { ...look, faded: true };
}
