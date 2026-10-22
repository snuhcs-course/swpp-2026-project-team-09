/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: Open and Closed Quests, led or not; 활성화's four states; the plan's order, next step and destination;
// each member state; ages at each unit's edge. Expected values: P13-01's and P06-06's criteria, in Korea's time.

import type { ShownQuest } from '@/api/quest-parts-types';
import type { MyParty, Party, Person, SubQuest } from '@/api/types';
import { agoWords, type RoomSources, toRoom } from '@/features/quests/room-adapter';

const ME: Person = { id: 'me', name: '홍길동', department: '컴퓨터공학부' };
const MIN_JUN: Person = { id: 'min-jun', name: '김민준', department: '경영학과' };
const SEO_YEON: Person = { id: 'seo-yeon', name: '이서연', department: '경영학과' };
const GATE = { placeId: null, label: '301동 앞', latitude: 37.45016, longitude: 126.95259 };

function step(id: string, startsAt: string | null, more: Partial<SubQuest> = {}): SubQuest {
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

function quest(more: Partial<ShownQuest> = {}): ShownQuest {
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

function myParty(questId: string | null, members: MyParty['members'], sharing = true): MyParty {
  const partyQuest = questId === null ? null : { id: questId, title: '저녁', globalEvent: null };
  return { id: 'party-1', title: '저녁 파티', capacity: 4, joinPolicy: 'closed', quest: partyQuest, sharing, members };
}

function member(person: Person, leader: boolean, visible: boolean): MyParty['members'][number] {
  return { ...person, leader, visible };
}

const LISTED: Party = {
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

function room(more: Partial<RoomSources> = {}): ReturnType<typeof toRoom> {
  return toRoom({ quest: quest(), myParty: null, parties: [], declined: [], seenFriends: [], meId: ME.id, ...more });
}

describe('toRoom head', () => {
  it('an Open Quest the User leads → the fill, 내가 만든 파티, a post and the places left', () => {
    const view = room();
    expect(view.badges).toEqual([
      { label: '파티 · 3/4명', tone: 'party' },
      { label: '내가 만든 파티', tone: 'warning' },
    ]);
    expect(view).toMatchObject({ leads: true, editsPlan: true, hasPost: true, text: '', left: '1자리 남음' });
    expect(view.tags).toEqual(['#AI커리어']);
  });

  it('a Closed Quest for a Global Event that another leads → the count, 비공개, the event, its text in the room', () => {
    const closed = quest({
      joinPolicy: 'closed',
      leader: MIN_JUN,
      globalEvent: { id: 'e1', title: 'AI 커리어 설명회' },
    });
    const view = room({ quest: closed });
    expect(view.badges).toEqual([
      { label: '파티 · 3명', tone: 'party' },
      { label: '비공개', tone: 'neutral', icon: 'lock' },
      { label: 'AI 커리어 설명회', tone: 'official' },
    ]);
    expect(view).toMatchObject({ leads: false, editsPlan: false, hasPost: false, text: '학관에서 저녁', left: null });
  });
});

describe('toRoom 활성화', () => {
  it('no Party runs for the Quest → none, and no member state', () => {
    const view = room();
    expect(view.activation).toEqual({ state: 'none' });
    expect(view.members.map(({ state }) => state)).toEqual([null, null, null]);
  });

  it("the User is in the Quest's Party → in, counting the members the User sees and the User", () => {
    const party = myParty('q1', [member(ME, true, true), member(MIN_JUN, false, true), member(SEO_YEON, false, false)]);
    expect(room({ myParty: party }).activation).toEqual({ state: 'in', sharing: 2, leadsParty: true, switchOn: true });
  });

  it('a Party runs without the User, who has not answered → waiting, with its Leader', () => {
    const view = room({ parties: [LISTED] });
    expect(view.activation).toEqual({ state: 'waiting', partyId: 'party-2', title: '저녁 파티', leader: '김민준' });
  });

  it('a Party whose entry names no Leader → waiting, with no Leader', () => {
    const { leader: _, ...unnamed } = LISTED;
    expect(room({ parties: [unnamed] }).activation).toMatchObject({ state: 'waiting', leader: null });
  });

  it('a Party the User declined on this phone → declined', () => {
    const view = room({ parties: [LISTED], declined: ['party-2'] });
    expect(view.activation).toEqual({ state: 'declined', partyId: 'party-2', title: '저녁 파티' });
  });

  it("the User in another Quest's Party → that Party as the other one, which the User leads", () => {
    const view = room({ myParty: myParty('q9', [member(ME, true, true)]) });
    expect(view.otherParty).toEqual({ title: '저녁 파티', leads: true });
  });

  it("the User in the Quest's own Party → no other one", () => {
    expect(room({ myParty: myParty('q1', [member(ME, true, true)]) }).otherParty).toBeNull();
  });
});

describe('toRoom members', () => {
  it("while the User is in the Party → each member's state", () => {
    const party = myParty('q1', [member(ME, false, true), member(MIN_JUN, true, true)], false);
    const view = room({ myParty: party });
    expect(view.members.map(({ id, state }) => [id, state?.words])).toEqual([
      ['me', '공유 일시정지'],
      ['min-jun', '위치 공유 중'],
      ['seo-yeon', '응답 대기'],
    ]);
  });

  it.each([
    ['the User, sharing', '위치 공유 중', 'me'],
    ['a member the User does not see', '위치 꺼짐', 'min-jun'],
  ])('%s → %s', (_, words, id) => {
    const party = myParty('q1', [member(ME, true, true), member(MIN_JUN, false, false)]);
    expect(room({ myParty: party }).members.find((one) => one.id === id)?.state?.words).toBe(words);
  });

  const seenParty = myParty('q1', [member(ME, true, true), member(MIN_JUN, false, true)]);

  it.each([
    ['a Friend the User sees', { seenFriends: ['seo-yeon'] }, 'seo-yeon'],
    ['a member of the Party the User sees', { myParty: seenParty }, 'min-jun'],
  ])('%s → seen', (_, sources, id) => {
    expect(room(sources).members.find((one) => one.id === id)?.seen).toBe(true);
  });

  it.each([
    ['a Holder the User does not see', {}, 'min-jun'],
    ['the User, among the Friends seen', { seenFriends: ['me'] }, 'me'],
    ['the User, seen in the Party', { myParty: seenParty }, 'me'],
  ])('%s → not seen', (_, sources, id) => {
    expect(room(sources).members.find((one) => one.id === id)?.seen).toBe(false);
  });

  it("the Quest's Leader and the User → marked so", () => {
    const view = room({ quest: quest({ leader: MIN_JUN }) });
    expect(view.members.map(({ leader, me }) => [leader, me])).toEqual([
      [false, true],
      [true, false],
      [false, false],
    ]);
  });
});

describe('toRoom plan', () => {
  const noPlace = step('없음', null, { place: null });
  const words = { placeId: null, label: '자하연', latitude: null, longitude: null };
  const cafe = step('카페', '2026-10-06T20:00:00+09:00', { place: words });
  const plan = [
    noPlace,
    cafe,
    step('모이기', '2026-10-06T17:40:00+09:00', { done: true }),
    step('설명회', '2026-10-06T18:00:00+09:00', { endsAt: '2026-10-06T20:00:00+09:00', place: GATE }),
  ];

  it('steps → by their start, those without one last, with the time and the place shown', () => {
    const view = room({ quest: quest({ subQuests: plan }) });
    expect(view.plan.map(({ subQuest, time, place }) => [subQuest.id, time, place])).toEqual([
      ['모이기', '17:40', '301동 앞'],
      ['설명회', '18:00–20:00', '301동 앞'],
      ['카페', '20:00', '자하연'],
      ['없음', '', ''],
    ]);
  });

  it.each([
    ['a step done', 'over, and not next', '모이기', { over: true, next: false }],
    ['the first step not done, ended or cancelled', 'next, and not over', '설명회', { over: false, next: true }],
    ['a step after the next one', 'neither', '카페', { over: false, next: false }],
  ])('%s → %s', (_, _result, id, expected) => {
    const view = room({ quest: quest({ subQuests: plan }) });
    expect(view.plan.find(({ subQuest }) => subQuest.id === id)).toMatchObject(expected);
  });

  it('the first step ahead with a point → the destination; one done or with words alone → passed over', () => {
    const view = room({ quest: quest({ subQuests: plan }) });
    expect(view.destination).toEqual({ label: '301동 앞', at: { latitude: 37.45016, longitude: 126.95259 } });
  });

  it('every step ahead without a point → no destination', () => {
    const view = room({ quest: quest({ subQuests: [noPlace, cafe] }) });
    expect(view.destination).toBeNull();
  });

  it.each([
    ['ended', { ended: true }],
    ['cancelled', { cancelled: true }],
  ])('a step %s → over, and not next', (_, more) => {
    const [view] = room({ quest: quest({ subQuests: [step('a', '2026-10-06T18:00:00+09:00', more)] }) }).plan;
    expect(view).toMatchObject({ over: true, next: false });
  });
});

describe('agoWords', () => {
  const now = new Date('2026-10-06T13:00:00+09:00');

  it.each([
    ['59 seconds', 59_000, '방금'],
    ['a minute', 60_000, '1분 전'],
    ['59 minutes', 59 * 60_000, '59분 전'],
    ['an hour', 60 * 60_000, '1시간 전'],
    ['23 hours 59 minutes', (24 * 60 - 1) * 60_000, '23시간 전'],
    ['a day', 24 * 60 * 60_000, '1일 전'],
    ['3 days', 3 * 24 * 60 * 60_000, '3일 전'],
  ])('%s ago → "%s"', (_, ago, expected) => {
    expect(agoWords(new Date(now.getTime() - ago).toISOString(), now)).toBe(expected);
  });
});
