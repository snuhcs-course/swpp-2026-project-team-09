/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The sources of a Quest's room for the room adapter's unit tests, in Korea's time.

import type { ShownQuest } from '@/api/quest-parts-types';
import type { MyParty, Party, Person, SubQuest } from '@/api/types';
import { type PartyPerson, type RoomSources, toRoom } from '@/features/quests/room-adapter';

export const ME: Person = { id: 'me', name: '홍길동', department: '컴퓨터공학부' };
export const MIN_JUN: Person = { id: 'min-jun', name: '김민준', department: '경영학과' };
export const SEO_YEON: Person = { id: 'seo-yeon', name: '이서연', department: '경영학과' };
export const GATE = { placeId: null, label: '301동 앞', latitude: 37.45016, longitude: 126.95259 };

export function step(id: string, startsAt: string | null, more: Partial<SubQuest> = {}): SubQuest {
  return {
    id,
    attending: false,
    title: id,
    startsAt,
    endsAt: null,
    place: GATE,
    completion: 'by_hand',
    cancelled: false,
    done: false,
    ended: false,
    ...more,
  };
}

export function quest(more: Partial<ShownQuest> = {}): ShownQuest {
  return {
    id: 'q1',
    title: '저녁 같이 먹어요',
    globalEvent: null,
    leader: ME,
    capacity: 4,
    joinPolicy: 'open',
    holders: [ME, MIN_JUN, SEO_YEON],
    subQuests: [step('저녁', '2026-10-06T18:00:00+09:00')],
    classQuest: false,
    waitingJoinRequests: 0,
    board: 'meal',
    description: '학관에서 저녁',
    createdAt: '2026-10-05T09:00:00.000Z',
    photo: null,
    tags: ['AI커리어'],
    faces: [],
    ...more,
  };
}

export function myParty(questId: string | null, members: MyParty['members'], sharing = true): MyParty {
  const partyQuest = questId === null ? null : { id: questId, title: '저녁', globalEvent: null };
  return { id: 'party-1', title: '저녁 파티', capacity: 4, joinPolicy: 'closed', quest: partyQuest, sharing, members };
}

export function member(person: Person, leader: boolean, visible: boolean): MyParty['members'][number] {
  return { ...person, leader, visible };
}

export const LISTED: Party = {
  id: 'party-2',
  title: '저녁 파티',
  memberCount: 2,
  capacity: 4,
  joinPolicy: 'closed',
  quest: { id: 'q1', title: '저녁', globalEvent: null },
  leader: { id: 'min-jun', name: '김민준' },
  holdsQuest: true,
  friends: [],
};

// The morning of the Quest's day, 2026-10-06 10:00 in Korea.
export const NOW = new Date('2026-10-06T10:00:00+09:00');

export function room(more: Partial<RoomSources> = {}): ReturnType<typeof toRoom> {
  return toRoom({
    quest: quest(),
    myParty: null,
    parties: [],
    declined: [],
    seenFriends: [],
    meId: ME.id,
    masterOn: true,
    now: NOW,
    ...more,
  });
}

// One of those in a running Party, as the room names them.
export function people(...persons: Person[]): PartyPerson[] {
  return persons.map(({ id, name }) => ({ id, name, me: id === ME.id }));
}
