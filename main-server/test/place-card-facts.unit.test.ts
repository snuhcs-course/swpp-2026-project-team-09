/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { dish, facts, plain, pressed } from './place-card.js';
import { classAt, readCampus, TUESDAY } from './way-example.js';

// The facts of a pressed building's card (wireframe row 6) for what the boards do not show: the stay against the next
// item, events without an end or over more than a day, and two Restaurants in one Place. On Tuesday 2026-11-17 the User
// is in 301동 after a Class there until 11:50; the values are chosen by hand.

beforeAll(() => readCampus());

const in301 = (): DayItem => classAt(TUESDAY, '11:00', '11:50', '제1공학관');

const clockFact = (clock: string, items: DayItem[]): unknown =>
  facts(pressed('학생회관', { clock, items })).find(({ icon }) => icon === 'clock');

describe('The stay before the next item', () => {
  it.each([
    ['0 minutes', '12:44'],
    ['less than none', '12:45'],
  ])('of %s says there is no time to stay', (_, clock) => {
    // From 12:44, there at 12:59, and 1 minute on to 24동.
    const items = [in301(), classAt(TUESDAY, '13:00', '13:50', '자연과학관6')];

    expect(clockFact(clock, items)).toEqual(plain('clock', '13:00 수업 전까지 머물 시간이 없어요'));
  });

  it('runs to the start of a next Class without a Place, with no walk on', () => {
    const items = [in301(), { ...classAt(TUESDAY, '13:00', '13:50', '자연과학관6'), placeId: null }];

    const lookup = pressed('학생회관', { items });

    expect(facts(lookup)[1]).toEqual(plain('clock', '13:00 수업 전까지 35분 머물 수 있어요'));
    expect(lookup.chips[1]).toEqual({ kind: 'until', text: '13:00 수업까지', userId: null });
  });

  it('names a Sub Quest next as an item, not a Class', () => {
    const items = [in301(), { ...classAt(TUESDAY, '13:00', '13:50', '자연과학관6'), name: '파티', isClass: false }];

    const lookup = pressed('학생회관', { items });

    expect(facts(lookup)[1]).toEqual(plain('clock', '13:00 일정 전까지 34분 머물 수 있어요'));
    expect(lookup.chips[1]).toEqual({ kind: 'until', text: '13:00까지', userId: null });
  });
});

describe('An event at the Place pressed', () => {
  const ID = 'e0c2e3a4-0000-4000-8000-000000000003';

  const flags = (start: Date, end: Date | null): string[] =>
    facts(pressed('문화관', { events: [{ id: ID, title: '사진전', start, end }] }))
      .filter(({ icon }) => icon === 'flag')
      .map(({ text }) => text);

  it.each([
    ['under way without an end is open', onDay(TUESDAY, '10:00'), null, '사진전 · 열려 있어요'],
    ['ahead without an end says when it opens', onDay(TUESDAY, '16:00'), null, '사진전 · 16:00부터'],
    [
      'under way until a later day says that day',
      onDay('2026-11-16', '10:00'),
      onDay('2026-11-18', '18:00'),
      '사진전 · 11/18 18:00까지 열려요',
    ],
    [
      'ahead and over two days says both days',
      onDay(TUESDAY, '16:00'),
      onDay('2026-11-18', '12:00'),
      '사진전 · 11/17 16:00–11/18 12:00',
    ],
  ])('%s', (_, start, end, words) => {
    expect(flags(start, end)).toEqual([words]);
  });
});

describe('Two Restaurants in the Place pressed', () => {
  it('are a meal line each, with one 여기서 먹기', () => {
    const lookup = pressed('자하연식당', {
      restaurants: [
        { name: '자하연식당 2층', lines: [dish('제육볶음')] },
        { name: '자하연식당 3층', lines: [dish('돈까스')] },
      ],
    });

    expect(facts(lookup).filter(({ icon }) => icon === 'meal')).toEqual([
      plain('meal', '자하연식당 2층 · 오늘 제육볶음'),
      plain('meal', '자하연식당 3층 · 오늘 돈까스'),
    ]);
    expect(lookup.actions.filter(({ kind }) => kind === 'plan')).toHaveLength(1);
  });
});
