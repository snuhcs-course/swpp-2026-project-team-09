/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { koreaDate } from '../src/assistant/korea-time.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { type Calendar, openAt, type Schedule } from '../src/study-spaces/study-hours.js';
import { STUDY_SPACES_FILE, type StudySpacesFile, studySpacesSchema } from '../src/study-spaces/study-spaces-file.js';

// The study spaces' hours and public holidays as study-spaces.json holds them (P10 ticket 01).

const range = (open: string, close: string): { open: string; close: string }[] => [{ open, close }];
const every = (hours: Schedule['lunarHolidays']): Schedule['week'] => ({
  weekday: hours,
  saturday: hours,
  sunday: hours,
});
const at = (date: string, clock: string): Date => new Date(`${date}T${clock}:00+09:00`);

let spaces: StudySpacesFile['buildings'][number]['spaces'];
let seedCalendar: Calendar;

beforeAll(async () => {
  const file = await readSeedFile(SEED_DIRECTORY, STUDY_SPACES_FILE, studySpacesSchema);
  spaces = file.buildings.flatMap((building) => building.spaces);
  seedCalendar = file.calendar;
});

function byKey(key: string): Schedule {
  const found = spaces.find((space) => space.key === key);
  if (found === undefined) {
    throw new Error(`No space ${key}`);
  }
  return found.schedule;
}

describe("study-spaces.json's hours", () => {
  it('leaves the spaces the research found no hours for unknown on every day, with no source', () => {
    const unknown = spaces.filter(({ schedule }) => schedule.sources.length === 0).map(({ key }) => key);

    expect(unknown).toEqual([
      'engineering-sinyang-pc-rooms',
      'engineering-sinyang-group-rooms',
      'yuhoejin-study-rooms',
      'me-haedong-study-hall',
      'cse-student-space',
      'cse-software-lab',
      'humanities-sinyang-lounge',
    ]);
    for (const key of unknown) {
      expect(Object.values(byKey(key).week)).toEqual([null, null, null]);
    }
  });

  it("takes the 경영대학's narrower hours for the 경영학도서관 열람실, and says the sources disagree", () => {
    const reading = byKey('business-reading-room');

    expect(reading.week).toEqual({ weekday: range('09:00', '23:00'), saturday: 'closed', sunday: 'closed' });
    expect(reading.confidence).toBe('low');
    expect(reading.note).toContain('07:00–23:00');
  });

  it('gives the 수의학도서관 그룹스터디룸 the library page’s hours, apart from its 정보자료실', () => {
    expect(byKey('veterinary-group-rooms').week).toEqual(every(range('07:00', '23:00')));
    expect(byKey('veterinary-library').week).toEqual({
      weekday: range('09:00', '18:00'),
      saturday: 'closed',
      sunday: 'closed',
    });
  });

  it('marks the 사회과학도서관 그룹스터디룸, read only from a copy of its page, as low confidence', () => {
    expect(byKey('social-sciences-group-rooms')).toMatchObject({
      confidence: 'low',
      holiday: null,
      lunarHolidays: null,
    });
  });
});

describe("study-spaces.json's public holidays", () => {
  it('reach past today: fill the list again from the official rules before this fails', () => {
    expect(koreaDate(new Date()) <= seedCalendar.holidays.filled.to).toBe(true);
  });

  it('give 설 and 추석 apart, and every substitute day on a weekday', () => {
    const { dates, lunar } = seedCalendar.holidays;
    const substitutes = dates.filter(({ name }) => name.endsWith('대체공휴일'));

    expect(lunar.map(({ name }) => name)).toEqual([
      '설날 전날',
      '설날',
      '설날 다음 날',
      '추석 전날',
      '추석',
      '추석 다음 날',
    ]);
    expect(substitutes.map(({ date }) => new Date(`${date}T00:00:00Z`).getUTCDay() % 6)).not.toContain(0);
  });

  it('close a space whose holidays take Saturday’s column on a substitute day, and on 추석 by its own value', () => {
    const stacks = byKey('social-sciences-stacks');

    expect(openAt(stacks, seedCalendar, at('2027-07-19', '10:00'))).toMatchObject({ state: 'closed' });
    expect(openAt(stacks, seedCalendar, at('2027-07-20', '10:00'))).toMatchObject({ state: 'open' });
    expect(openAt(stacks, seedCalendar, at('2027-09-15', '10:00'))).toMatchObject({ state: 'closed' });
  });
});
