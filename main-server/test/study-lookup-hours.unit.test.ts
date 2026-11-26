/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type StudyArgs, studyAnswer, type StudyAnswer, type StudyWhat } from '../src/assistant/lookup/study-lookup.js';
import { type StudyArea } from '../src/assistant/lookup/study-near.js';
import { type WayArgs } from '../src/assistant/lookup/way.js';
import { type StudyBuildingDto } from '../src/study-spaces/dto/study-spaces.dto.js';
import { LIBRARY_AREA, seedHours, studyBuildingsFor } from './study-area-example.js';
import { id, ME, numbered, position, readCampus, TUESDAY, wayArgs } from './way-example.js';

// "이 근처 공부할 곳" for an app without `study-plan`, by the seed's hours (P10 ticket 06): a space closed then is never
// the pick, and one whose hours are not known is never picked while a known-open one fits. Tuesday 2026-11-17, a term
// weekday, with nothing after the asked time.

let economics: StudyBuildingDto[] = [];
let computing: StudyBuildingDto[] = [];
let hoursOf: StudyArgs['hoursOf'];

beforeAll(async () => {
  await readCampus();
  [economics, computing] = await Promise.all([studyBuildingsFor('경제학부'), studyBuildingsFor('컴퓨터공학부')]);
  hoursOf = await seedHours();
});

const at = (name: string): WayArgs['location'] => ({ at: position(name), placeId: id(name), onCampus: true });

function asked(
  clock: string,
  area: StudyArea,
  more: { what?: StudyWhat; buildings?: StudyBuildingDto[]; from?: string },
): StudyAnswer {
  const items: DayItem[] = [];
  return studyAnswer({
    way: wayArgs(onDay(TUESDAY, clock), {
      me: { userId: ME, name: '유상', items },
      location: at(more.from ?? '제1공학관'),
    }),
    buildings: more.buildings ?? economics,
    area,
    what: more.what ?? 'quiet',
    hoursOf,
  });
}

function around(number: string): StudyArea {
  const { latitude, longitude } = numbered(number);
  return { south: latitude - 0.0006, west: longitude - 0.0006, north: latitude + 0.0006, east: longitude + 0.0006 };
}

describe('findStudyNearby by the hours', () => {
  it('never picks 관정관 after it closed at 23:00, and picks 중앙도서관, open around the clock', () => {
    const late = asked('23:30', LIBRARY_AREA, {});

    expect(late).toMatchObject({ result: 'found', words: { building: '중앙도서관', hoursKnown: true } });
  });

  it('picks a known-open space over a nearer one whose hours are not known, and says so of an unknown pick', () => {
    const area = { ...around('301'), south: numbered('302').latitude - 0.0006 };
    const nearer = asked('10:00', area, { what: 'any', buildings: computing, from: '제2공학관' });
    const onlyUnknown = asked('10:00', area, { what: 'pc', buildings: computing, from: '제2공학관' });

    expect(nearer).toMatchObject({ result: 'found', words: { building: '제1공학관', hoursKnown: true } });
    expect(onlyUnknown).toMatchObject({ result: 'found', words: { hoursKnown: false } });
    expect(onlyUnknown.result === 'found' ? onlyUnknown.lookup.basis.join(' ') : '').toContain('여는 시간을 몰라요');
  });

  it('answers none when every space there is closed then', () => {
    expect(asked('23:30', around('16'), {})).toEqual({ result: 'none', reason: 'all-closed' });
  });
});
