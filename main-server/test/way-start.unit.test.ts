/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type WayAnswer } from '../src/assistant/lookup/way-lookup.js';
import { classAt, id, ME, position, readCampus, TUESDAY, wayFor } from './way-example.js';

// Where the User sets out from on the way to 문화관, on Tuesday at 12:40: a Place they named; else the Place of their
// location; else that of their last item today that has ended; else nowhere, and there is no way.

beforeAll(() => readCampus());

const NOW = onDay(TUESDAY, '12:40');
const AT_301 = { latitude: 37.45021, longitude: 126.95262 };
// Off the campus's Places: no Place holds it, and none is within 150 m.
const NOWHERE = { latitude: 37.4501, longitude: 126.9601 };

function startWords(answer: WayAnswer): { chip: string | undefined; line: string | undefined } {
  if (answer.result !== 'found') {
    throw new Error('No way');
  }
  const { chips, lines } = answer.lookup;
  return { chip: chips[0]?.text, line: lines[1]?.[0]?.text };
}

const me = (items: DayItem[]): { userId: string; name: string; items: DayItem[] } => ({
  userId: ME,
  name: '유상',
  items,
});

const toCultureHall = (): { toPlaceId: string } => ({ toPlaceId: id('문화관') });

describe('Where the User sets out from', () => {
  it('is the Place they named, before where they are', () => {
    const answer = wayFor(NOW, {
      ...toCultureHall(),
      fromPlaceId: id('제2공학관'),
      location: { at: AT_301, placeId: id('제1공학관') },
    });

    expect(startWords(answer)).toEqual({ chip: '302동에서', line: '302동에서 걸어서 20분' });
  });

  it("is the Place of the User's location when they named none", () => {
    const answer = wayFor(NOW, {
      ...toCultureHall(),
      me: me([classAt(TUESDAY, '11:00', '11:50', '자연과학관6')]),
      location: { at: AT_301, placeId: id('제1공학관') },
    });

    expect(startWords(answer)).toEqual({ chip: '301동에서', line: '지금 있는 301동에서 걸어서 18분' });
  });
});

describe('Where the User sets out from, without a Place of their location', () => {
  it('is the Place of their last item today that has ended, when their location is at no Place', () => {
    const answer = wayFor(NOW, {
      ...toCultureHall(),
      me: me([classAt(TUESDAY, '09:00', '09:50', '자연과학관6'), classAt(TUESDAY, '11:00', '11:50', '제1공학관')]),
      location: { at: NOWHERE, placeId: null },
    });

    expect(startWords(answer)).toEqual({ chip: '301동에서', line: '301동에서 걸어서 18분' });
  });

  it('draws the User at the Place of that item, not measured now', () => {
    const answer = wayFor(NOW, { ...toCultureHall(), me: me([classAt(TUESDAY, '11:00', '11:50', '제1공학관')]) });

    expect(answer.result === 'found' ? answer.lookup.scene.people : []).toEqual([
      { userId: ME, name: '유상', me: true, at: position('제1공학관'), source: 'timetable', tag: '나' },
    ]);
  });

  it('is nowhere with no location and no item ended today, and there is no way', () => {
    const answer = wayFor(NOW, {
      ...toCultureHall(),
      me: me([classAt(TUESDAY, '12:00', '13:15', '제1공학관'), classAt(TUESDAY, '14:00', '15:15', '자연과학관6')]),
    });

    expect(answer).toEqual({ result: 'none', reason: 'no-start' });
  });

  it('is nowhere when the last item that ended has no Place', () => {
    const quest: DayItem = { ...classAt(TUESDAY, '12:00', '12:30', '제1공학관'), placeId: null, isClass: false };

    const answer = wayFor(NOW, {
      ...toCultureHall(),
      me: me([classAt(TUESDAY, '11:00', '11:50', '제1공학관'), quest]),
    });

    expect(answer).toEqual({ result: 'none', reason: 'no-start' });
  });
});
