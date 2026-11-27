/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type StudyArgs, studyAnswer, type StudyAnswer, type StudyWhat } from '../src/assistant/lookup/study-lookup.js';
import { type StudyArea } from '../src/assistant/lookup/study-near.js';
import { GATE_BASIS } from '../src/assistant/lookup/way-lookup.js';
import { type WayArgs } from '../src/assistant/lookup/way.js';
import { type StudyBuildingDto } from '../src/study-spaces/dto/study-spaces.dto.js';
import {
  A9_AREA,
  ENGINEERING_AREA,
  LIBRARY_AREA,
  MOUNTAIN_AREA,
  seedHours,
  studyBuildingsFor,
} from './study-area-example.js';
import { classAt, id, ME, point, position, readCampus, TUESDAY, wayArgs } from './way-example.js';

// "이 근처 조용히 공부할 곳" over the visible area (board a9): on Tuesday 2026-11-17 at 12:10 the User is at 301동 after
// a Class there until 11:50, with the next at 13:00 in 24동, on the seed's Places, walking table, and study spaces.
// On the walking table 301동 to 44-1동 is 8 minutes and 44-1동 to 24동 8 minutes: the User arrives at 12:18 and leaves
// by 12:52, 34 minutes. 301동 to 24동 is 15 minutes.

let economics: StudyBuildingDto[] = [];
let computing: StudyBuildingDto[] = [];
let hoursOf: StudyArgs['hoursOf'];

beforeAll(async () => {
  await readCampus();
  [economics, computing] = await Promise.all([studyBuildingsFor('경제학부'), studyBuildingsFor('컴퓨터공학부')]);
  hoursOf = await seedHours();
});

const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

const tuesday = (): DayItem[] => [
  classAt(TUESDAY, '11:00', '11:50', '제1공학관'),
  classAt(TUESDAY, '13:00', '13:50', '자연과학관6'),
];

const at301 = (): WayArgs['location'] => ({
  at: position('제1공학관'),
  placeId: id('제1공학관'),
  onCampus: true,
});

interface Asked {
  clock?: string;
  buildings?: StudyBuildingDto[];
  area?: StudyArea | null;
  what?: StudyWhat;
  items?: DayItem[];
  location?: WayArgs['location'];
}

// Asked on Tuesday at 12:10 at 301동, by a student of 경제학부 over board a9's area, unless given otherwise.
function asked(given: Asked = {}): StudyAnswer {
  const now = onDay(TUESDAY, given.clock ?? '12:10');
  const location = given.location === undefined ? at301() : given.location;
  return studyAnswer({
    way: wayArgs(now, { me: { userId: ME, name: '유상', items: given.items ?? tuesday() }, location }),
    buildings: given.buildings ?? economics,
    area: given.area === undefined ? A9_AREA : given.area,
    what: given.what ?? 'quiet',
    hoursOf,
  });
}

function lookupOf(answer: StudyAnswer): Lookup {
  if (answer.result !== 'found') {
    throw new Error(`No Lookup: ${answer.reason}`);
  }
  return answer.lookup;
}

const SINYANG = (): ReturnType<typeof point> => point('신양학술정보관', '공대 신양학술정보관(44-1동)');

describe('Board a9: a quiet place to study over 공대', () => {
  it('is a study Lookup with the start, the next Class, the area, and the kind asked as its chips', () => {
    expect(lookupOf(asked())).toMatchObject({
      kind: 'study',
      chips: [
        { kind: 'origin', text: '301동에서', userId: null },
        { kind: 'until', text: '13:00 수업까지', userId: null },
        { kind: 'area', text: '보는 범위', userId: null },
        { kind: 'what', text: '조용한 곳', userId: null },
      ],
      band: null,
    });
  });

  it('names the pick, and says that only 관정 tells its free seats', () => {
    expect(lookupOf(asked()).lines).toEqual([
      [plain('보는 범위에선 '), strong('공대 신양학술정보관')],
      [plain('빈 자리 수는 관정만 알 수 있어요')],
    ]);
  });

  it('rests on the visible area, and on the department rooms faded', () => {
    expect(lookupOf(asked()).basis).toEqual([
      '지도에 보이는 범위 안의 공부공간만 찾았어요',
      '학과 전용 열람실은 흐리게 두었어요',
    ]);
  });
});

