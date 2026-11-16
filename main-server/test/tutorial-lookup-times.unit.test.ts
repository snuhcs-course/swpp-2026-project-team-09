/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem } from '../src/assistant/free-time/free-time.js';
import {
  BOARD_Q10,
  CARD,
  CARD_NOTE,
  CLINIC,
  CLINIC_NOTE,
  LOST,
  LOST_NOTE,
  lookupOf,
  plain,
  positionOf,
  readTutorial,
  strong,
  tutorialAt,
} from './tutorial-example.js';
import { classAt, id, ME, numbered, TUESDAY } from './way-example.js';

// When the Tutorial Quests in order start and end: the minute before a Class, a next item without a Place, a start the
// User names, and the end of the offices' day with no next item. The quests of content/tutorial.yaml on Tuesday
// 2026-11-17, over the seed's Places and walking table; the times are worked out by hand from the walking table.

beforeAll(() => readTutorial());

// Classes in 24동 at 11:00 and 13:00, and in 58동 at 17:00.
const aroundOne = (): DayItem[] => [
  classAt(TUESDAY, '11:00', '11:50', '자연과학관6'),
  classAt(TUESDAY, '13:00', '13:50', '자연과학관6'),
  classAt(TUESDAY, '17:00', '18:15', 'SK경영관'),
];

const NO_TIME_BEFORE_ONE = [
  { quest: CARD, reason: 'no time before the next item', when: CARD_NOTE },
  { quest: LOST, reason: 'no time before the next item', when: LOST_NOTE },
  { quest: CLINIC, reason: 'no time before the next item', when: CLINIC_NOTE },
];

describe('The minute before a Class', () => {
  it('at 12:59:30 counts the 13:00 Class as begun: the order starts as it ends, before the 17:00 Class', () => {
    const lookup = lookupOf(tutorialAt('12:59:30', BOARD_Q10, aroundOne()));

    expect(lookup.chips.map(({ text }) => text)).toEqual(['24동에서', '17:00 수업까지']);
    expect(lookup.steps?.map(({ at }) => at)).toEqual(['13:51', '14:08', '14:19']);
  });

  it('at 12:59 leaves every quest out for want of time, not as closed', () => {
    expect(tutorialAt('12:59', BOARD_Q10, aroundOne())).toEqual({
      result: 'none',
      reason: 'no-fit',
      leftOut: NO_TIME_BEFORE_ONE,
      online: [],
    });
  });
});

// A Class at 15:00 without a Place between the Classes in 24동 and 58동.
const placeless = (): DayItem[] => [
  classAt(TUESDAY, '13:00', '13:50', '자연과학관6'),
  { ...classAt(TUESDAY, '15:00', '15:50', 'SK경영관'), placeId: null },
  classAt(TUESDAY, '17:00', '18:15', 'SK경영관'),
];

const morningOnly = (): DayItem[] => [classAt(TUESDAY, '13:00', '13:50', '자연과학관6')];

describe('A next item without a Place', () => {
  it('is the deadline, with no walk on to it', () => {
    const answer = tutorialAt('14:35', BOARD_Q10, placeless());
    const lookup = lookupOf(answer);

    expect(lookup.chips.map(({ text }) => text)).toEqual(['24동에서', '15:00 수업까지']);
    expect(lookup.lines).toEqual([
      [plain('한 곳을 돌면 '), strong('14:46'), plain('에 끝나요')],
      [plain('다음은 '), strong('15:00 수업')],
    ]);
    expect(lookup.steps).toEqual([{ at: '14:36', text: `학생회관 3층 · ${CLINIC}` }]);
    expect(lookup.scene.places.map(({ role }) => role)).toEqual(['pick']);
    expect(lookup.scene.routes).toEqual([
      { userId: ME, role: 'me', from: positionOf('24'), to: positionOf('63'), minutes: 1 },
    ]);
    expect(answer).toMatchObject({ words: { next: { at: '15:00', isClass: true, place: null, walkMinutes: null } } });
  });

  it('leaves out what does not fit before it, each with when it can be done', () => {
    expect(lookupOf(tutorialAt('14:35', BOARD_Q10, placeless())).basis).toEqual([
      '가장 일찍 끝나는 순서예요 · 모두 걸어서 1분',
      '한 곳에 10분씩 잡았어요',
      CLINIC_NOTE,
      `${CARD} · 15:00 수업 전에 시간이 모자라 뺐어요`,
      CARD_NOTE,
      `${LOST} · 15:00 수업 전에 시간이 모자라 뺐어요`,
      LOST_NOTE,
    ]);
  });
});

describe('A start the User names', () => {
  it('is where the order sets out from, whatever their Timetable says', () => {
    const answer = tutorialAt('13:50', BOARD_Q10, undefined, { fromPlaceId: numbered('301').id });

    expect(lookupOf(answer).chips.map(({ text }) => text)).toEqual(['301동에서', '17:00 수업까지']);
    expect(lookupOf(answer).steps?.map(({ at }) => at)).toEqual(['14:05', '14:22', '14:33']);
    expect(answer).toMatchObject({ start: { placeId: id('제1공학관'), basis: 'chosen' }, words: { from: '301동' } });
  });
});

describe('A day with no next item', () => {
  it('orders what ends by 18:00, when the offices close, and leaves out the rest with when it can be done', () => {
    const answer = tutorialAt('17:45', ['lost-and-found', 'thousand-won-meals'], morningOnly());

    expect(lookupOf(answer).lines).toEqual([
      [plain('한 곳을 돌면 '), strong('17:56'), plain('에 끝나요')],
      [plain('오늘 남은 일정이 없어요')],
    ]);
    expect(lookupOf(answer).steps).toEqual([{ at: '17:46', text: '학생회관 · 천원의 식사 이용하기' }]);
    expect(lookupOf(answer).basis).toEqual([
      '가장 일찍 끝나는 순서예요 · 모두 걸어서 1분',
      '한 곳에 10분씩 잡았어요',
      `${LOST} · 18:00 전에 시간이 모자라 뺐어요`,
      LOST_NOTE,
    ]);
    expect(answer).toMatchObject({
      words: { leftOut: [{ quest: LOST, reason: 'no time before 18:00, when the order ends', when: LOST_NOTE }] },
    });
  });

  it('orders nothing after 18:00', () => {
    expect(tutorialAt('18:30', ['thousand-won-meals'], morningOnly())).toMatchObject({
      result: 'none',
      reason: 'no-fit',
    });
  });
});
