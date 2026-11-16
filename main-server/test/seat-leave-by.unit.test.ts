/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { seatLeaveBy } from '../src/library/seat-leave-by.js';

// Partitions: the next item during the stay, before it, after it, at 관정관 or without a Place; a walk short or long;
// a leave-by after the stay's start, at or before it, and one already passed. Expected values: board AmStudy a1 and a6,
// a seat from 13:54 to 19:54 with 철학개론 at 16:00 in 두산인문관, 4 minutes on foot from 관정관, left at 15:56.

const KWANJEONG = 'kwanjeong';
const korea = (clock: string): Date => new Date(`2026-11-04T${clock}:00+09:00`);
const STAY = { startsAt: korea('13:54'), endsAt: korea('19:54'), placeId: KWANJEONG };
const NOW = korea('13:50');
const WALKS: Record<string, number> = { doosan: 4, b24: 15 };
const walking = (_from: string, to: string): number => WALKS[to] ?? 0;

const item = (name: string, start: string, placeId: string | null): DayItem => ({
  id: name,
  name,
  start: korea(start),
  end: korea(start),
  placeId,
  isClass: true,
});

describe('seatLeaveBy', () => {
  it('leaves for the first item with a Place during the stay, whatever the walk', () => {
    const items = [item('철학개론', '16:00', 'doosan'), item('자료구조', '18:00', 'b24')];

    expect(seatLeaveBy(items, STAY, walking, NOW)).toEqual({
      at: korea('15:56'),
      placeId: 'doosan',
      walkMinutes: 4,
      start: korea('16:00'),
      isClass: true,
    });
  });

  it.each([
    ['one before the stay', item('자료구조', '13:00', 'b24')],
    ['one after the stay', item('자료구조', '20:00', 'b24')],
    ['one at 관정관', item('스터디', '16:00', KWANJEONG)],
    ['one without a Place', item('면담', '16:00', null)],
  ])('keeps none for %s', (_, one) => {
    expect(seatLeaveBy([one], STAY, walking, NOW)).toBeNull();
  });

  it('keeps none when the walk would start before the stay', () => {
    expect(seatLeaveBy([item('자료구조', '14:05', 'b24')], STAY, walking, NOW)).toBeNull();
  });

  it('keeps none when the time to leave has passed, and counts from now during the stay', () => {
    const items = [item('철학개론', '16:00', 'doosan'), item('자료구조', '18:00', 'b24')];

    expect(seatLeaveBy(items, STAY, walking, korea('15:57'))).toBeNull();
    expect(seatLeaveBy(items, STAY, walking, korea('16:01'))).toEqual({
      at: korea('17:45'),
      placeId: 'b24',
      walkMinutes: 15,
      start: korea('18:00'),
      isClass: true,
    });
  });
});
