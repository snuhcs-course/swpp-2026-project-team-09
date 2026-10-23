/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { CardView } from '@/features/map/adapter';
import { groupedByPlace } from '@/features/map/place-groups';

// The things that stand at one place on the main map, grouped into one marker whose card lists them by kind.

const HALL = { latitude: 37.45016, longitude: 126.95259 };
// 301동 앞, a few metres from the hall: near it, not at it.
const FRONT = { latitude: 37.45091, longitude: 126.95289 };

type Place = Extract<CardView['mark'], { type: 'place' }>['place'];

function placeCard(
  id: string,
  kind: CardView['kind'],
  place: Place,
  title: string,
  lines: CardView['lines'],
): CardView {
  return {
    id,
    kind,
    mark: { type: 'place', place },
    marker: { name: `${title} 마커`, short: title, count: 0, minutesOld: null },
    subLabel: '',
    title,
    lines,
    primary: null,
    secondary: null,
    position: HALL,
  };
}

const EVENT = placeCard('event:e1', 'global-event', 'official', 'AI 커리어 설명회', [
  { icon: 'clock', text: '오늘 18:00–20:00' },
  { icon: 'pin', text: '301동 대강당' },
]);
const TALK = placeCard('event:e4', 'global-event', 'official', '컴퓨터공학부 취업 특강', [
  { icon: 'clock', text: '오늘 15:00' },
  { icon: 'pin', text: '301동 대강당' },
]);
const PARTY = placeCard('party:q-ai', 'party', 'party', 'AI 커리어 설명회 같이 가요', [
  { icon: 'clock', text: '17:40 301동 앞에서 출발' },
]);
const DINNER = placeCard('party:q-dinner', 'shared-quest', 'party', '저녁 약속', [
  { icon: 'clock', text: '오늘 20:10' },
  { icon: 'pin', text: '301동 식당 앞' },
]);
const RUN = placeCard('party:q-run', 'shared-quest', 'quest', '혼자 달리기', [{ icon: 'clock', text: '오늘 21:00' }]);
const DINING = placeCard('dining:place-301', 'dining', 'dining', '301동식당', [
  { icon: 'pin', text: '301동' },
  { icon: 'meal', text: '오늘 점심 · 저녁' },
]);
const STOP = placeCard('shuttle-stop:stop-8', 'shuttle-stop', 'shuttle', '301동 정류장', [
  { icon: 'route', text: '다음 정류장 유전공학연구소' },
]);

const FRIEND: CardView = {
  ...placeCard('friend:f1', 'friend', 'party', '김민준', []),
  mark: { type: 'person', id: 'f1', name: '김민준', photo: null, presence: 'free', stale: false },
};
const MEMBER: CardView = {
  ...placeCard('party-member:pm1', 'party-member', 'party', '오현우', []),
  mark: { type: 'person', id: 'pm1', name: '오현우', photo: null, presence: null, stale: false },
};
const BUS: CardView = {
  ...placeCard('shuttle-vehicle:c1', 'shuttle-vehicle', 'shuttle', '교내 순환 셔틀', []),
  glideMs: 0,
};

const GROUP_ID = 'place:37.45016,126.95259';

describe('things at the same coordinates', () => {
  it('become one group of their kinds, which stands where the first was and lists each by its kind', () => {
    const cards = groupedByPlace([EVENT, PARTY]);

    expect(cards.map(({ id }) => id)).toEqual([GROUP_ID, EVENT.id, PARTY.id]);
    const [group, event, party] = cards;
    expect(group).toMatchObject({
      kind: 'place-group',
      mark: { type: 'group', kinds: ['official', 'party'] },
      marker: { name: '행사 1개 · 파티 1개 · 301동 대강당', count: 0 },
      subLabel: '행사 1개 · 파티 1개',
      title: '301동 대강당',
      position: HALL,
      primary: null,
      choices: [
        { id: EVENT.id, kind: 'official', title: 'AI 커리어 설명회', detail: '오늘 18:00–20:00' },
        { id: PARTY.id, kind: 'party', title: 'AI 커리어 설명회 같이 가요', detail: '17:40 301동 앞에서 출발' },
      ],
    });
    // Each keeps its card, for a row that opens it, and draws no marker of its own.
    expect(event).toEqual({ ...EVENT, within: GROUP_ID });
    expect(party).toEqual({ ...PARTY, within: GROUP_ID });
  });

  it('group across every kind of place: a Shared Quest as a Party, a Quest held alone, a restaurant, a stop', () => {
    const [group] = groupedByPlace([STOP, DINING, RUN, DINNER, PARTY, EVENT]);

    expect(group).toMatchObject({
      mark: { type: 'group', kinds: ['official', 'party', 'quest', 'dining', 'shuttle'] },
      subLabel: '행사 1개 · 파티 2개 · 퀘스트 1개 · 식당 1개 · 셔틀 1개',
      // Named where the event says it is, before the restaurant's Place and a Party's place.
      title: '301동 대강당',
    });
    expect(group?.choices?.map(({ kind, detail }) => [kind, detail])).toEqual([
      ['shuttle', '다음 정류장 유전공학연구소'],
      ['dining', '오늘 점심 · 저녁'],
      ['quest', '오늘 21:00'],
      ['party', '오늘 20:10'],
      ['party', '17:40 301동 앞에서 출발'],
      ['official', '오늘 18:00–20:00'],
    ]);
  });
});

describe('a group of things at one place', () => {
  it("is named by a restaurant's Place, a Party's place or a stop when no event says where", () => {
    expect(groupedByPlace([PARTY, DINING])[0]?.title).toBe('301동');
    expect(groupedByPlace([PARTY, DINNER])[0]?.title).toBe('301동 식당 앞');
    expect(groupedByPlace([PARTY, STOP])[0]?.title).toBe('301동 정류장');
  });

  it("of one kind only is that kind's pin with their count, as Global Events at one point were", () => {
    const [group] = groupedByPlace([EVENT, TALK]);

    expect(group).toMatchObject({
      id: GROUP_ID,
      kind: 'place-group',
      mark: { type: 'place', place: 'official' },
      marker: { name: '공식 행사 2개 · 301동 대강당', count: 2 },
      subLabel: '공식 행사 2개',
      title: '301동 대강당',
    });
  });
});

describe('the grouping', () => {
  it('never takes in an Avatar: people and shuttle vehicles move, and stay as they are', () => {
    expect(groupedByPlace([FRIEND, EVENT, MEMBER, BUS])).toEqual([FRIEND, EVENT, MEMBER, BUS]);
  });

  it('makes no group of one, and none of things that are only near each other', () => {
    const near = { ...PARTY, position: FRONT };

    expect(groupedByPlace([EVENT, near])).toEqual([EVENT, near]);
  });

  it('names a group by its place alone, so that it stays while things come to it and leave it', () => {
    expect(groupedByPlace([PARTY, DINING])[0]?.id).toBe(GROUP_ID);
    expect(groupedByPlace([STOP, EVENT, TALK])[0]?.id).toBe(GROUP_ID);
  });
});