describe('Board a9 on the map', () => {
  it('draws the User, the pick with its space and hours, each restricted room faded, and the way there', () => {
    const { people, places, routes } = lookupOf(asked()).scene;

    expect(people).toEqual([
      { userId: ME, name: '유상', me: true, at: position('제1공학관'), source: 'exact', tag: '나' },
    ]);
    expect(places).toEqual([
      { place: SINYANG(), role: 'pick', tag: '3층 자유열람실 · 학기 중 24시간' },
      {
        place: point('제1공학관', '제1공학관(301동)'),
        role: 'dropped',
        tag: '해동학술정보실 · 전기·정보공학부·컴퓨터공학부',
      },
      {
        place: point('제2공학관', '제2공학관(302동)'),
        role: 'dropped',
        tag: '화생공 해동학술정보실·학생라운지 · 화학생물공학부',
      },
    ]);
    expect(routes).toEqual([
      { userId: ME, role: 'me', from: position('제1공학관'), to: position('신양학술정보관'), minutes: 8 },
    ]);
  });

  // From the area's centre (37.4515, 126.9525) to 관정관 (37.45903, 126.95247), the line leaves by the north side at
  // 0.0045 / 0.00753 of the way: 126.9525 − 0.00003 × 0.5976 = 126.952482.
  it('flags the walk and the stay at the pick, and 관정 at the north edge of the area', () => {
    const { flags } = lookupOf(asked()).scene;
    const [, away] = flags;

    expect(flags).toEqual([
      { at: position('신양학술정보관'), text: '걸어서 8분 · 12:52까지 34분', role: 'place' },
      { at: away?.at, text: '↑ 관정', role: 'away', placeId: id('중앙도서관 관정관') },
    ]);
    expect(away?.at.latitude).toBe(37.456);
    expect(away?.at.longitude).toBeCloseTo(126.952482, 6);
  });

  it('has route guidance to the pick, then asks after 관정', () => {
    expect(lookupOf(asked()).actions).toEqual([
      { kind: 'guide', to: SINYANG() },
      { kind: 'ask', label: '관정 보기', text: '관정 지금 자리 있어?' },
    ]);
  });
});

describe('Board a9 for the model', () => {
  it('gives the model names and minutes, and no coordinates', () => {
    const answer = asked();

    expect(answer).toMatchObject({
      words: {
        building: '공대 신양학술정보관',
        space: '3층 자유열람실',
        hours: '학기 중 24시간 · 방학 08:00–24:00',
        from: '301동',
        walkMinutes: 8,
        next: '13:00 수업',
        leaveBy: '12:52',
        stayMinutes: 34,
        restricted: [
          { building: '제1공학관', space: '해동학술정보실', openTo: '전기·정보공학부·컴퓨터공학부' },
          { building: '제2공학관', space: '화생공 해동학술정보실·학생라운지', openTo: '화학생물공학부' },
        ],
        kwanjeong: 'outside the visible area',
      },
    });
    expect(JSON.stringify(answer.result === 'found' ? answer.words : null)).not.toMatch(/37\.|126\./u);
  });
});

