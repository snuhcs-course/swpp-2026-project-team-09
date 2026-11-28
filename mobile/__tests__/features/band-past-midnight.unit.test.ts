/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TimeBand } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { bandFor } from '@/features/assistant/answer-frame';
import { bandMoved } from '@/features/assistant/band-move';
import { shortenedOf, shownWordsOf } from '@/features/assistant/band-words';
import { previewOf } from '@/features/assistant/people-picking';
import { clashes, droppedAt, foldedRangeOf, onBandDay, shareOf } from '@/features/assistant/time-band';

// A band whose range runs past midnight (the user's phone, 2026-11-28 19:04, #740's preview build): a study place open
// to 01:00, "19:15–01:00 · 5시간 45분", range 19:00–01:00. A press on the end handle read its clock, "01:00", and put it
// on the band's start day, before 19:15, so the span collapsed to a lump at the bar's left. A clock of the range earlier
// than its start belongs to the next day, in every place that writes a clock back on the band's day (P01 ticket 48).
// Partitions: the end at the range's end, past midnight or at a seat's 24:00; an end before midnight; a start; a band
// within one day; each caller.

const at = (clock: string, date = '2026-11-28'): string => `${date}T${clock}:00+09:00`;
const next = (clock: string): string => at(clock, '2026-11-29');
const RANGE = { startAt: at('19:00'), endAt: next('01:00') };
const LATE: TimeBand = {
  range: RANGE,
  now: at('19:04'),
  lanes: [{ userId: 'me', name: '나', busy: [] }],
  startAt: at('19:15'),
  endAt: next('01:00'),
  text: '19:15–01:00 · 5시간 45분',
};
const ms = (time: string | undefined): number => Date.parse(time ?? '');
const share = (clock: string, date = '2026-11-28'): number => shareOf(at(clock, date), RANGE);

describe('A clock on a band past midnight', () => {
  it('is on the next day when it is earlier than the range’s start', () => {
    expect(onBandDay('01:00', LATE)).toBe(next('01:00'));
    expect(onBandDay('00:30', LATE)).toBe(next('00:30'));
  });

  it('is on the band’s day from the range’s start on', () => {
    expect(onBandDay('23:30', LATE)).toBe(at('23:30'));
    expect(onBandDay('19:00', LATE)).toBe(at('19:00'));
  });

  it('is on the band’s day for a band within one day', () => {
    const day = { startAt: at('12:00'), endAt: at('13:00'), range: { startAt: at('11:00'), endAt: at('14:00') } };
    expect(onBandDay('11:30', day)).toBe(at('11:30'));
  });

  it('is on the next day at a seat’s or a room’s range that ends at 24:00', () => {
    const seat = { startAt: at('22:00'), endAt: at('23:00'), range: { startAt: at('20:00'), endAt: at('24:00') } };

    expect(ms(onBandDay('00:00', seat))).toBe(ms(next('00:00')));
  });

  it('keeps the end handle pressed at the range’s end after the start', () => {
    const clock = droppedAt('until', 1, LATE);

    expect(ms(onBandDay(clock, LATE))).toBeGreaterThan(ms(LATE.startAt));
  });
});

