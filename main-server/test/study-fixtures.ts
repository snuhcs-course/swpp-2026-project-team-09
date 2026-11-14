/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { type StudyFacts, type StudyPerson } from '../src/assistant/library/study-pick.js';

// The days and people of the study pick's unit tests, on the design's example week.

export const KWANJEONG = 'kwanjeong';
export const THURSDAY = '2026-11-19';
export const FRIDAY = '2026-11-20';
export const SATURDAY = '2026-11-21';

// Walking minutes to 관정관, the same back.
const WALKS: Record<string, number> = { '24': 4, doosan: 4, '301': 14, '302': 16, near: 10 };
export const walkingMinutes = (from: string, to: string): number => WALKS[from === KWANJEONG ? to : from] ?? 0;

export const item = (date: string, start: string, end: string, placeId: string | null, isClass = true): DayItem => ({
  id: `${start}-${end}`,
  name: 'item',
  start: new Date(`${date}T${start}:00+09:00`),
  end: new Date(`${date}T${end}:00+09:00`),
  placeId,
  isClass,
});

export const person = (id: string, itemsByDate: Record<string, DayItem[]> = {}): StudyPerson => ({ id, itemsByDate });

export const facts = (people: StudyPerson[], dates: string[], open: string, close: string, more = {}): StudyFacts => ({
  people,
  dates,
  hours: { open, close },
  stepMinutes: 30,
  kwanjeongPlaceId: KWANJEONG,
  walkingMinutes,
  ...more,
});

// The design's table lists only the items around the slot; the day adds 민수's morning Classes and 지은's evening so
// that the table's slot is the pick.
export const thursday: StudyPerson[] = [
  person('me', { [THURSDAY]: [item(THURSDAY, '14:00', '15:15', '301')] }),
  person('seojun', { [THURSDAY]: [item(THURSDAY, '13:00', '13:50', '24'), item(THURSDAY, '14:00', '14:50', '24')] }),
  person('jieun', {
    [THURSDAY]: [
      item(THURSDAY, '14:00', '15:15', 'doosan'),
      item(THURSDAY, '17:00', '18:15', 'doosan'),
      item(THURSDAY, '18:30', '22:00', 'doosan', false),
    ],
  }),
  person('minsu', {
    [THURSDAY]: [
      item(THURSDAY, '09:30', '10:45', '302'),
      item(THURSDAY, '11:00', '12:15', '302'),
      item(THURSDAY, '12:30', '13:45', '302'),
      item(THURSDAY, '15:30', '16:45', '302'),
    ],
  }),
];
