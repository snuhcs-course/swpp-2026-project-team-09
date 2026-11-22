/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { onDay } from '../src/assistant/free-time/free-time.js';
import { gather, type GatheringPerson, type PersonPart } from '../src/assistant/gathering/gathering.js';
import { GatheringNaming, wayWords } from '../src/assistant/gathering/answer-words.js';
import { partOf } from '../src/assistant/gathering/plan-parts.js';
import { classAt, id, placeOf, readCampus, seedTravel } from './way-example.js';

// A lunch planned the evening before, on the seed's walking table and shuttle timing: the way from 301동 to 58동 is
// 25 minutes on foot, and the shuttle from the 301동 stop to the 경영대 stop on a weekday at noon.

beforeAll(() => readCampus());

const SUNDAY = '2026-11-22';
const MONDAY = '2026-11-23';
const SATURDAY = '2026-11-28';

function lunchOn(date: string, to: string, next: string | null = null): PersonPart {
  const window = { start: onDay(date, '11:00'), end: onDay(date, '14:30') };
  const after = next === null ? null : classAt(date, '14:30', '15:45', next);
  const me: GatheringPerson = {
    id: 'me',
    free: [{ ...window, previous: null, next: after }],
    locationPlaceId: null,
    chosenPlaceId: id('제1공학관'),
  };
  const asked = onDay(date === MONDAY ? SUNDAY : date, '09:00');
  const { fits } = gather([me], [{ key: to, placeId: id(to) }], { window, now: asked }, seedTravel());
  const [part] = fits[0]?.parts ?? [];
  if (part === undefined) {
    throw new Error('No plan');
  }
  return part;
}

describe('A Monday lunch planned on Sunday evening', () => {
  it('goes by the shuttle on Monday, which it beats the 25-minute walk by, with its stops', () => {
    const part = lunchOn(MONDAY, 'SK경영관');

    expect(part).toMatchObject({ walkMinutes: 13, by: 'shuttle', shuttle: { boardAt: '301동', getOffAt: '경영대' } });
    expect(wayWords(13, part)).toBe('셔틀로 13분 (301동 정류장 → 경영대 정류장)');
  });

  it('takes the shuttle on to the next Class too, when it is faster then', () => {
    expect(lunchOn(MONDAY, 'SK경영관', '제1공학관').next).toMatchObject({
      walkMinutes: 18,
      by: 'shuttle',
      shuttle: { boardAt: '경영대', getOffAt: '302동' },
    });
  });
});

describe('A way the shuttle does not take', () => {
  it('walks on a Saturday, when the shuttle does not run', () => {
    const part = lunchOn(SATURDAY, 'SK경영관', '제1공학관');

    expect(part).toMatchObject({ walkMinutes: 25, by: 'walk', shuttle: null });
    expect(part.next).toMatchObject({ walkMinutes: 25, by: 'walk', shuttle: null });
    expect(wayWords(25, part)).toBe('걸어서 25분');
  });

  it('never weighs the shuttle for a walk under 10 minutes', () => {
    const travel = seedTravel();
    const asked = vi.spyOn(travel, 'travel');
    const part = lunchOn(MONDAY, '제2공학관');

    expect(part).toMatchObject({ walkMinutes: 3, by: 'walk', shuttle: null });
    expect(asked).not.toHaveBeenCalled();
    asked.mockRestore();
  });
});

// A Monday lunch's naming, the asker alone.
const naming = (): GatheringNaming =>
  new GatheringNaming({
    input: {
      kind: 'meal',
      date: MONDAY,
      meal: 'lunch',
      people: [{ userId: 'me', constraints: [] }],
      window: { from: null, until: null },
      placeId: null,
    },
    now: onDay(SUNDAY, '21:00'),
    people: [{ userId: 'me', name: '유상', me: true, items: [], position: null }],
    gathering: { shared: null, sides: [], fits: [], dropped: [] },
    placeOf,
  });

describe('What the app is sent of a way by the shuttle', () => {
  it('sets mode and the stops on the part, and by on its next', () => {
    const sent = partOf(lunchOn(MONDAY, 'SK경영관', '제1공학관'), naming());

    expect(sent).toMatchObject({ walkMinutes: 13, mode: 'shuttle', shuttle: { boardAt: '301동', getOffAt: '경영대' } });
    expect(sent.next?.by).toBe('shuttle');
  });

  it('sends a walk as before, without mode, stops, or by', () => {
    const sent = partOf(lunchOn(SATURDAY, 'SK경영관', '제1공학관'), naming());

    expect(sent).not.toHaveProperty('mode');
    expect(sent).not.toHaveProperty('shuttle');
    expect(sent.next).not.toHaveProperty('by');
  });
});
