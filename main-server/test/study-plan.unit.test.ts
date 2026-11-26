/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type StudyInput } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type StudyArea } from '../src/assistant/lookup/study-near.js';
import { readyAt, studyPlanAnswer } from '../src/assistant/lookup/study-plan.js';
import { type WayArgs } from '../src/assistant/lookup/way.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type StudyBuildingDto } from '../src/study-spaces/dto/study-spaces.dto.js';
import { type Calendar, openAt, type Schedule } from '../src/study-spaces/study-hours.js';
import { STUDY_SPACES_FILE, studySpacesSchema } from '../src/study-spaces/study-spaces-file.js';
import { ENGINEERING_AREA, MOUNTAIN_AREA, studyBuildingsFor } from './study-area-example.js';
import { classAt, id, ME, numbered, position, readCampus, TUESDAY, wayArgs } from './way-example.js';

// "공부할 자리 있어?" ranked over the seed's buildings and hours (P10 ticket 03), on Tuesday 2026-11-17, a term
// weekday, by the seed's calendar. The User is at 301동 unless given otherwise.

let schedules = new Map<string, Schedule>();
let calendar: Calendar;
const buildingsBy = new Map<string, StudyBuildingDto[]>();

beforeAll(async () => {
  await readCampus();
  const file = await readSeedFile(SEED_DIRECTORY, STUDY_SPACES_FILE, studySpacesSchema);
  schedules = new Map(file.buildings.flatMap(({ spaces }) => spaces.map(({ key, schedule }) => [key, schedule])));
  calendar = file.calendar;
  const departments = ['경제학부', '컴퓨터공학부', '화학생물공학부'];
  const listed = await Promise.all(departments.map((department) => studyBuildingsFor(department)));
  for (const [index, department] of departments.entries()) {
    buildingsBy.set(department, listed[index] ?? []);
  }
});

interface Asked {
  clock: string;
  department?: string;
  what?: StudyInput['what'];
  area?: StudyArea | null;
  items?: DayItem[];
  location?: WayArgs['location'];
}

const at301 = (): WayArgs['location'] => ({ at: position('제1공학관'), placeId: id('제1공학관'), onCampus: true });

function asked({
  clock,
  department = '경제학부',
  what = 'any',
  area = null,
  items = [],
  ...given
}: Asked): AnswerReply {
  const now = onDay(TUESDAY, clock);
  const input: StudyInput = {
    kind: 'study',
    date: TUESDAY,
    what,
    people: [{ userId: ME, constraints: [] }],
    window: { from: null, until: null },
    area,
    minutes: null,
    chosen: { seatSpaceId: null, roomSpaceId: null },
  };
  return studyPlanAnswer({
    input,
    way: wayArgs(now, {
      me: { userId: ME, name: '유상', items },
      location: given.location === undefined ? at301() : given.location,
    }),
    now,
    buildings: buildingsBy.get(department) ?? [],
    hoursOf: (key, when) => {
      const schedule = schedules.get(key);
      if (schedule === undefined) {
        throw new Error(`No hours for ${key}`);
      }
      return { opening: openAt(schedule, calendar, when), confidence: schedule.confidence };
    },
  });
}

const known = ({ study }: AnswerReply['plans'][number]): boolean => study?.spaces[0]?.open === 'open';
const ids = ({ plans }: AnswerReply): string[] => plans.map(({ id: planId }) => planId);
const closedOf = ({ closed = [] }: AnswerReply): [string, string[]][] =>
  closed.map(({ place, notices }) => [place.label, notices]);

// Around 16동, 사회과학도서관 alone.
function socialSciencesArea(): StudyArea {
  const { latitude, longitude } = numbered('16');
  return { south: latitude - 0.0003, west: longitude - 0.0003, north: latitude + 0.0003, east: longitude + 0.0003 };
}

describe('Study places at 10:00 on a term weekday', () => {
  it('lists the buildings known open first, then those whose hours are not known, each by the shorter walk when every stay is long enough', () => {
    const { plans } = asked({ clock: '10:00' });
    const firstUnknown = plans.findIndex((plan) => !known(plan));

    expect(firstUnknown).toBeGreaterThan(0);
    expect(plans.slice(firstUnknown).every((plan) => !known(plan))).toBe(true);
    expect(plans.every(({ togetherMinutes }) => togetherMinutes >= 180)).toBe(true);
    for (const group of [plans.slice(0, firstUnknown), plans.slice(firstUnknown)]) {
      const walks = group.map(({ parts }) => parts[0]?.walkMinutes ?? 0);
      expect(walks).toEqual(walks.toSorted((a, b) => a - b));
    }
    expect(plans.slice(firstUnknown).flatMap(({ lines }) => lines.at(-1))).toEqual(
      plans.slice(firstUnknown).map(() => ({ text: '여는 시간을 몰라요', strong: false })),
    );
  });

  it('drops 제2공학관 for a 경제학부 User, with whom it is open to, and plans it for a 화학생물공학부 User', () => {
    const economics = asked({ clock: '10:00' });
    const chemical = asked({ clock: '10:00', department: '화학생물공학부' });

    expect(economics.dropped.map(({ reason }) => reason)).toContain('화학생물공학부 학생만 쓸 수 있어요');
    expect(ids(economics)).not.toContain('제2공학관');
    expect(ids(chemical)).toContain('제2공학관');
  });

  it('numbers every building on each plan’s map, the plan’s own the pick', () => {
    const { plans } = asked({ clock: '10:00' });
    const second = plans[1]?.scene.places.filter(({ role }) => role === 'pick' || role === 'candidate');

    expect(second?.map(({ order }) => order)).toEqual(plans.map((_, index) => index + 1));
    expect(second?.find(({ role }) => role === 'pick')?.order).toBe(2);
  });

  it('lists a building closed then apart, with when it opens', () => {
    const early = asked({ clock: '07:30' });

    expect(closedOf(early)).toContainEqual(['사회과학도서관(16동)', ['09:00에 열어요']]);
    expect(ids(early)).not.toContain('사회과학도서관');
  });
});

