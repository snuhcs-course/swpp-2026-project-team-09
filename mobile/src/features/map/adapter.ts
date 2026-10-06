import type { GlobalEvent, LatLng, MyParty, Party, Position, Presence, Quest } from '@/api/types';
import { type FriendView, keptPositions, minutesOld, withAge } from '@/features/friends/adapter';
import { otherHolders, partyOf, positionOf, type QuestParty, shownSubQuest } from '@/features/quests/adapter';
import { koreaClock, koreaDay } from '@/korea-time';
import { givenName, shortTitle } from './short-name';

// The icons a card's lines use, by their names in the design system.
export type CardIcon = 'clock' | 'pin' | 'users' | 'info' | 'route';

// What stands for the thing, at the head of its card and as its marker on the map:
// - a person: the Avatar, with the status for a Friend; `presence` is null for a member of the User's Party who is
//   no Friend, whose marker has the Party's colour; `id` is the person's own, which stays while what is shown of
//   them changes;
// - a place: the icon and the colour of its kind in the design system. The frames draw a Shared Quest as a Party.
export type CardMark =
  | { type: 'person'; id: string; name: string; photo: string | null; presence: Presence | null }
  | { type: 'place'; place: 'official' | 'party' | 'quest' };

// The thing's marker on the map, beside its `mark` and its `position`.
export interface CardMarker {
  // What a screen reader says for it: "김민준 · 공강 · 중앙도서관 근처 · 15:00까지 비어 있어요", "공식 행사 · AI 커리어 설명회".
  name: string;
  // Under the marker from the "names" level of detail on: a person's given name, "민준"; a place's title cut at a
  // word's end within 8 characters, "AI 커리어".
  short: string;
  // On a place's pin: a Party's members; the Parties that go to a Global Event, when they are more than one. 0 for
  // none, and for a person.
  count: number;
  // For a person whose position is old: how many minutes ago it was measured. The marker is dimmed and its short
  // name says so. Null otherwise.
  minutesOld: number | null;
}

// What a card shows for anything pressed on the map. Its id is also the id of the marker or the Avatar.
export interface CardView {
  id: string;
  // `shared-quest` is a Quest of the User's that no Party names, such as a dinner with a Friend.
  kind: 'global-event' | 'party' | 'shared-quest' | 'friend' | 'party-member';
  mark: CardMark;
  marker: CardMarker;
  // "공식 행사 · 컴퓨터공학부 공지"
  subLabel: string;
  title: string;
  lines: { icon: CardIcon; text: string }[];
  // `route` draws the way there. `not-ready` says "준비 중이에요": the feature belongs to another task.
  primary: { label: string; action: 'route' | 'not-ready' };
  secondary: { label: string; action: 'not-ready' } | null;
  position: LatLng;
}

// A card's id from the id of what it shows, for a part of a screen that holds the thing and not its card.
export const cardId = {
  globalEvent: (eventId: string): string => `event:${eventId}`,
  quest: (questId: string): string => `party:${questId}`,
  friend: (userId: string): string => `friend:${userId}`,
  partyMember: (userId: string): string => `party-member:${userId}`,
} as const;

type Line = CardView['lines'][number];

function line(icon: CardIcon, text: string): Line {
  return { icon, text };
}

export interface MapSources {
  globalEvents: readonly GlobalEvent[];
  globalEventAnnouncers: readonly { eventId: string; announcer: string }[];
  quests: readonly Quest[];
  parties: readonly Party[];
  myParty: MyParty | null;
  friends: readonly FriendView[];
  positions: readonly Position[];
  meId: string;
  now: Date;
}

function globalEventCards({ globalEvents, globalEventAnnouncers, parties, now }: MapSources): CardView[] {
  return globalEvents.map((event) => {
    const announcer = globalEventAnnouncers.find(({ eventId }) => eventId === event.id)?.announcer;
    const recruiting = parties.filter(({ quest }) => quest?.globalEvent?.id === event.id).length;
    const hours =
      event.endsAt === null ? koreaClock(event.startsAt) : `${koreaClock(event.startsAt)}–${koreaClock(event.endsAt)}`;
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
        line('clock', `${koreaDay(event.startsAt, now)} ${hours}`),
        ...(event.place === null ? [] : [line('pin', event.place)]),
        ...(recruiting === 0 ? [] : [line('users', `같이 갈 파티 ${recruiting}개 모집 중`)]),
      ],
      primary: { label: '같이 갈 사람 찾기', action: 'not-ready' },
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

// A Party that others may join: its members and how to join.
function openPartyCard(party: QuestParty, start: string | null, label: string): Omit<CardView, 'id' | 'position'> {
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
    primary: { label: party.mine ? '파티 열기' : '참여하기', action: 'not-ready' },
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
    return openPartyCard(party, start, label);
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

// A Friend whose position is unknown has no marker and no card. An old position adds its age to the card's line.
function friendCards({ friends }: MapSources): CardView[] {
  return friends.flatMap((friend): CardView[] => {
    const { id, name, department, presence, detail, walk, photo, position } = friend;
    const info = withAge(detail, friend.minutesOld);
    return position === null
      ? []
      : [
          {
            id: cardId.friend(id),
            kind: 'friend',
            mark: { type: 'person', id, name, photo, presence },
            marker: {
              name: detail === '' ? name : `${name} · ${detail}`,
              short: givenName(name),
              count: 0,
              minutesOld: friend.minutesOld,
            },
            subLabel: department,
            title: name,
            lines: [...(info === '' ? [] : [line('info', info)]), ...(walk === '' ? [] : [line('route', walk)])],
            primary: { label: '파티 만들기', action: 'not-ready' },
            secondary: null,
            position,
          },
        ];
  });
}

const SHARING_MEMBER = '활성 파티 멤버 · 위치 공유 중';

// The members of the User's Party who are on the map and are not Friends: a Friend is on it already. Their positions
// age as a Friend's do.
function partyMemberCards({ myParty, friends, positions, meId, now }: MapSources): CardView[] {
  const kept = keptPositions(positions, now);
  return (myParty?.members ?? []).flatMap(({ id, name, department, visible }): CardView[] => {
    const position = kept.find(({ userId }) => userId === id);
    if (id === meId || !visible || position === undefined || friends.some((friend) => friend.id === id)) {
      return [];
    }
    return [
      {
        id: cardId.partyMember(id),
        kind: 'party-member',
        mark: { type: 'person', id, name, photo: null, presence: null },
        marker: {
          name: `${name} · ${SHARING_MEMBER}`,
          short: givenName(name),
          count: 0,
          minutesOld: minutesOld(position, now),
        },
        subLabel: `${department} · 친구 아님`,
        title: name,
        lines: [line('info', withAge(SHARING_MEMBER, minutesOld(position, now)))],
        primary: { label: '파티 열기', action: 'not-ready' },
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
