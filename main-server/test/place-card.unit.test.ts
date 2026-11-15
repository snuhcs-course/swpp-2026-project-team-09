/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { mealAt } from '../src/assistant/lookup/place-lookup.js';
import { dish, facts, MINSU, minsu, minsuIn302, NOTE, plain, pressed, strong } from './place-card.js';
import { classAt, id, ME, point, position, readCampus, TUESDAY } from './way-example.js';

// A pressed building's card (wireframe row 6, boards a1, a2, a3, and a14) on the seed's Places and walking table. On
// Tuesday 2026-11-17 at 12:10 the User is in 301동 after a Class there until 11:50, with the next at 13:00 in 24동; on
// Friday 2026-11-20 at 13:50 a Class in 24동 has just ended and the next is at 15:30 in 301동. The menus' dishes and
// the events' ids are chosen by hand.

beforeAll(() => readCampus());

const FRIDAY = '2026-11-20';
const JOB_FAIR = 'e0c2e3a4-0000-4000-8000-000000000001';
const SESSION = 'e0c2e3a4-0000-4000-8000-000000000002';

const friday = (): DayItem[] => [
  classAt(FRIDAY, '13:00', '13:50', '자연과학관6'),
  classAt(FRIDAY, '15:30', '16:45', '제1공학관'),
];

const studentCenterLunch = { restaurants: [{ name: '학생회관식당', lines: [dish('순두부찌개'), NOTE] }] };

describe('학생회관 pressed at lunch (board a1)', () => {
  it('is its card: the walk, the stay before the Class, the menu, and the suggestion, with 여기서 먹기 and the way', () => {
    const lookup = pressed('학생회관', studentCenterLunch);

    expect(lookup).toEqual({
      kind: 'place',
      chips: [
        { kind: 'origin', text: '301동에서', userId: null },
        { kind: 'until', text: '13:00 수업까지', userId: null },
      ],
      lines: [],
      basis: ['301동에서 63동까지 걸어서 15분', expect.stringMatching(/^셔틀은 /u)],
      scene: {
        people: [],
        places: [{ place: point('학생회관', '63동'), role: 'pick', tag: null }],
        routes: [],
        flags: [],
      },
      band: null,
      actions: [
        {
          kind: 'plan',
          label: '여기서 먹기',
          input: {
            kind: 'meal',
            date: TUESDAY,
            meal: 'lunch',
            people: [{ userId: ME, constraints: [] }],
            window: { from: null, until: null },
            placeId: id('학생회관'),
          },
        },
        { kind: 'guide', to: point('학생회관', '63동') },
      ],
      card: {
        title: '63동',
        subtitle: '학생회관',
        facts: [
          strong('route', '걸어서 15분 · 12:25 도착'),
          plain('clock', '13:00 수업 전까지 34분 머물 수 있어요'),
          plain('meal', '학생회관식당 · 오늘 순두부찌개'),
        ],
        note: '점심시간이에요. 여기서 드실래요?',
      },
    });
  });
});

describe('39동 pressed, with nothing in it (board a3)', () => {
  it('is the walk and the stay, with only the way', () => {
    const lookup = pressed('대학원연구동(1단계)');

    expect(lookup.card).toEqual({
      title: '39동',
      subtitle: '대학원연구동(1단계)',
      facts: [strong('route', '걸어서 8분 · 12:18 도착'), plain('clock', '13:00 수업 전까지 33분 머물 수 있어요')],
      note: null,
    });
    expect(lookup.basis).toEqual(['301동에서 39동까지 걸어서 8분']);
    expect(lookup.actions).toEqual([{ kind: 'guide', to: point('대학원연구동(1단계)', '39동') }]);
  });
});

describe('302동 pressed while 김민수 is in it (board a14)', () => {
  it('names him in a line that opens his card, draws him, and leaves the suggestion out', () => {
    const lookup = pressed('제2공학관', {
      restaurants: [{ name: '302동식당', lines: [dish('돈까스'), NOTE] }],
      friends: [{ friend: minsu({ level: 'building', placeId: id('제2공학관') }), classes: minsuIn302() }],
    });

    expect(lookup.card).toEqual({
      title: '302동',
      subtitle: '제2공학관',
      facts: [
        strong('route', '걸어서 3분 · 12:13 도착'),
        plain('clock', '13:00 수업 전까지 30분 머물 수 있어요'),
        plain('meal', '302동식당 · 오늘 돈까스'),
        plain('user', '김민수가 여기 있어요 · 수업 중 12:15까지', MINSU),
      ],
      note: null,
    });
    expect(lookup.scene.people).toEqual([
      {
        userId: MINSU,
        name: '김민수',
        me: false,
        at: position('제2공학관'),
        source: 'building',
        tag: '김민수 · 지금 302동',
      },
    ]);
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['plan', 'guide']);
  });
});

