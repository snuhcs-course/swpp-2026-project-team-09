import type { GlobalEvent, LatLng, MyParty, Party, Position, Quest } from '@/api/types';
import type { FriendView } from '@/features/friends/adapter';
import { otherHolders, partyOf, positionOf, type QuestParty, shownSubQuest } from '@/features/quests/adapter';
import { koreaClock, koreaDay } from '@/korea-time';

// What a card shows for anything pressed on the map. Its id is also the id of the marker or the Avatar.
export interface CardView {
  id: string;
  kind: 'global-event' | 'party' | 'friend' | 'party-member';
  // "공식 행사 · 컴퓨터공학부 공지"
  subLabel: string;
  title: string;
  // `icon` is the name of an icon of the design system.
  lines: { icon: string; text: string }[];
  // `route` draws the way there. `not-ready` says "준비 중이에요": the feature belongs to another task.
  primary: { label: string; action: 'route' | 'not-ready' };
  secondary: { label: string; action: 'not-ready' } | null;
  position: LatLng;
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
    const recruiting = parties.filter(({ mark }) => mark?.globalEvent?.id === event.id).length;
    const hours =
      event.endsAt === null ? koreaClock(event.startsAt) : `${koreaClock(event.startsAt)}–${koreaClock(event.endsAt)}`;
    return {
      id: `event:${event.id}`,
      kind: 'global-event',
      subLabel: announcer === undefined ? '공식 행사' : `공식 행사 · ${announcer}`,
      title: event.title,
      lines: [
        { icon: 'clock', text: `${koreaDay(event.startsAt, now)} ${hours}` },
        ...(event.place === null ? [] : [{ icon: 'pin', text: event.place }]),
        ...(recruiting === 0 ? [] : [{ icon: 'users', text: `같이 갈 파티 ${recruiting}개 모집 중` }]),
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

// A Party that others may join shows its members and how to join. A closed Party and a Shared Quest that is no
// Party's show when and where, and the way there; the frames word both as a "비공개 파티".
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
    return {
      kind: 'party',
      subLabel: `파티 · ${party.memberCount}/${party.capacity}명`,
      title: party.title,
      lines: [{ icon: 'clock', text: start === null ? label : `${koreaClock(start)} ${label}에서 출발` }],
      primary: { label: party.mine ? '파티 열기' : '참여하기', action: 'not-ready' },
      secondary: null,
    };
  }
  const shared = others === '' ? '' : ` · ${withParticle(others)}`;
  return {
    kind: 'party',
    subLabel: party === null && others === '' ? '퀘스트' : `비공개 파티${shared}`,
    title: party?.title ?? quest.title,
    lines: [
      ...(start === null ? [] : [{ icon: 'clock', text: `${koreaDay(start, now)} ${koreaClock(start)}` }]),
      { icon: 'pin', text: label },
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
    return [{ id: `party:${quest.id}`, ...card, position }];
  });
}

function friendCards({ friends }: MapSources): CardView[] {
  return friends.flatMap(({ id, name, department, detail, walk, position }): CardView[] =>
    position === null
      ? []
      : [
          {
            id: `friend:${id}`,
            kind: 'friend',
            subLabel: department,
            title: name,
            lines: [
              ...(detail === '' ? [] : [{ icon: 'info', text: detail }]),
              ...(walk === '' ? [] : [{ icon: 'route', text: walk }]),
            ],
            primary: { label: '파티 만들기', action: 'not-ready' },
            secondary: null,
            position,
          },
        ],
  );
}

// The members of the User's Party who are on the map and are not Friends: a Friend is on it already.
function partyMemberCards({ myParty, friends, positions, meId }: MapSources): CardView[] {
  return (myParty?.members ?? []).flatMap(({ id, name, department, visible }): CardView[] => {
    const position = positions.find(({ userId }) => userId === id);
    if (id === meId || !visible || position === undefined || friends.some((friend) => friend.id === id)) {
      return [];
    }
    return [
      {
        id: `party-member:${id}`,
        kind: 'party-member',
        subLabel: `${department} · 친구 아님`,
        title: name,
        lines: [{ icon: 'info', text: '활성 파티 멤버 · 위치 공유 중' }],
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
