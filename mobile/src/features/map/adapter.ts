import type { RecruitingQuest } from '@/api/party-types';
import type { GlobalEvent, LatLng, MyParty, Party, Position, Presence, Quest } from '@/api/types';
import { eventTime, recruitingCounts } from '@/features/events/adapter';
import { type FriendView, keptPositions, minutesOld } from '@/features/friends/adapter';
import { otherHolders, partyOf, positionOf, type QuestParty, shownSubQuest } from '@/features/quests/adapter';
import { koreaClock, koreaDay } from '@/korea-time';
import { givenName, shortTitle } from './short-name';

// The icons a card's lines use, by their names in the design system.
export type CardIcon = 'clock' | 'pin' | 'users' | 'info' | 'route' | 'meal';

// What stands for the thing, at the head of its card and as its marker on the map:
// - a person: the Avatar, with the status for a Friend; `presence` is null for a member of the User's Party who is
//   no Friend, whose marker has the Party's colour; `id` is the person's own, which stays while what is shown of
//   them changes;
// - a place: the icon and the colour of its kind in the design system. The frames draw a Shared Quest as a Party, and a
//   shuttle's vehicle as its stops.
export type CardMark =
  // `stale`: the position is over two minutes old, and the Avatar is dimmed.
  | { type: 'person'; id: string; name: string; photo: string | null; presence: Presence | null; stale: boolean }
  | { type: 'place'; place: 'official' | 'party' | 'quest' | 'dining' | 'shuttle' };

// The thing's marker on the map, beside its `mark` and its `position`.
export interface CardMarker {
  // What a screen reader says for it: "김민준 · 공강 · 중앙도서관 근처 · 15:00까지 비어 있어요", "공식 행사 · AI 커리어 설명회".
  name: string;
  // Under the marker from the "names" level of detail on: a person's given name, "민준"; a place's title cut at a
  // word's end within 8 characters, "AI 커리어".
  short: string;
  // On a place's pin: a Party's members; the Quests that gather for a Global Event, when they are more than one. 0
  // for none, and for a person.
  count: number;
  // For a person whose position is old: how many minutes ago it was measured. The marker is dimmed and its short
  // name says so. Null otherwise.
  minutesOld: number | null;
}

// What a card shows for anything pressed on the map. Its id is also the id of the marker or the Avatar.
export interface CardView {
  id: string;
  // `shared-quest` is a Quest of the User's that no Party names, such as a dinner with a Friend. `dining` is the
  // Place of restaurants with menus today, `shuttle-stop` and `shuttle-vehicle` the shuttle's, while their layer is
  // on.
  kind:
    | 'global-event'
    | 'party'
    | 'shared-quest'
    | 'friend'
    | 'party-member'
    | 'dining'
    | 'shuttle-stop'
    | 'shuttle-vehicle';
  mark: CardMark;
  marker: CardMarker;
  // "공식 행사 · 컴퓨터공학부 공지"
  subLabel: string;
  title: string;
  lines: { icon: CardIcon; text: string }[];
  // `route` draws the way there; `room` opens the Quest's room; `active-party` opens the room of the User's Party's
  // Quest; `recruit` opens 파티 만들기 for the Global Event; `meetup` opens the Meetup form for the Friend. `menu` opens
  // the menu panel at the restaurant. `shuttle-line` shows the shuttle's whole line. `not-ready` says "준비 중이에요":
  // the feature belongs to another task. Null for a card without one.
  primary:
    | { label: string; action: 'route' | 'active-party' | 'not-ready' | 'shuttle-line' }
    | { label: string; action: 'menu'; restaurant: string }
    | { label: string; action: 'room'; questId: string }
    | { label: string; action: 'recruit'; eventId: string }
    | { label: string; action: 'meetup'; userId: string; name: string }
    | null;
  secondary: { label: string; action: 'not-ready' } | null;
  position: LatLng;
  // For a thing that glides on the map other than a person, how long its glide to a new position takes. A person's
  // Avatar glides as the positions come.
  glideMs?: number;
}