describe('Every place that writes a clock on the band’s day, past midnight', () => {
  it('draws red the part of a busy stretch before an end fixed after midnight', () => {
    const busy = [{ startAt: at('23:30'), endAt: next('00:45') }];

    expect(clashes(busy, { from: null, until: '00:30' }, LATE)).toEqual([
      { startAt: at('23:30'), endAt: next('00:30') },
    ]);
  });

  it('moves the band whole over midnight', () => {
    const band = { ...LATE, startAt: at('22:00'), endAt: at('23:30') };

    // An hour of the range's six.
    const moved = bandMoved(band, 1 / 6);

    expect([ms(moved.startAt), ms(moved.endAt)]).toEqual([ms(at('23:00')), ms(next('00:30'))]);
  });

  it('folds the track to 15 minutes after a busy stretch that starts after midnight', () => {
    const busy = [
      { startAt: at('19:00'), endAt: at('23:00') },
      { startAt: next('00:40'), endAt: next('02:00') },
    ];
    const band = { ...LATE, startAt: at('23:15'), endAt: next('00:20'), lanes: [{ userId: 'me', name: '나', busy }] };

    const folded = foldedRangeOf(band);

    expect([ms(folded.startAt), ms(folded.endAt)]).toEqual([ms(at('22:45')), ms(next('00:55'))]);
  });

  it('previews a picked span that ends after midnight', () => {
    const band = { ...LATE, startAt: at('23:00'), endAt: next('00:30'), text: '23:00–00:30 · 1시간 30분' };
    const lanes = [{ userId: 'su', name: '민수', busy: [{ startAt: at('22:30'), endAt: at('23:30') }] }];

    const preview = previewOf(band, lanes);

    expect([ms(preview.startAt), ms(preview.endAt)]).toEqual([ms(at('23:30')), ms(next('01:00'))]);
    expect(preview.text).toBe('23:30–01:00 · 1시간 30분');
  });

  it('redraws a band for an end asked after midnight', () => {
    const band = bandFor(LATE, { ...MEAL_ANSWER.input, window: { from: null, until: '00:30' } });

    expect(ms(band.endAt)).toBe(ms(next('00:30')));
    expect(ms(band.endAt) - ms(band.startAt)).toBe(ms(LATE.endAt) - ms(LATE.startAt));
  });
});

// The main server reads a dropped clock on the band's day (`study-plan.ts`, `onDay`), so 00:30 after midnight would be
// that morning's and the recalculation would find no time (#769's review). No handle or whole move lets a time go past
// the last step before midnight until it reads them otherwise. Partitions: an end dragged past midnight from before it
// and from after it; an end pressed where it is past midnight; a seat's range to 24:00; the band moved whole; an end
// that the last drop would leave too short.
describe('Letting a band go past midnight', () => {
  it('stops an end dragged past midnight at the last step before it', () => {
    expect(droppedAt('until', share('00:30', '2026-11-29'), { ...LATE, endAt: at('23:00') })).toBe('23:55');
    expect(droppedAt('until', share('00:30', '2026-11-29'), LATE)).toBe('23:55');
  });

  it('keeps an end past midnight that is pressed where it is', () => {
    expect(droppedAt('until', 1, LATE)).toBe('01:00');
  });

  it('stops a seat’s end at the last step before a 24:00 close', () => {
    const seat = {
      ...LATE,
      startAt: at('22:00'),
      endAt: at('23:00'),
      range: { startAt: at('20:00'), endAt: at('24:00') },
    };

    expect(droppedAt('until', 1, seat)).toBe('23:55');
  });

  it('starts a band moved whole no later than the last step before midnight', () => {
    const band = { ...LATE, startAt: at('23:00'), endAt: next('00:00') };

    expect(ms(bandMoved(band, 1 / 6).startAt)).toBe(ms(at('23:55')));
  });

  it('keeps an end that the last drop would leave shorter than 15 minutes', () => {
    const band = { ...LATE, startAt: at('23:50'), endAt: next('00:30') };

    expect(droppedAt('until', share('00:10', '2026-11-29'), band)).toBe('00:30');
  });
});

// Partitions: a study place's length, "5시간 45분", with the end held; shortened. A meal's is kept in time-band-words.
describe('The head’s words while an end is held', () => {
  it('say the length the bar draws', () => {
    const parts = shownWordsOf(LATE, { startAt: LATE.startAt, endAt: at('23:00') }, 'until');

    expect(parts.map(({ text }) => text).join('')).toBe('19:15–23:00 · 3시간 45분');
    expect(parts.find(({ strong }) => strong)?.text).toBe('23:00');
  });

  it('drop a study place’s length first when they do not fit', () => {
    const parts = [{ text: '19:15–01:00 · 5시간 45분', strong: false }];

    expect(shortenedOf('', parts, 1).parts).toEqual([{ text: '19:15–01:00', strong: false }]);
  });
});
