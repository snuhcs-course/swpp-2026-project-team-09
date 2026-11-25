/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TimeBand } from '@/api/assistant-types';
import { bandNoteOf, foldedRangeOf } from '@/features/assistant/time-band';

const at = (clock: string): string => `2026-11-18T${clock}:00+09:00`;
const stretch = (start: string, end: string, label?: string): TimeBand['lanes'][number]['busy'][number] => ({
  startAt: at(start),
  endAt: at(end),
  ...(label === undefined ? {} : { label }),
});

// A meeting tomorrow at 14:00–15:00: my class ends at 13:45, 민수's next one starts at 15:30.
const BAND: TimeBand = {
  range: { startAt: at('13:00'), endAt: at('16:00') },
  now: '2026-11-17T11:50:00+09:00',
  lanes: [
    { userId: 'me', name: '나', busy: [stretch('12:30', '13:45', '수업'), stretch('16:00', '17:15', '수업')] },
    { userId: 'minsu', name: '민수', busy: [stretch('15:30', '16:45', '수업')] },
  ],
  startAt: at('14:00'),
  endAt: at('15:00'),
  text: '14:00–15:00 · 함께 60분',
};

// The note between the bar's two end times (P04 ticket 82): what bounds the span on the left, after the start time;
// what bounds it on the right, before the end time, only when nothing bounds it on the left. Partitions: both sides
// bounded; the right alone; neither; now on the left; a stretch without a label.
describe('bandNoteOf', () => {
  it('names the busy stretch that ends last before the span, and not the one that starts after it', () => {
    expect(bandNoteOf(BAND)).toEqual({ side: 'left', words: '13:45 수업 끝' });
  });

  it('names the busy stretch that starts first after the span when nothing bounds it on the left', () => {
    const mine = { userId: 'me', name: '나', busy: [stretch('16:00', '17:15', '수업')] };
    const after = {
      ...BAND,
      lanes: [mine, { userId: 'minsu', name: '민수', busy: [stretch('15:30', '16:45', '수업')] }],
    };
    expect(bandNoteOf(after)).toEqual({ side: 'right', words: '민수 15:30 수업' });
  });

  it('is none when nothing bounds the span', () => {
    const free = { ...BAND, lanes: [{ userId: 'me', name: '나', busy: [] }] };
    expect(bandNoteOf(free)).toBeNull();
  });

  it('says 지금 when now is in the range before the span and no busy stretch ends later', () => {
    const today = { ...BAND, now: at('13:50'), lanes: [{ userId: 'me', name: '나', busy: [] }] };
    expect(bandNoteOf(today)).toEqual({ side: 'left', words: '13:50 지금' });
  });

  it('calls a busy stretch without a label 일정', () => {
    const plain = { ...BAND, lanes: [{ userId: 'me', name: '나', busy: [stretch('12:30', '13:45')] }] };
    expect(bandNoteOf(plain)?.words).toBe('13:45 일정 끝');
  });
});

// P04 ticket 14, item 1: folded, the track shows the free time around the Plan. Expected values: board 1, 13:30 to 15:45
// for a Plan from 14:00 to 15:00 between a class ending at 13:45 and 민수's starting at 15:30.
describe('foldedRangeOf', () => {
  it('runs from 15 minutes before the busy edge before the span to 15 minutes after the one after it', () => {
    expect(foldedRangeOf(BAND)).toEqual({ startAt: at('13:30'), endAt: at('15:45') });
  });

  it('stops at the range when nothing is busy on a side', () => {
    const free = { ...BAND, lanes: [{ userId: 'me', name: '나', busy: [] }] };
    expect(foldedRangeOf(free)).toEqual({ startAt: at('13:00'), endAt: at('16:00') });
  });

  it('starts 15 minutes before now when now is in the range before the span', () => {
    const today = { ...BAND, now: at('13:50'), lanes: [{ userId: 'me', name: '나', busy: [] }] };
    expect(foldedRangeOf(today).startAt).toBe(at('13:35'));
  });
});

// From the user's phone (P04 ticket 52, with P05 ticket 42): lunch asked at 12:00, his first Class over since 10:45. The
// clock is the band's own `now`. Partitions:
// - a Plan that starts from now (the asker's origin is their position, chosen, or unknown): it starts at or after now;
// - a Plan that starts after an item going on now, the asker's origin;
// - a reply from before P05 ticket 42, whose Plan started from the Class that had ended.
describe('the left edge for where the Plan starts', () => {
  const LUNCH: TimeBand = {
    range: { startAt: at('10:30'), endAt: at('14:00') },
    now: at('12:00'),
    lanes: [
      { userId: 'me', name: '나', busy: [stretch('09:30', '10:45', '301동 수업'), stretch('13:30', '14:45', '수업')] },
    ],
    startAt: at('12:15'),
    endAt: at('12:45'),
    text: '12:15–12:45 · 식사 30분',
  };

  it('says "지금" at now for a Plan from now, with no Class that ended before it, and folds 15 minutes before now', () => {
    expect(bandNoteOf(LUNCH)?.words).toBe('12:00 지금');
    expect(foldedRangeOf(LUNCH).startAt).toBe(at('11:45'));
  });

  it('names the item going on now that the Plan starts after', () => {
    const going = { ...LUNCH, lanes: [{ userId: 'me', name: '나', busy: [stretch('11:00', '12:10', '302동 수업')] }] };

    expect(bandNoteOf(going)?.words).toBe('12:10 302동 수업 끝');
  });

  it('keeps a reply from before P05 ticket 42 as it was: its Plan starts after the ended Class, which it names', () => {
    const old = { ...LUNCH, startAt: at('11:00'), endAt: at('11:30') };

    expect(bandNoteOf(old)?.words).toBe('10:45 301동 수업 끝');
  });
});
