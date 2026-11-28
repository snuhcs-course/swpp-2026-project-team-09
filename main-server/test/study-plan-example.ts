/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type StudyInput } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { type StudyArea } from '../src/assistant/lookup/study-near.js';
import { studyPlanAnswer } from '../src/assistant/lookup/study-plan.js';
import { CATALOGUE_FILE, type Catalogue, readCatalogue } from '../src/assistant/library/catalogue.js';
import { type WayArgs } from '../src/assistant/lookup/way.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type StudyBuildingDto } from '../src/study-spaces/dto/study-spaces.dto.js';
import { type Calendar, openAt, type Schedule } from '../src/study-spaces/study-hours.js';
import { STUDY_SPACES_FILE, studySpacesSchema } from '../src/study-spaces/study-spaces-file.js';
import { studyBuildingsFor } from './study-area-example.js';
import { id, ME, position, readCampus, TUESDAY, wayArgs } from './way-example.js';

// "공부할 자리 있어?" asked over the seed's buildings and hours (P10 ticket 03), on Tuesday 2026-11-17, a term weekday,
// by the seed's calendar, for the study plan's tests. The User is at 301동 unless given otherwise. `readStudySeed` runs
// before them.

let schedules = new Map<string, Schedule>();
let calendar: Calendar;
let catalogue: Catalogue;
const buildingsBy = new Map<string, StudyBuildingDto[]>();

export async function readStudySeed(): Promise<void> {
  await readCampus();
  catalogue = await readCatalogue(CATALOGUE_FILE);
  const file = await readSeedFile(SEED_DIRECTORY, STUDY_SPACES_FILE, studySpacesSchema);
  schedules = new Map(file.buildings.flatMap(({ spaces }) => spaces.map(({ key, schedule }) => [key, schedule])));
  calendar = file.calendar;
  const departments = ['경제학부', '컴퓨터공학부', '화학생물공학부'];
  const listed = await Promise.all(departments.map((department) => studyBuildingsFor(department)));
  for (const [index, department] of departments.entries()) {
    buildingsBy.set(department, listed[index] ?? []);
  }
}

export interface Asked {
  clock: string;
  date?: string;
  department?: string;
  what?: StudyInput['what'];
  area?: StudyArea | null;
  items?: DayItem[];
  location?: WayArgs['location'];
}

const at301 = (): WayArgs['location'] => ({ at: position('제1공학관'), placeId: id('제1공학관'), onCampus: true });

export function asked({
  clock,
  department = '경제학부',
  what = 'any',
  area = null,
  items = [],
  date = TUESDAY,
  ...given
}: Asked): AnswerReply {
  const now = onDay(date, clock);
  const input: StudyInput = {
    kind: 'study',
    date,
    what,
    people: [{ userId: ME, constraints: [] }],
    together: false,
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
    catalogue,
  });
}