describe('A room the User may use in the building they are in', () => {
  // 컴퓨터공학부 may use 301동's 해동학술정보실: 0 minutes there, 15 on to 24동, 12:10 to 12:45, 35 minutes.
  it('is picked over 44-1동, with no way to walk and no route guidance', () => {
    const lookup = lookupOf(asked({ buildings: computing }));

    expect(lookup.lines[0]).toEqual([plain('보는 범위에선 '), strong('제1공학관'), plain(' 외 1곳')]);
    expect(lookup.scene.places[0]).toEqual({
      place: point('제1공학관', '제1공학관(301동)'),
      role: 'pick',
      tag: '해동학술정보실 · 24시간',
    });
    expect(lookup.scene.routes).toEqual([]);
    expect(lookup.scene.flags[0]).toEqual({ at: position('제1공학관'), text: '12:45까지 35분', role: 'place' });
    expect(lookup.actions).toEqual([{ kind: 'ask', label: '관정 보기', text: '관정 지금 자리 있어?' }]);
  });

  // The usage test of 2026-11-21 found a reading room on the screen left out of the answer: every other building with a
  // space the User may use is drawn and named after the pick.
  it('names and draws 44-1동, the other building in view the User may use, after the pick', () => {
    const answer = asked({ buildings: computing });

    expect(lookupOf(answer).scene.places[1]).toMatchObject({ place: SINYANG(), role: 'candidate' });
    expect(answer.result === 'found' ? answer.words.others.map(({ building }) => building) : []).toEqual([
      '공대 신양학술정보관',
    ]);
  });
});

describe('The area and the kind asked', () => {
  it('draws no flag towards 관정 when the area holds it', () => {
    const { flags } = lookupOf(asked({ area: LIBRARY_AREA })).scene;

    expect(flags.map(({ role }) => role)).not.toContain('away');
  });

  // Any kind: 44-1동's 3층 자유열람실 and its PC rooms tie, and the list's order picks the first.
  it('names the kind asked in its chip, and picks from every kind for any place to study', () => {
    const lookup = lookupOf(asked({ what: 'any' }));

    expect(lookup.chips.at(-1)).toEqual({ kind: 'what', text: '공부할 곳', userId: null });
    expect(lookup.scene.places[0]?.tag).toBe('3층 자유열람실 · 학기 중 24시간');
  });

  it('is measured from the main gate off campus, and says so', () => {
    const off = { at: { latitude: 37.47, longitude: 126.95 }, placeId: null, onCampus: false };
    const lookup = lookupOf(asked({ location: off }));

    expect(lookup.chips[0]).toEqual({ kind: 'origin', text: '정문에서', userId: null });
    expect(lookup.basis.at(-1)).toBe(GATE_BASIS);
  });

  it('has no chip of the next item and no time at the pick when nothing follows today', () => {
    const lookup = lookupOf(asked({ items: [classAt(TUESDAY, '11:00', '11:50', '제1공학관')] }));

    expect(lookup.chips.map(({ kind }) => kind)).toEqual(['origin', 'area', 'what']);
    expect(lookup.scene.flags[0]?.text).toBe('걸어서 8분');
  });
});

describe('Nothing to draw', () => {
  it('without a visible area', () => {
    expect(asked({ area: null })).toEqual({ result: 'none', reason: 'no-area' });
  });

  it('with no study space of the kind in the area', () => {
    expect(asked({ area: MOUNTAIN_AREA })).toEqual({ result: 'none', reason: 'nothing-in-area' });
  });

  it('with only rooms open to others in the area, which the model is told of', () => {
    expect(asked({ area: ENGINEERING_AREA })).toEqual({
      result: 'none',
      reason: 'none-usable',
      restricted: [
        { building: '제1공학관', space: '해동학술정보실', openTo: '전기·정보공학부·컴퓨터공학부' },
        { building: '제2공학관', space: '화생공 해동학술정보실·학생라운지', openTo: '화학생물공학부' },
      ],
    });
  });

  it('without a location and before any item has ended today', () => {
    expect(asked({ clock: '10:00', location: null })).toEqual({ result: 'none', reason: 'no-start' });
  });
});

// P05 ticket 47: only an hours or a menu answer is a fact.
it('is no fact', () => {
  expect(lookupOf(asked())).not.toHaveProperty('fact');
});
