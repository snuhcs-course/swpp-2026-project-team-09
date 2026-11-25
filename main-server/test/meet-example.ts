/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MeetInput } from '../src/assistant/dto/answer.dto.js';
import { type DayItem, freeTimeOf, onDay } from '../src/assistant/free-time/free-time.js';
import { type AnswerPerson } from '../src/assistant/gathering/answer-words.js';
import { type GatheringPerson } from '../src/assistant/gathering/gathering.js';
import { meetAnswer } from '../src/assistant/gathering/meet-answer.js';
import { gatherToMeet, meetingPlaces, meetWindow } from '../src/assistant/gathering/meet-gathering.js';
import { type SeedTravel } from '../src/travel/travel.js';
import { id, place, placeOf, position, readCampus } from './way-example.js';
import { readFrozenTravel } from './frozen-travel.js';

// The design's row 6, boards a5 and a6: "만나고 싶다" with 민수 on Tuesday 2026-11-17, asked at 12:10, on the seed's
// Places and walking table. The places to meet are 학생회관, two libraries, and 302동식당. Call `readMeetWorld` in a
// beforeAll first.

export const DATE = '2026-11-17';

export const at = (clock: string): Date => onDay(DATE, clock);

export const time = (clock: string): string => `${DATE}T${clock}:00+09:00`;

export const NOW = at('12:10');

export const ME = 'c1d2e3f4-0000-4000-8000-000000000001';
export const MINSU = 'c1d2e3f4-0000-4000-8000-000000000002';
export const JIEUN = 'c1d2e3f4-0000-4000-8000-000000000003';
export const HAEUN = 'c1d2e3f4-0000-4000-8000-000000000004';

let travel: SeedTravel | null = null;

export async function readMeetWorld(): Promise<void> {
  await readCampus();
  travel = await readFrozenTravel();
}

export const classAt = (start: string, end: string, placeName: string | null): DayItem => ({
  id: `${placeName ?? 'nowhere'} ${start}`,
  name: 'Class',
  start: at(start),
  end: at(end),
  placeId: placeName === null ? null : id(placeName),
  isClass: true,
});

export const subQuestAt = (start: string, end: string, placeName: string): DayItem => ({
  ...classAt(start, end, placeName),
  name: 'Quest',
  isClass: false,
});

// The User after a Class in 301동, with Classes in 24동 at 13:00 and in 58동 at 17:00.
export const myDay = (): DayItem[] => [
  classAt('11:00', '11:50', '제1공학관'),
  classAt('13:00', '13:50', '자연과학관6'),
  classAt('17:00', '18:15', 'SK경영관'),
];

// 민수, with Classes in 302동 until 12:15 and from 15:30 to 16:45.
export const minsuDay = (): DayItem[] => [
  classAt('11:00', '12:15', '제2공학관'),
  classAt('15:30', '16:45', '제2공학관'),
];

export interface MeetPerson {
  userId: string;
  name: string;
  items: DayItem[];
  // The Place the asker may see them in now: the asker's position, or a Friend's building. Null when unknown.
  in: string | null;
}

export const me = (items = myDay()): MeetPerson => ({ userId: ME, name: '유상', items, in: '제1공학관' });

// At the building level, in 302동.
export const minsu = (): MeetPerson => ({ userId: MINSU, name: '민수', items: minsuDay(), in: '제2공학관' });

export interface Fixed {
  window?: MeetInput['window'];
  placeId?: string | null;
}

export function meetOf(people: [MeetPerson, ...MeetPerson[]], fixed: Fixed = {}, now = NOW): AnswerReply {
  if (travel === null) {
    throw new Error('Read the world first');
  }
  const input: MeetInput = {
    kind: 'meet',
    date: DATE,
    people: people.map(({ userId }) => ({ userId, constraints: [] })),
    window: fixed.window ?? { from: null, until: null },
    placeId: fixed.placeId ?? null,
  };
  const [first, ...rest] = people.map(({ userId, items, in: placeName }): GatheringPerson => ({
    id: userId,
    free: freeTimeOf(items, DATE, now),
    locationPlaceId: placeName === null ? null : id(placeName),
  }));
  if (first === undefined) {
    throw new Error('No asker');
  }
  const places = meetingPlaces(
    {
      studentCenter: place('학생회관'),
      libraries: [place('신양학술정보관'), place('중앙도서관 관정관')],
      restaurants: [{ key: '302동식당', placeId: id('제2공학관') }],
    },
    placeOf,
  );
  const gathering = gatherToMeet([first, ...rest], places, input.placeId, { window: meetWindow(input), now }, travel);
  const answerPeople = people.map(({ userId, name, items, in: placeName }): AnswerPerson => ({
    userId,
    name,
    me: userId === ME,
    items,
    // Only the asker's own position is exact; a Friend at the building level has none.
    position: userId === ME && placeName !== null ? position(placeName) : null,
  }));
  const [asker, ...friends] = answerPeople;
  if (asker === undefined) {
    throw new Error('No asker');
  }
  return meetAnswer({ input, now, people: [asker, ...friends], gathering, placeOf });
}

// Each Plan as "id start–end (minutes)", in Korea time with the offset.
export const summary = ({ plans }: AnswerReply): string[] =>
  plans.map(({ id: key, startAt, endAt, togetherMinutes }) => `${key} ${startAt}–${endAt} (${togetherMinutes})`);
