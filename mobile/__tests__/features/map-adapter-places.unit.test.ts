/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: a Global Event alone and at a shared point; a Quest alone, with a Friend, with others' Party, with
// the User's and with no card. Expected values: P06-09's and P13-03's criteria (iteration 1), in Korea's time.

import { event, GATE, HALL, ME, MIN_JUN, myParty, quest, recruitingFor, sources } from '../support/map-sources';
import type { Party } from '@/api/types';
import { toCards } from '@/features/map/adapter';

describe('toCards of a Global Event', () => {
  it('an event with its announcer, place and two recruiting Quests → all of them on its card', () => {
    const [card] = toCards(
      sources({
        globalEvents: [event('e1', { endsAt: '2026-10-06T20:00:00+09:00', place: '301동 대강당' })],
        globalEventAnnouncers: [{ eventId: 'e1', announcer: '컴퓨터공학부 공지' }],
        recruiting: [recruitingFor('e1', 'r1'), recruitingFor('e1', 'r2')],
      }),
    );
    expect(card).toEqual({
      id: 'event:e1',
      kind: 'global-event',
      mark: { type: 'place', place: 'official' },
      marker: { name: '공식 행사 · AI 커리어 설명회', short: 'AI 커리어', count: 2, minutesOld: null },
      subLabel: '공식 행사 · 컴퓨터공학부 공지',
      title: 'AI 커리어 설명회',
      lines: [
        { icon: 'clock', text: '오늘 18:00–20:00' },
        { icon: 'pin', text: '301동 대강당' },
        { icon: 'users', text: '같이 갈 파티 2개 모집 중' },
      ],
      primary: { label: '같이 갈 사람 찾기', action: 'recruit', eventId: 'e1' },
      secondary: null,
      position: HALL,
    });
  });

  it('an event with one recruiting Quest and no announcer or place → no count on its pin, the plain kicker', () => {
    const [card] = toCards(sources({ globalEvents: [event('e1')], recruiting: [recruitingFor('e1', 'r1')] }));
    expect(card).toMatchObject({ subLabel: '공식 행사', marker: { count: 0 } });
    expect(card?.lines).toEqual([
      { icon: 'clock', text: '오늘 18:00' },
      { icon: 'users', text: '같이 갈 파티 1개 모집 중' },
    ]);
  });
});

describe('toCards of Global Events at one point', () => {
  const point = 'event-point:37.45016,126.95259';

  it("two events at one point and one elsewhere → the point's card first, then each, marked within it", () => {
    const elsewhere = { latitude: 37.46, longitude: 126.95 };
    const events = [event('a'), event('b', { place: '대강당' }), event('c', elsewhere)];
    const cards = toCards(sources({ globalEvents: events }));
    expect(cards.map(({ id, within }) => [id, within])).toEqual([
      [point, undefined],
      ['event:a', point],
      ['event:b', point],
      ['event:c', undefined],
    ]);
  });

  it("the point's card → named as the first event that says where, counting and listing them", () => {
    const [card] = toCards(sources({ globalEvents: [event('a'), event('b', { place: '대강당' })] }));
    expect(card).toMatchObject({
      kind: 'event-point',
      title: '대강당',
      subLabel: '공식 행사 2개',
      marker: { count: 2 },
    });
    expect(card?.choices).toEqual([
      { id: 'event:a', title: 'AI 커리어 설명회', detail: '오늘 18:00' },
      { id: 'event:b', title: 'AI 커리어 설명회', detail: '오늘 18:00' },
    ]);
  });
});

describe("toCards of the User's Quests without a Party", () => {
  it('a Quest held alone → worded and drawn as a Quest, with the way there', () => {
    const [card] = toCards(sources({ quests: [quest('q1', { title: '혼자 공부' })] }));
    expect(card).toMatchObject({
      id: 'party:q1',
      kind: 'shared-quest',
      mark: { type: 'place', place: 'quest' },
      marker: { name: '퀘스트 · 혼자 공부' },
      subLabel: '비공개 파티',
      lines: [
        { icon: 'clock', text: '오늘 17:40' },
        { icon: 'pin', text: '301동 앞' },
      ],
      primary: { label: '길찾기', action: 'route' },
      position: HALL,
    });
  });

  it('a Closed Quest held with a Friend → a 비공개 파티 with the Friend, and the line about 활성화', () => {
    const [card] = toCards(sources({ quests: [quest('q1', { holders: [ME, MIN_JUN] })] }));
    expect(card).toMatchObject({ kind: 'shared-quest', mark: { place: 'party' }, subLabel: '비공개 파티 · 김민준과' });
    expect(card?.lines.at(-1)).toEqual({ icon: 'info', text: '활성화에 참여하면 서로 위치가 공유돼요' });
  });

  it('an Open Quest no Party names → 공개 파티 with its Holders', () => {
    const [card] = toCards(sources({ quests: [quest('q1', { joinPolicy: 'open', holders: [ME, MIN_JUN] })] }));
    expect(card).toMatchObject({ kind: 'shared-quest', subLabel: '공개 파티 · 2명' });
  });

  const [step] = quest('q2').subQuests;
  const words = step === undefined ? [] : [{ ...step, place: { ...GATE, latitude: null, longitude: null } }];

  it.each([
    ['a Class Quest', quest('q1', { classQuest: true, leader: null })],
    ['a Quest whose place is words alone', quest('q2', { subQuests: words })],
  ])('%s → no card', (_, one) => {
    expect(toCards(sources({ quests: [one] }))).toEqual([]);
  });
});

describe("toCards of the User's Quests with a Party", () => {
  it("an Open Quest whose Party others run → that Party's fill, its start, and joining in the room", () => {
    const party: Party = {
      id: 'p1',
      title: 'AI 커리어 설명회 같이 가요',
      memberCount: 2,
      capacity: 4,
      joinPolicy: 'open',
      quest: { id: 'q1', title: '저녁', globalEvent: null },
      holdsQuest: true,
      friends: [],
    };
    const quests = [quest('q1', { joinPolicy: 'open', holders: [ME, MIN_JUN] })];
    const [card] = toCards(sources({ quests, parties: [party] }));
    expect(card).toMatchObject({
      kind: 'party',
      marker: { name: '파티 · AI 커리어 설명회 같이 가요', short: 'AI 커리어', count: 2 },
      subLabel: '파티 · 2/4명',
      lines: [{ icon: 'clock', text: '17:40 301동 앞에서 출발' }],
      primary: { label: '참여하기', action: 'room', questId: 'q1' },
    });
  });

  it('an Open Quest whose Party the User is in → 파티 열기', () => {
    const mine = myParty('q1', [{ ...ME, leader: true, visible: true }]);
    const [card] = toCards(sources({ quests: [quest('q1', { joinPolicy: 'open' })], myParty: mine }));
    expect(card).toMatchObject({ subLabel: '파티 · 1/4명', primary: { label: '파티 열기', action: 'room' } });
  });
});