describe('Study places at 23:30', () => {
  it('puts the 24-hour spaces first, before the stays cut short by a closing, and 관정 among the closed', () => {
    const late = asked({ clock: '23:30' });

    expect(ids(late).slice(0, 4)).toEqual(['공대 신양학술정보관', '중앙도서관', '법학도서관', '제1법학관']);
    expect(late.plans.slice(2, 4).map(({ togetherMinutes }) => togetherMinutes)).toEqual([71, 69]);
    expect(late.plans[0]?.lines[0]?.[1]).toEqual({ text: ' · 24시간', strong: false });
    expect(closedOf(late)).toContainEqual(['관정관(62-1동)', ['오늘 23:00에 닫았어요']]);
  });

  it('with nothing open or unknown, says so and which opens first', () => {
    const { plans, noPlan } = asked({ clock: '07:30', area: socialSciencesArea() });

    expect(plans).toEqual([]);
    expect(noPlan).toEqual({
      reason: 'no-fit',
      lines: [
        [{ text: '지금 연 공부할 곳이 없어요', strong: false }],
        [
          { text: '사회과학도서관(16동)', strong: true },
          { text: ' 09:00에 열어요', strong: false },
        ],
      ],
    });
  });
});

describe('Study places in the area the User sees', () => {
  it('holds only the buildings in it', () => {
    expect(ids(asked({ clock: '10:00', department: '컴퓨터공학부', area: ENGINEERING_AREA })).toSorted()).toEqual([
      '제1공학관',
      '제2공학관',
    ]);
  });

  it('says none is there, or that every one there is open only to others', () => {
    expect(asked({ clock: '10:00', area: MOUNTAIN_AREA }).noPlan?.lines[0]).toEqual([
      { text: '보는 범위에 공부할 곳이 없어요', strong: false },
    ]);
    expect(asked({ clock: '10:00', area: ENGINEERING_AREA }).noPlan?.lines[0]).toEqual([
      { text: '쓸 수 있는 공부할 곳이 없어요', strong: false },
    ]);
  });
});

describe('A study plan before the next Class', () => {
  it('ends the stay by the walk on to it, and says so', () => {
    const items = [classAt(TUESDAY, '11:00', '11:50', '제1공학관'), classAt(TUESDAY, '13:00', '13:50', '자연과학관6')];
    const { plans } = asked({ clock: '12:10', items });
    const sinyang = plans.find(({ id: planId }) => planId === '공대 신양학술정보관');

    expect(sinyang).toMatchObject({ startAt: '2026-11-17T12:18:00+09:00', endAt: '2026-11-17T12:52:00+09:00' });
    expect(sinyang?.lines[1]).toEqual([{ text: '13:00 수업 전 34분', strong: false }]);
    expect(sinyang?.parts[0]).toMatchObject({ walkMinutes: 8, leaveBy: '2026-11-17T12:52:00+09:00' });
  });
});

describe('관정관’s plan', () => {
  it('books the first 7층 seat for a quiet place or any, and no other plan books', () => {
    for (const what of ['quiet', 'any'] as const) {
      const { plans } = asked({ clock: '10:00', what });
      const booked = plans.flatMap(({ id: planId, study }) => (study?.book === null ? [] : [[planId, study?.book]]));

      expect(booked).toEqual([['관정관', { spaceId: '7F-7A-zone2' }]]);
      expect(plans.find(({ id: planId }) => planId === '관정관')?.study?.liveSeats).toBe('kwanjeong');
    }
  });

  it('is no plan for computers or a group room, whose 관정 bookings take another path', () => {
    for (const what of ['pc', 'group'] as const) {
      expect(ids(asked({ clock: '10:00', what }))).not.toContain('관정관');
    }
  });
});

describe('When the User is ready', () => {
  const now = onDay(TUESDAY, '10:00');

  it('is the time asked from, another day’s 09:00, or now', () => {
    const window = { from: null, until: null };

    expect(readyAt({ date: TUESDAY, window: { from: '15:00', until: null } }, now)).toEqual(onDay(TUESDAY, '15:00'));
    expect(readyAt({ date: '2026-11-18', window }, now)).toEqual(onDay('2026-11-18', '09:00'));
    expect(readyAt({ date: TUESDAY, window }, now)).toEqual(now);
  });
});
