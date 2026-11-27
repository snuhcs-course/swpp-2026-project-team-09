/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: Open and Closed Quests, led or not, with and without a Leader and a step; the plan's order, grey and
// orange steps and destination; each member state; ages at each unit's edge. Expected values: P13-01's, P06-06's and
// P06-19's criteria, in Korea's time. 활성화 is in room-adapter-activation.

import { agoWords } from '@/features/quests/room-adapter';
import { GATE, member, ME, MIN_JUN, myParty, quest, room, step } from '../support/room-sources';

describe('toRoom head', () => {
  it("an Open Quest the User leads → the Leader's row, its text, the orange step's time and place, and the fill", () => {
    const view = room();
    expect(view).toMatchObject({
      leads: true,
      editsPlan: true,
      hasPost: true,
      host: { name: '홍길동', line: '컴퓨터공학부 · 16시간 전' },
      text: '학관에서 저녁',
      time: '오늘 18:00',
      place: '301동 앞',
      fill: '3/4명',
    });
    expect(view.tags).toEqual(['#AI커리어']);
  });

  it('a Closed Quest that another leads → its text too, and no fill', () => {
    const view = room({ quest: quest({ joinPolicy: 'closed', leader: MIN_JUN }) });
    expect(view).toMatchObject({ leads: false, editsPlan: false, hasPost: false, text: '학관에서 저녁', fill: null });
    expect(view.host).toEqual({ name: '김민준', line: '경영학과 · 16시간 전' });
  });

  it('no Leader and no time kept → no row, and the department alone', () => {
    expect(room({ quest: quest({ leader: null }) }).host).toBeNull();
    expect(room({ quest: quest({ createdAt: null }) }).host).toEqual({ name: '홍길동', line: '컴퓨터공학부' });
  });

  it.each([
    ['no step', []],
    ['every step grey', [step('저녁', '2026-10-06T08:00:00+09:00', { cancelled: true })]],
  ])('%s → the 모집글’s words for none', (_, subQuests) => {
    expect(room({ quest: quest({ subQuests }) })).toMatchObject({ time: '시간 미정', place: '장소 미정' });
  });

  it('an orange step without a place → 장소 미정', () => {
    const view = room({ quest: quest({ subQuests: [step('저녁', '2026-10-07T18:00:00+09:00', { place: null })] }) });
    expect(view).toMatchObject({ time: '내일 18:00', place: '장소 미정' });
  });
});

describe('toRoom members', () => {
  it("while the User is in the Party with the Party switch off → each member's state, and none for the User", () => {
    const party = myParty('q1', [member(ME, false, true), member(MIN_JUN, true, true)], false);
    const view = room({ myParty: party });
    expect(view.members.map(({ id, state }) => [id, state?.words])).toEqual([
      ['me', undefined],
      ['min-jun', '위치 공유 중'],
      ['seo-yeon', '응답 대기'],
    ]);
  });

  it('while the User is in the Party with the Master Switch off → none for the User', () => {
    const party = myParty('q1', [member(ME, true, true), member(MIN_JUN, false, true)]);
    expect(room({ myParty: party, masterOn: false }).members[0]?.state).toBeNull();
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
  // The meeting has no end, so it is behind once 설명회 starts.
  const DURING = new Date('2026-10-06T18:30:00+09:00');

  it('steps → by their start, those without one last, with the time and the place shown', () => {
    const view = room({ quest: quest({ subQuests: plan }) });
    expect(view.plan.map(({ subQuest, time, place }) => [subQuest.id, time, place])).toEqual([
      ['모이기', '17:40', '301동 앞'],
      ['설명회', '18:00–20:00', '301동 앞'],
      ['카페', '20:00', '자하연'],
      ['없음', '', ''],
    ]);
  });

  it('before any start → the first step orange, though the User marked it done', () => {
    const view = room({ quest: quest({ subQuests: plan }) });
    expect(view.plan.find(({ subQuest }) => subQuest.id === '모이기')).toMatchObject({ over: false, next: true });
  });

  it.each([
    ['a step without an end once a later one started', 'over, and not next', '모이기', { over: true, next: false }],
    ['the first step not grey', 'next, and not over', '설명회', { over: false, next: true }],
    ['a step after the next one', 'neither', '카페', { over: false, next: false }],
    ['a step without a start, listed last', 'neither', '없음', { over: false, next: false }],
  ])('%s → %s', (_, _result, id, expected) => {
    const view = room({ quest: quest({ subQuests: plan }), now: DURING });
    expect(view.plan.find(({ subQuest }) => subQuest.id === id)).toMatchObject(expected);
  });
});

describe('toRoom destination', () => {
  const words = { placeId: null, label: '자하연', latitude: null, longitude: null };
  const noPlace = step('없음', null, { place: null });
  const cafe = step('카페', '2026-10-06T20:00:00+09:00', { place: words });
  const plan = [
    noPlace,
    cafe,
    step('모이기', '2026-10-06T17:40:00+09:00'),
    step('설명회', '2026-10-06T18:00:00+09:00', { endsAt: '2026-10-06T20:00:00+09:00', place: GATE }),
  ];
  const DURING = new Date('2026-10-06T18:30:00+09:00');

  it('the first step not grey with a point → the destination; a grey one or words alone → passed over', () => {
    const view = room({ quest: quest({ subQuests: plan }), now: DURING });
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
