/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// What the map adapter's unit tests build its sources from: 13:00 in Korea on Tuesday 6 October 2026, the User, two
// Friends' names and one point on the campus.

import type { RecruitingQuest } from '@/api/party-types';
import type { Friend, GlobalEvent, MyParty, Person, Position, Quest } from '@/api/types';
import type { FriendView } from '@/features/friends/adapter';
import type { MapSources } from '@/features/map/adapter';

export const NOW = new Date('2026-10-06T13:00:00+09:00');
export const MINUTE = 60_000;
export const ME: Person = { id: 'me', name: '홍길동', department: '컴퓨터공학부' };
export const MIN_JUN: Person = { id: 'min-jun', name: '김민준', department: '경영학과' };
export const SEO_YEON: Person = { id: 'seo-yeon', name: '이서연', department: '경영학과' };
export const HALL = { latitude: 37.45016, longitude: 126.95259 };
export const GATE = { placeId: null, label: '301동 앞', ...HALL };

export function sources(more: Partial<MapSources>): MapSources {
  const none = { globalEvents: [], globalEventAnnouncers: [], recruiting: [], quests: [], parties: [], friends: [] };
  return { ...none, myParty: null, positions: [], meId: ME.id, now: NOW, ...more };
}

// At 18:00 today at the point, with no end, no place and no page.
export function event(id: string, more: Partial<GlobalEvent> = {}): GlobalEvent {
  const startsAt = '2026-10-06T18:00:00+09:00';
  return {
    id,
    title: 'AI 커리어 설명회',
    description: '',
    startsAt,
    endsAt: null,
    place: null,
    ...HALL,
    sourceUrl: null,
    ...more,
  };
}

export function recruitingFor(eventId: string, id: string): RecruitingQuest {
  return {
    id,
    title: '같이 가요',
    globalEvent: { id: eventId, title: 'AI 커리어 설명회' },
    leader: MIN_JUN,
    holderCount: 1,
    capacity: 4,
    joinPolicy: 'open',
    board: 'career',
    description: '',
    createdAt: '2026-10-05T09:00:00.000Z',
    nextSubQuest: { id: 'n1', title: '모이기', startsAt: null, endsAt: null, place: null },
  };
}

// A Closed Quest the User leads alone, with one step at 17:40 today at the point.
export function quest(id: string, more: Partial<Quest> = {}): Quest {
  return {
    id,
    title: '저녁 약속',
    globalEvent: null,
    leader: ME,
    capacity: 4,
    joinPolicy: 'closed',
    holders: [ME],
    subQuests: [
      {
        id: `${id}-1`,
        attending: false,
        title: '저녁',
        startsAt: '2026-10-06T17:40:00+09:00',
        endsAt: null,
        place: GATE,
        completion: 'by_hand',
        cancelled: false,
        done: false,
        ended: false,
      },
    ],
    classQuest: false,
    waitingJoinRequests: 0,
    board: null,
    description: '',
    createdAt: '2026-10-05T09:00:00.000Z',
    ...more,
  };
}

export function measured(userId: string, ago: number): Position {
  return { userId, ...HALL, measuredAt: new Date(NOW.getTime() - ago).toISOString() };
}

// A Friend seen at the point, free, with a detail and a walk.
export function friendView(person: Person, more: Partial<FriendView> = {}): FriendView {
  const friend: Friend = { ...person, sharing: true, visible: true };
  return {
    ...friend,
    presence: 'free',
    line: '공강',
    detail: '공강 · 중앙도서관 근처',
    walk: '도보 4분',
    photo: null,
    position: HALL,
    minutesOld: null,
    ...more,
  };
}

export function member(person: Person, visible: boolean): MyParty['members'][number] {
  return { ...person, leader: false, visible };
}

export function myParty(questId: string | null, members: MyParty['members']): MyParty {
  const partyQuest = questId === null ? null : { id: questId, title: '저녁', globalEvent: null };
  return {
    id: 'party-1',
    title: '저녁 파티',
    capacity: 4,
    joinPolicy: 'open',
    quest: partyQuest,
    sharing: true,
    members,
  };
}
