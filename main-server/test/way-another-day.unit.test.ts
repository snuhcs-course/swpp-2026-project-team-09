/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { wayAnswer, type WayAnswer } from '../src/assistant/lookup/way-lookup.js';
import { onAnotherDay } from '../src/assistant/lookup/way.service.js';
import { classAt, id, position, readCampus, wayArgs } from './way-example.js';

// A way to a Class on another day (P05 ticket 11): asked on Saturday 2026-11-21 at 03:52, about a Class in 24동 at
// 13:00 on Monday 2026-11-23, after a Class in 301동 until 12:45. In the usage test the way set out from where the phone
// was, not from 301동.

beforeAll(() => readCampus());

const MONDAY = '2026-11-23';
const SATURDAY_NIGHT = new Date('2026-11-21T03:52:00+09:00');

const monday = (): DayItem[] => [
  classAt(MONDAY, '11:00', '12:45', '제1공학관'),
  classAt(MONDAY, '13:00', '13:50', '자연과학관6'),
];

function mondayWay(by: string | null): WayAnswer {
  const asked = wayArgs(SATURDAY_NIGHT, {
    location: { at: position('SK경영관'), placeId: id('SK경영관'), onCampus: true },
    toPlaceId: id('자연과학관6'),
    by,
  });
  return wayAnswer(onAnotherDay(asked, MONDAY, monday()));
}

describe('A way to a Class on another day', () => {
  it('sets out from the building of the Class before it, when that Class ends, not from where the phone is', () => {
    const answer = mondayWay('13:00');

    expect(answer).toMatchObject({ result: 'found', way: { start: { placeId: id('제1공학관'), basis: 'timetable' } } });
    expect(answer.result === 'found' ? answer.way.deadline?.at : null).toEqual(onDay(MONDAY, '13:00'));
  });

  it('takes the first Class at the Place as the deadline when no time is given', () => {
    const answer = mondayWay(null);

    expect(answer).toMatchObject({ result: 'found', way: { start: { placeId: id('제1공학관') } } });
  });
});
