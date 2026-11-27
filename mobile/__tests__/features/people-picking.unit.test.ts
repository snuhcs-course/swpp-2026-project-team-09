/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MealInput, TimeBand } from '@/api/assistant-types';
import {
  doneWordsOf,
  pickedLanes,
  pickedOf,
  busyAtSpanOf,
  inOrder,
  openOrderOf,
  pickRowsOf,
  type PickRow,
  pickStateOf,
  previewOf,
  reasonOf,
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

const YERIN = { userId: 'yerin', name: '예린', busy: [{ ...busy('12:30', '13:00'), label: '일정' }], walkMinutes: 5 };
const BUSY_BAND: TimeBand = { ...BAND, others: [...(BAND.others ?? []), YERIN] };

function rowsWith(picked: readonly string[]): PickRow[] {
  return pickRowsOf({
    band: BUSY_BAND,
    picked,
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
}

function named(rows: readonly PickRow[]): string[] {
  return rows.map(({ name, checked }) => `${name}${checked ? ' ✓' : ''}`);
}

// Partitions: the order as picking opens (checked, free by nearness, busy over the span, unknown last); a check after
// it; a Friend with no lane; a Friend busy over the span; the states; 완료's words. Expected values: the span 12:15–12:43;
// 민수 free (his class ends at 12:15), 태현 free (his starts at 12:50), 예린 busy with a Quest's step until 13:00.
describe('the rows while picking', () => {
  const opened = rowsWith(['seoyeon']);
  const order = openOrderOf(opened);

  it('has no row for the asker, and puts the checked first, the free by nearness, the busy, and the unknown last', () => {
    expect(named(inOrder(opened, order))).toEqual(['서연 ✓', '태현', '민수', '예린', '지호']);
  });

  it('keeps that order however rows are checked until picking ends', () => {
    expect(named(inOrder(rowsWith(['jiho', 'taehyun']), order))).toEqual(['서연', '태현 ✓', '민수', '예린', '지호 ✓']);
  });

  // P04 ticket 67: the rows never grow once picking is open, so a Friend the list brings later waits for the next.
  it('leaves out a row the order does not know', () => {
    const [first] = opened;
    const later = first === undefined ? [] : [{ ...first, userId: 'newcomer', name: '새친구', checked: false }];

    expect(named(inOrder([...opened, ...later], order))).toEqual(['서연 ✓', '태현', '민수', '예린', '지호']);
  });

  it('says who is busy over the span, until when and with what, and nobody without busy stretches', () => {
    expect(opened.find(({ userId }) => userId === 'yerin')).toMatchObject({
      busyAtSpan: { startAt: at('12:30'), endAt: at('13:00'), kind: 'quest' },
      reason: '12:30부터 일정',
    });
    expect(opened.find(({ userId }) => userId === 'minsu')?.busyAtSpan).toBeNull();
    expect(opened.find(({ userId }) => userId === 'jiho')).toMatchObject({ busyAtSpan: null, walkMinutes: null });
    expect(busyAtSpanOf([{ startAt: at('12:00'), endAt: at('12:30') }], BUSY_BAND)).toEqual({
      startAt: at('12:00'),
      endAt: at('12:30'),
      kind: null,
    });
    expect(busyAtSpanOf([{ ...busy('12:00', '12:30'), label: '302동 수업' }], BUSY_BAND)?.kind).toBe('class');
  });

  it('reads 완료 with no count, and 닫기 with no Friend to pick', () => {
    expect(doneWordsOf(4)).toBe('완료');
    expect(doneWordsOf(0)).toBe('닫기');
  });

  it("guesses a Friend's walk from the straight line, rounded up, when the main server sent none", () => {
    expect(walkGuessOf(250)).toBe(4);
    expect(walkGuessOf(null)).toBeNull();
  });
});

// Partitions: a checked person busy over the Plan's start; one busy only after it; nobody checked busy over it.
// Expected values: the Plan's 28 minutes from 12:15 move to 12:30 after a class until 12:30; a 40-minute span from 12:30
// stops at 태현's class from 12:50.
function minsuRowOf(walks: ReadonlyMap<string, number | null>): PickRow | undefined {
  return pickRowsOf({ band: BAND, picked: [], walks, friends: [{ id: 'minsu', name: '민수', walkMinutes: 6 }] }).find(
    ({ userId }) => userId === 'minsu',
  );
}

// Partitions: busy, free, and unknown; busy over the span's start or from within it; a Class, a Quest's step, and
// an item with no label. Expected values: the boards' words of variant R3.
describe('the words at a row’s right while picking', () => {
  it('says one thing at the right: why a Friend is busy, else the walk, else, quieter, that where they are is unknown', () => {
    expect(pickStateOf({ reason: '18:15까지 수업', walkMinutes: null, after: null })).toEqual({
      words: '18:15까지 수업',
      quiet: false,
    });
    expect(pickStateOf({ reason: null, walkMinutes: 9, after: null })).toEqual({ words: '걸음 9분', quiet: false });
    expect(pickStateOf({ reason: null, walkMinutes: null, after: null })).toEqual({ words: '위치 모름', quiet: true });
  });

  it('gives a busy Friend’s reason by when it ends if it holds the span’s start, else by when it starts, as 수업 or 일정', () => {
    const span = { startAt: at('12:15') };

    expect(reasonOf({ startAt: at('11:30'), endAt: at('12:30'), kind: 'class' }, span)).toBe('12:30까지 수업');
    expect(reasonOf({ startAt: at('12:30'), endAt: at('13:00'), kind: 'class' }, span)).toBe('12:30부터 수업');
    expect(reasonOf({ startAt: at('12:15'), endAt: at('12:40'), kind: 'quest' }, span)).toBe('12:40까지 일정');
    expect(reasonOf({ startAt: at('12:20'), endAt: at('12:40'), kind: null }, span)).toBe('12:20부터 일정');
  });
});

// Partitions: a Plan's Friend with a walk in the Plan, and without one; their department.
describe('the walk and department of a Plan’s Friend while picking', () => {
  it('comes with the Friend’s department from the Friend list, and the asker has no row', () => {
    const rows = pickRowsOf({
      band: BAND,
      picked: [],
      walks: new Map(),
      friends: [{ id: 'minsu', name: '민수', department: '컴퓨터공학부', walkMinutes: 6 }],
    });

    expect(rows.find(({ userId }) => userId === 'minsu')?.department).toBe('컴퓨터공학부');
    expect(rows.find(({ userId }) => userId === 'me')).toBeUndefined();
  });

  it('comes from the Plan, and from the phone’s guess only without one', () => {
    expect(minsuRowOf(new Map([['minsu', 12]]))?.walkMinutes).toBe(12);
    expect(minsuRowOf(new Map([['me', 3]]))?.walkMinutes).toBe(6);
  });
});

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

// Partitions: words of a length in minutes (above), of a length in hours, and of what the span runs into. Expected
// values: the words a band says, "식사 28분", "2시간", "14:00 수업과 겹쳐요", and `lengthWords`.
describe('the words of the span the combined bar previews', () => {
  // A seat card's band says what its span runs into (P10 ticket 15): moved off it, the preview says its length instead.
  it('drops the words of what the span ran into once it moves off it, and says its length', () => {
    const seat: TimeBand = {
      ...BAND,
      range: { startAt: at('13:00'), endAt: at('18:00') },
      lanes: [{ userId: 'me', name: '나', busy: [busy('14:00', '15:15')] }],
      others: [],
      startAt: at('14:00'),
      endAt: at('15:00'),
      text: '14:00–15:00 · 14:00 수업과 겹쳐요',
    };

    expect(previewOf(seat, seat.lanes).text).toBe('15:15–16:15 · 1시간');
  });

  it('says a length in hours anew, as in minutes', () => {
    const study: TimeBand = {
      ...BAND,
      range: { startAt: at('13:00'), endAt: at('18:00') },
      lanes: [
        { userId: 'me', name: '나', busy: [] },
        { userId: 'minsu', name: '민수', busy: [busy('14:00', '14:30'), busy('15:30', '16:00')] },
      ],
      others: [],
      startAt: at('14:00'),
      endAt: at('16:00'),
      text: '14:00–16:00 · 2시간',
    };

    expect(previewOf(study, study.lanes).text).toBe('14:30–15:30 · 1시간');
  });
});
