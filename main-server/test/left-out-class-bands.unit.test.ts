/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type StudyInput } from '../src/assistant/dto/answer.dto.js';
import { onDay } from '../src/assistant/free-time/free-time.js';
import { CATALOGUE_FILE, type Catalogue, readCatalogue } from '../src/assistant/library/catalogue.js';
import { groupRooms } from '../src/assistant/library/study-room.js';
import { type GroupPerson, studyGroupTime } from '../src/assistant/lookup/study-group.js';
import { studyGroupAnswer } from '../src/assistant/lookup/study-group-parts.js';
import { studyPlanAnswer } from '../src/assistant/lookup/study-plan.js';
import { item, KWANJEONG, walkingMinutes } from './study-fixtures.js';
import { classAt, ME, readCampus, TUESDAY, wayArgs } from './way-example.js';

// Every time card draws the asker's Classes the conversation leaves out apart (P05 ticket 70), whatever the answer:
// studying together, with a plan or without one, and a place to study alone without a plan. The asker's lane no longer
// holds them; a Friend's never leaves one out.

let catalogue: Catalogue;

beforeAll(async () => {
  await readCampus();
  catalogue = await readCatalogue(CATALOGUE_FILE);
});

const TOMORROW = '2026-11-18';
const NOW = new Date('2026-11-17T10:00:00+09:00');
const POINT = { placeId: KWANJEONG, label: '관정관(62-1동)', latitude: 37.4594, longitude: 126.9502 };
const LEFT_OUT = item(TOMORROW, '13:00', '14:15', '301');

// The asker with the Class left out; each Friend free after a morning Class, or busy all day.
function person(index: number, busyAllDay: boolean): GroupPerson {
  const busy =
    busyAllDay && index > 0 ? item(TOMORROW, '06:00', '23:59', '301') : item(TOMORROW, '09:00', '12:45', '301');
  return {
    userId: index === 0 ? 'me' : `friend-${index}`,
    name: index === 0 ? '나' : `친구${index}`,
    me: index === 0,
    itemsByDate: { [TOMORROW]: [busy] },
    ...(index === 0 ? { skippedByDate: { [TOMORROW]: [LEFT_OUT] } } : {}),
    constraints: [],
  };
}

function together(count: number, busyAllDay = false): AnswerReply {
  const people = Array.from({ length: count }, (_, index) => person(index, busyAllDay));
  const input: StudyInput = {
    kind: 'study',
    date: TOMORROW,
    what: 'any',
    people: people.map(({ userId, constraints }) => ({ userId, constraints })),
    together: true,
    window: { from: null, until: null },
    area: null,
    minutes: null,
    chosen: { seatSpaceId: null, roomSpaceId: null },
  };
  const time = studyGroupTime({
    input,
    dates: [TOMORROW],
    now: NOW,
    catalogue,
    people,
    kwanjeongPlaceId: KWANJEONG,
    walkingMinutes,
  });
  return studyGroupAnswer({
    time,
    input,
    now: NOW,
    people,
    setOut: new Map(),
    others: [],
    kwanjeong: POINT,
    walkingMinutes,
    placePoint: (placeId) => ({ ...POINT, placeId, label: `${placeId}동` }),
    placeLabel: (placeId) => `${placeId}동`,
    hours: groupRooms(catalogue)[0]?.hours ?? null,
  });
}

const skippedOf = (band: AnswerReply['plans'][number]['band'] | undefined): [string, string][] =>
  (band?.skipped ?? []).map(({ id, label }) => [id, label]);

// Partitions: four people free in the afternoon (a plan); Friends busy all day (no plan). Expected values: the left-out Class
// labelled as a lane's busy stretch.
describe("Studying together, the asker's Class left out", () => {
  it('is drawn apart on the plan’s band', () => {
    const answer = together(4);

    expect(skippedOf(answer.plans[0]?.band)).toEqual([[LEFT_OUT.id, '301동 수업']]);
  });

  it('is drawn apart on the band of an answer without a plan', () => {
    const answer = together(4, true);

    expect(answer.plans).toEqual([]);
    expect(skippedOf(answer.noPlan?.band)).toEqual([[LEFT_OUT.id, '301동 수업']]);
  });
});

// Partitions: a place to study alone with no building near. Expected values: the left-out Class at 301동.
describe("A place to study alone without a plan, the asker's Class left out", () => {
  it('keeps the Class apart on its band', () => {
    const now = onDay(TUESDAY, '10:00');
    const leftOut = classAt(TUESDAY, '13:00', '14:15', '제1공학관');
    const answer = studyPlanAnswer({
      input: {
        kind: 'study',
        date: TUESDAY,
        what: 'any',
        people: [{ userId: ME, constraints: [] }],
        together: false,
        window: { from: null, until: null },
        area: null,
        minutes: null,
        chosen: { seatSpaceId: null, roomSpaceId: null },
      },
      way: wayArgs(now, { me: { userId: ME, name: '유상', items: [], skipped: [leftOut] } }),
      now,
      buildings: [],
      hoursOf: () => {
        throw new Error('No building is asked for its hours');
      },
      catalogue,
    });

    expect(answer.plans).toEqual([]);
    expect(answer.noPlan?.band?.skipped?.map(({ id }) => id)).toEqual([leftOut.id]);
  });
});
