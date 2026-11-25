/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MealInput, TimeBand } from '@/api/assistant-types';
import {
  doneWordsOf,
  pickedLanes,
  pickedOf,
  pickRowsOf,
  pickStateOf,
  previewOf,
  toggled,
  walkGuessOf,
  withPicked,
} from '@/features/assistant/people-picking';

// People picked in the time card (P04 ticket 64), over a made-up meal of 나 and 민수, with 태현 and 서연 as the other
// Friends the main server sent lanes for, and 지호, a Friend it sent none for.
const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;
const busy = (from: string, until: string): { startAt: string; endAt: string; label: string } => ({
  startAt: at(from),
  endAt: at(until),
  label: '수업',
});

const INPUT: MealInput = {
  kind: 'meal',
  date: '2026-11-17',
  meal: 'lunch',
  people: [
    { userId: 'me', constraints: [] },
    { userId: 'minsu', constraints: [{ kind: 'from', placeId: 'p302', source: 'asker' }] },
  ],
  window: { from: null, until: null },
  placeId: null,
};

const BAND: TimeBand = {
  range: { startAt: at('11:30'), endAt: at('13:30') },
  now: at('11:50'),
  lanes: [
    { userId: 'me', name: '나', busy: [busy('11:30', '11:50')] },
    { userId: 'minsu', name: '민수', busy: [busy('11:30', '12:15')] },
  ],
  others: [
    { userId: 'taehyun', name: '태현', busy: [busy('12:50', '13:30')], walkMinutes: 9 },
    { userId: 'seoyeon', name: '서연', busy: [], walkMinutes: null },
  ],
  startAt: at('12:15'),
  endAt: at('12:43'),
  text: '12:15–12:43 · 식사 28분',
};

// Partitions: checking and unchecking; 완료 with a Friend added, one taken out, and nothing changed.
describe('the people picked', () => {
  it('starts from the Plan’s people but the asker, and toggles a Friend in and out', () => {
    expect(pickedOf(INPUT)).toEqual(['minsu']);
    expect(toggled(['minsu'], 'taehyun')).toEqual(['minsu', 'taehyun']);
    expect(toggled(['minsu', 'taehyun'], 'minsu')).toEqual(['taehyun']);
  });

  it('gives the conditions the asker and the picked, keeping a kept person’s constraints and adding the new last', () => {
    const next = withPicked(INPUT, ['minsu', 'taehyun']);

    expect(next).toEqual({
      ...INPUT,
      people: [...INPUT.people, { userId: 'taehyun', constraints: [] }],
    });
    expect(withPicked(INPUT, ['taehyun'])).toEqual({
      ...INPUT,
      people: [
        { userId: 'me', constraints: [] },
        { userId: 'taehyun', constraints: [] },
      ],
    });
  });

  it('gives the same conditions back when nothing changed, so that 완료 asks nothing', () => {
    expect(withPicked(INPUT, ['minsu'])).toBe(INPUT);
  });
});

// Partitions: the combined bar's lanes with a Plan's person unchecked and another Friend checked; one with no lane.
describe('the combined bar while picking', () => {
  it('draws the asker’s lane and those of the checked, the other Friends’ among them', () => {
    expect(pickedLanes(BAND, ['taehyun']).map(({ userId }) => userId)).toEqual(['me', 'taehyun']);
    expect(pickedLanes(BAND, ['minsu', 'jiho']).map(({ userId }) => userId)).toEqual(['me', 'minsu']);
  });
});

// Partitions: the order (the asker, checked, nearest, unknown last); a Friend with no lane; the states; 완료's words.
describe('the rows while picking', () => {
  const rows = pickRowsOf({
    band: BAND,
    picked: ['seoyeon'],
    walks: new Map([
      ['me', 3],
      ['minsu', 12],
    ]),
    friends: [
      { id: 'minsu', name: '민수', walkMinutes: null },
      { id: 'taehyun', name: '태현', walkMinutes: null },
      { id: 'seoyeon', name: '서연', walkMinutes: null },
      { id: 'jiho', name: '지호', walkMinutes: null },
    ],
  });

  it('puts the asker first, then the checked, then the nearest, and those not known last', () => {
    expect(rows.map(({ name, checked }) => `${name}${checked ? ' ✓' : ''}`)).toEqual([
      '나 ✓',
      '서연 ✓',
      '태현',
      '민수',
      '지호',
    ]);
  });

  it('gives a Friend the main server sent no lane for a row without a bar', () => {
    expect(rows.find(({ userId }) => userId === 'jiho')).toMatchObject({ busy: null, walkMinutes: null });
  });

  it('says the walk to the place, or that where a Friend is is not known', () => {
    expect(pickStateOf({ me: false, walkMinutes: 9 })).toBe('걸음 9분');
    expect(pickStateOf({ me: false, walkMinutes: null })).toBe('위치 모름');
    expect(pickStateOf({ me: true, walkMinutes: null })).toBe('');
  });

  it('reads 완료 with how many Friends are checked, and 닫기 with no Friend to pick', () => {
    expect(doneWordsOf([], 4)).toBe('완료');
    expect(doneWordsOf(['minsu', 'taehyun', 'seoyeon'], 4)).toBe('완료 · 3명');
    expect(doneWordsOf([], 0)).toBe('닫기');
  });

  it("guesses a Friend's walk from the straight line, rounded up, when the main server sent none", () => {
    expect(walkGuessOf(250)).toBe(4);
    expect(walkGuessOf(null)).toBeNull();
  });
});

// Partitions: a checked person busy over the Plan's start; one busy only after it; nobody checked busy over it.
// Expected values: the Plan's 28 minutes from 12:15 move to 12:30 after a class until 12:30; a 40-minute span from 12:30
// stops at 태현's class from 12:50.
describe('the span the combined bar previews', () => {
  it('starts after a checked person busy at its start and keeps its length', () => {
    const lanes = [
      { userId: 'me', name: '나', busy: [] },
      { userId: 'minsu', name: '민수', busy: [busy('11:30', '12:30')] },
    ];
    expect(previewOf(BAND, lanes)).toEqual({
      startAt: at('12:30'),
      endAt: at('12:58'),
      text: '12:30–12:58 · 식사 28분',
    });
  });

  it('ends at the next busy stretch of a checked person', () => {
    const lanes = pickedLanes(BAND, ['taehyun']);
    expect(previewOf({ ...BAND, startAt: at('12:30'), endAt: at('13:10') }, lanes)).toEqual({
      startAt: at('12:30'),
      endAt: at('12:50'),
      text: '12:30–12:50 · 식사 20분',
    });
  });

  it('keeps the Plan’s span when nobody checked is busy over it', () => {
    expect(previewOf(BAND, pickedLanes(BAND, []))).toEqual({
      startAt: BAND.startAt,
      endAt: BAND.endAt,
      text: BAND.text,
    });
  });
});
