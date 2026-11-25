/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TimeBand } from '@/api/assistant-types';
import type { OtherLane } from '@/api/time-band-types';
import { inOrder, openOrderOf, pickRowsOf, pickStateOf } from '@/features/assistant/people-picking';

// Where a Friend sets out from, at a row's right while picking (P04 ticket 68, board z3; the user's words of
// 2026-11-26: "5시 30분에 어디에서 수업 끝이라고 하는게 더 정보가 많지 않나?"). Over the board's dinner today with
// nobody added, at 17:00–18:00 and at 18:30–19:30, the four Friends as the main server sends them in `others`:
// 김태현 after a Class in 83동 at 17:00, from where he is at 18:30; 안진영 after a Class in 43-1동 at 17:00, from
// nowhere known at 18:30; 함재현 in a Class in 16동 until 18:15; 이서준 from nowhere known.
const at = (clock: string): string => `2026-11-26T${clock}:00+09:00`;
const HAMJAEHYUN_CLASS = { startAt: at('16:30'), endAt: at('18:15'), label: '16동 수업' };

function bandAt(from: string, until: string, others: OtherLane[]): TimeBand {
  return {
    range: { startAt: at('16:00'), endAt: at('20:00') },
    now: at('16:30'),
    lanes: [{ userId: 'me', name: '나', busy: [] }],
    others,
    startAt: at(from),
    endAt: at(until),
    text: `${from}–${until}`,
  };
}

const AT_FIVE = bandAt('17:00', '18:00', [
  { userId: 'kth', name: '김태현', busy: [], walkMinutes: 3, after: '83동 수업' },
  { userId: 'hjh', name: '함재현', busy: [HAMJAEHYUN_CLASS], walkMinutes: 5, after: '16동 수업' },
  { userId: 'ajy', name: '안진영', busy: [], walkMinutes: 12, after: '43-1동 수업' },
  { userId: 'lsj', name: '이서준', busy: [], walkMinutes: null },
]);

const AT_HALF_SIX = bandAt('18:30', '19:30', [
  { userId: 'kth', name: '김태현', busy: [], walkMinutes: 4 },
  { userId: 'hjh', name: '함재현', busy: [HAMJAEHYUN_CLASS], walkMinutes: 5, after: '16동 수업' },
  { userId: 'ajy', name: '안진영', busy: [], walkMinutes: null },
  { userId: 'lsj', name: '이서준', busy: [], walkMinutes: null },
]);

// Each row as the board reads it, in the order picking opens with.
function rowsOf(band: TimeBand): string[] {
  const rows = pickRowsOf({ band, picked: [], walks: new Map(), friends: [] });
  return inOrder(rows, openOrderOf(rows)).map((row) => `${row.name} ${pickStateOf(row).words}`);
}

// Partitions: free after a Class with a Place; busy over the span by a Class with a Place; from where the Friend is;
// from nowhere known. Expected values: the board's right column at each time.
describe('a row’s right side while picking', () => {
  it('at 17:00 says the Class a free Friend comes from, and where a busy one’s Class is', () => {
    expect(rowsOf(AT_FIVE)).toEqual([
      '김태현 83동 수업 뒤 · 걸음 3분',
      '안진영 43-1동 수업 뒤 · 걸음 12분',
      '함재현 18:15까지 16동 수업',
      '이서준 위치 모름',
    ]);
  });

  it('at 18:30 says the Class that ended before it, the walk from where a Friend is, or that it is not known', () => {
    expect(rowsOf(AT_HALF_SIX)).toEqual([
      '김태현 걸음 4분',
      '함재현 16동 수업 뒤 · 걸음 5분',
      '안진영 위치 모름',
      '이서준 위치 모름',
    ]);
  });

  it('reads as before from an older main server, which sends no item to set out after', () => {
    expect(pickStateOf({ reason: null, walkMinutes: 3, after: null }).words).toBe('걸음 3분');
  });
});