// A card's id from the id of what it shows, for a part of a screen that holds the thing and not its card.
export const cardId = {
  globalEvent: (eventId: string): string => `event:${eventId}`,
  quest: (questId: string): string => `party:${questId}`,
  friend: (userId: string): string => `friend:${userId}`,
  partyMember: (userId: string): string => `party-member:${userId}`,
  dining: (placeId: string): string => `dining:${placeId}`,
  shuttleStop: (stopId: string): string => `shuttle-stop:${stopId}`,
  shuttleVehicle: (carId: string): string => `shuttle-vehicle:${carId}`,
} as const;

type Line = CardView['lines'][number];

function line(icon: CardIcon, text: string): Line {
  return { icon, text };
}

export interface MapSources {
  globalEvents: readonly GlobalEvent[];
  globalEventAnnouncers: readonly { eventId: string; announcer: string }[];
  recruiting: readonly RecruitingQuest[];
  quests: readonly Quest[];
  parties: readonly Party[];
  myParty: MyParty | null;
  friends: readonly FriendView[];
  positions: readonly Position[];
  meId: string;
  now: Date;
}

function globalEventCards({ globalEvents, globalEventAnnouncers, recruiting: gathering, now }: MapSources): CardView[] {
  const counts = recruitingCounts(gathering);
  return globalEvents.map((event) => {
    const announcer = globalEventAnnouncers.find(({ eventId }) => eventId === event.id)?.announcer;
    const recruiting = counts.get(event.id) ?? 0;
    return {
      id: cardId.globalEvent(event.id),
      kind: 'global-event',
      mark: { type: 'place', place: 'official' },
      marker: {
        name: `공식 행사 · ${event.title}`,
        short: shortTitle(event.title),
        count: recruiting > 1 ? recruiting : 0,
        minutesOld: null,
      },
      subLabel: announcer === undefined ? '공식 행사' : `공식 행사 · ${announcer}`,
      title: event.title,
      lines: [
        line('clock', eventTime(event, now)),
        ...(event.place === null ? [] : [line('pin', event.place)]),
        ...(recruiting === 0 ? [] : [line('users', `같이 갈 파티 ${recruiting}개 모집 중`)]),
      ],
      primary: { label: '같이 갈 사람 찾기', action: 'recruit', eventId: event.id },
      secondary: null,
      position: { latitude: event.latitude, longitude: event.longitude },
    };
  });
}

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const FINALS = 28;

// "김민준과", "최유나와": the particle follows the last syllable's final consonant.
function withParticle(words: string): string {
  const last = words.codePointAt(words.length - 1) ?? 0;
  const open = last >= HANGUL_FIRST && last <= HANGUL_LAST && (last - HANGUL_FIRST) % FINALS === 0;
  return `${words}${open ? '와' : '과'}`;
}

// A Party that others may join: its members and how to join, in the Quest's room.
function openPartyCard(
  questId: string,
  party: QuestParty,
  start: string | null,
  label: string,
): Omit<CardView, 'id' | 'position'> {
  return {
    kind: 'party',
    mark: { type: 'place', place: 'party' },
    marker: {
      name: `파티 · ${party.title}`,
      short: shortTitle(party.title),
      count: party.memberCount,
      minutesOld: null,
    },
    subLabel: `파티 · ${party.memberCount}/${party.capacity}명`,
    title: party.title,
    lines: [line('clock', start === null ? label : `${koreaClock(start)} ${label}에서 출발`)],
    primary: { label: party.mine ? '파티 열기' : '참여하기', action: 'room', questId },
    secondary: null,
  };
}

// A Party that others may join shows its members and how to join. A closed Party and a Shared Quest that is no
// Party's show when and where, and the way there; the frames word both as a "비공개 파티" and draw both as a Party. A
// Quest the User holds alone is worded and drawn as a Quest.
function partyCard(
  quest: Quest,
  party: QuestParty | null,
  others: string,
  now: Date,
): Omit<CardView, 'id' | 'position'> {
  const subQuest = shownSubQuest(quest);
  const start = subQuest?.startsAt ?? null;
  const label = subQuest?.place?.label ?? '';
  if (party !== null && party.joinPolicy !== 'closed') {
    return openPartyCard(quest.id, party, start, label);
  }
  const alone = party === null && others === '';
  const title = party?.title ?? quest.title;
  return {
    kind: party === null ? 'shared-quest' : 'party',
    mark: { type: 'place', place: alone ? 'quest' : 'party' },
    marker: { name: `${alone ? '퀘스트' : '파티'} · ${title}`, short: shortTitle(title), count: 0, minutesOld: null },
    subLabel: alone ? '퀘스트' : `비공개 파티${others === '' ? '' : ` · ${withParticle(others)}`}`,
    title,
    lines: [
      ...(start === null ? [] : [line('clock', `${koreaDay(start, now)} ${koreaClock(start)}`)]),
      line('pin', label),
      ...(party === null && !alone ? [line('info', '활성화에 참여하면 서로 위치가 공유돼요')] : []),
    ],
    primary: { label: '길찾기', action: 'route' },
    secondary: null,
  };
}