describe('문화관 pressed on Friday after a Class in 24동 (board a2)', () => {
  const events = [
    { id: SESSION, title: '기업 설명회', start: onDay(FRIDAY, '16:00'), end: onDay(FRIDAY, '17:00') },
    { id: JOB_FAIR, title: '채용박람회', start: onDay(FRIDAY, '10:00'), end: onDay(FRIDAY, '17:00') },
  ];

  it('is the walk, the stay before the 15:30 Class, and its events by start, with 행사 보기 and 같이 갈 파티', () => {
    const lookup = pressed('문화관', { date: FRIDAY, clock: '13:50', items: friday(), location: null, events });

    expect(lookup.chips).toEqual([
      { kind: 'origin', text: '24동에서', userId: null },
      { kind: 'until', text: '15:30 수업까지', userId: null },
    ]);
    expect(lookup.card).toEqual({
      title: '73동',
      subtitle: '문화관',
      facts: [
        strong('route', '걸어서 4분 · 13:54 도착'),
        plain('clock', '15:30 수업 전까지 78분 머물 수 있어요'),
        plain('flag', '채용박람회 · 17:00까지 열려요'),
        plain('flag', '기업 설명회 · 16:00–17:00'),
      ],
      note: null,
    });
    expect(lookup.actions).toEqual([
      { kind: 'plan', label: '행사 보기', input: { kind: 'events', date: FRIDAY, eventIds: [JOB_FAIR, SESSION] } },
      { kind: 'plan', label: '같이 갈 파티', input: { kind: 'quests', globalEventId: JOB_FAIR, questIds: null } },
      { kind: 'guide', to: point('문화관', '73동') },
    ]);
  });
});

describe('The suggestion', () => {
  it('is left out when the User could stay less than 15 minutes', () => {
    // From 12:30: there at 12:45, and 1 minute on to 24동 before 13:00.
    const lookup = pressed('학생회관', { ...studentCenterLunch, clock: '12:30' });

    expect(facts(lookup)[1]).toEqual(plain('clock', '13:00 수업 전까지 14분 머물 수 있어요'));
    expect(lookup.card?.note).toBeNull();
  });

  it('is left out, with the meal line and 여기서 먹기, when the menu holds only notes', () => {
    const lookup = pressed('학생회관', { restaurants: [{ name: '학생회관식당', lines: [NOTE] }] });

    expect(facts(lookup).map(({ icon }) => icon)).toEqual(['route', 'clock']);
    expect(lookup.card?.note).toBeNull();
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide']);
  });

  it('asks about dinner at dinner, with no item left in the day', () => {
    const lookup = pressed('학생회관', {
      ...studentCenterLunch,
      clock: '18:00',
      restaurants: [{ name: '학생회관식당', lines: [dish('김치찌개')] }],
    });

    expect(facts(lookup)).toEqual([
      strong('route', '걸어서 15분 · 18:15 도착'),
      plain('meal', '학생회관식당 · 오늘 김치찌개'),
    ]);
    expect(lookup.chips).toEqual([{ kind: 'origin', text: '301동에서', userId: null }]);
    expect(lookup.card?.note).toBe('저녁시간이에요. 여기서 드실래요?');
    expect(lookup.actions[0]).toMatchObject({ kind: 'plan', input: { kind: 'meal', meal: 'dinner' } });
  });

  it('is not asked, and no menu is read, between the meals', () => {
    expect(mealAt(onDay(TUESDAY, '15:00'))).toBeNull();
    expect(mealAt(onDay(TUESDAY, '11:00'))).toBe('lunch');
    expect(mealAt(onDay(TUESDAY, '19:29'))).toBe('dinner');
  });
});

describe('Where the User is not known', () => {
  it('has no walk and no stay, and the first fact it has is the strong one', () => {
    const lookup = pressed('학생회관', { ...studentCenterLunch, items: [], location: null });

    expect(lookup.chips).toEqual([]);
    expect(lookup.basis).toEqual([]);
    expect(facts(lookup)).toEqual([strong('meal', '학생회관식당 · 오늘 순두부찌개')]);
  });
});