// A Party is where and when its Quest is, and the User reads only the Quests the User holds. So what stands on the
// map is the User's own Quests with a place; a listed Party of others has no place to stand on.
function questCards({ quests, myParty, parties, meId, now }: MapSources): CardView[] {
  return quests.flatMap((quest): CardView[] => {
    const position = positionOf(shownSubQuest(quest));
    if (quest.classQuest || position === null) {
      return [];
    }
    const card = partyCard(quest, partyOf(quest, myParty, parties), otherHolders(quest, meId), now);
    return [{ id: cardId.quest(quest.id), ...card, position }];
  });
}

// How old a person's last position is, in minutes, once it is old enough to dim: null while it is fresh, and
// `Infinity` once it is too old to show.
function staleMinutes({ positions, now }: MapSources, userId: string): number | null {
  const position = positions.find((one) => one.userId === userId);
  if (position === undefined) {
    return null;
  }
  return keptPositions([position], now).length === 0 ? Number.POSITIVE_INFINITY : minutesOld(position, now);
}

function staleLine(minutes: number): Line {
  return line('info', `마지막 위치 ${minutes}분 전`);
}

// A Friend whose position is unknown, or older than ten minutes, has no marker and no card.
function friendCards(sources: MapSources): CardView[] {
  return sources.friends.flatMap(({ id, name, department, presence, detail, walk, photo, position }): CardView[] => {
    const stale = staleMinutes(sources, id);
    if (position === null || stale === Number.POSITIVE_INFINITY) {
      return [];
    }
    const info = stale === null ? (detail === '' ? [] : [line('info', detail)]) : [staleLine(stale)];
    return [
      {
        id: cardId.friend(id),
        kind: 'friend',
        mark: { type: 'person', id, name, photo, presence, stale: stale !== null },
        marker: {
          name: detail === '' ? name : `${name} · ${detail}`,
          short: givenName(name),
          count: 0,
          minutesOld: stale,
        },
        subLabel: department,
        title: name,
        lines: [...info, ...(walk === '' ? [] : [line('route', walk)])],
        primary: { label: '파티 만들기', action: 'meetup', userId: id, name },
        secondary: null,
        position,
      },
    ];
  });
}

const SHARING_MEMBER = '활성 파티 멤버 · 위치 공유 중';

// The members of the User's Party who are on the map and are not Friends: a Friend is on it already.
function partyMemberCards(sources: MapSources): CardView[] {
  const { myParty, friends, positions, meId } = sources;
  return (myParty?.members ?? []).flatMap(({ id, name, department, visible }): CardView[] => {
    const position = positions.find(({ userId }) => userId === id);
    const stale = staleMinutes(sources, id);
    if (
      id === meId ||
      !visible ||
      position === undefined ||
      stale === Number.POSITIVE_INFINITY ||
      friends.some((friend) => friend.id === id)
    ) {
      return [];
    }
    return [
      {
        id: cardId.partyMember(id),
        kind: 'party-member',
        mark: { type: 'person', id, name, photo: null, presence: null, stale: stale !== null },
        marker: { name: `${name} · ${SHARING_MEMBER}`, short: givenName(name), count: 0, minutesOld: stale },
        subLabel: `${department} · 친구 아님`,
        title: name,
        lines: [stale === null ? line('info', SHARING_MEMBER) : staleLine(stale)],
        primary: { label: '파티 열기', action: 'active-party' },
        secondary: null,
        position: { latitude: position.latitude, longitude: position.longitude },
      },
    ];
  });
}

// One card for each thing on the map that a press opens.
export function toCards(sources: MapSources): CardView[] {
  return [...globalEventCards(sources), ...questCards(sources), ...friendCards(sources), ...partyMemberCards(sources)];
}
