/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { v5 as uuidv5 } from 'uuid';
import { koreaDate } from '../assistant/korea-time.js';
import { type QuestBoard, Weekday } from '../generated/prisma/client.js';
import { type Letter } from './uat-accounts.js';

// The ids, the days and the shapes the UAT data is written in (uat-scenarios.ts).

const ID_NAMESPACE = '5b0f6a8e-7c1d-4e7e-9b53-4d3f0c2a9a11';

// The same id in every database and every run.
export function uatId(name: string): string {
  return uuidv5(`uat:${name}`, ID_NAMESPACE);
}

// "[UAT] Event", which `s2-cancel` cancels where the sheet has it cancelled.
export const UAT_EVENT = uatId('global-event:event');
// "[UAT] 공강 신청함", which every tester has asked to join.
export const ASKED_QUEST = uatId('quest:gap-asked');

export const MINUTE = 60 * 1000;
export const DAY = 24 * 60 * MINUTE;
const WEEKDAYS = [
  Weekday.sunday,
  Weekday.monday,
  Weekday.tuesday,
  Weekday.wednesday,
  Weekday.thursday,
  Weekday.friday,
  Weekday.saturday,
];

// The calendar days in Korea around the run, and the times on them.
export interface Days {
  now: Date;
  // The day `offset` days after today, as "2026-11-23".
  day: (offset: number) => string;
  // "19:20" on that day, in Korea.
  at: (offset: number, time: string) => Date;
  weekday: (offset: number) => Weekday;
}

export function daysFrom(now: Date): Days {
  const day = (offset: number): string => koreaDate(new Date(now.getTime() + offset * DAY));
  return {
    now,
    day,
    at: (offset, time) => new Date(`${day(offset)}T${time}:00+09:00`),
    weekday: (offset) => WEEKDAYS[new Date(`${day(offset)}T00:00:00Z`).getUTCDay()] ?? Weekday.monday,
  };
}

// "16:05" in Korea.
export function clock(at: Date): string {
  return new Date(at.getTime() + 9 * 60 * MINUTE).toISOString().slice(11, 16);
}

export interface EventSpec {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  // The campus map's number of the Place.
  place: string;
  state: 'published' | 'draft' | 'cancelled';
}

export interface QuestSpec {
  id: string;
  title: string;
  leader: Letter;
  // Private when left out: a Closed Quest on no Board.
  joinPolicy?: 'open' | 'approval';
  // 취미 when left out.
  board?: QuestBoard;
  capacity: number;
  description: string;
  // A Quest of its own has a start and no end, as one posted in the app has.
  startsAt?: Date;
  // The campus map's number, or words that name no Place.
  place?: string;
  placeLabel?: string;
  // The Global Event the Quest goes to, in place of a time and a Place of its own.
  globalEventId?: string;
  // Holders besides the Leader, and Users whose request to join waits.
  members?: Letter[];
  asked?: Letter[];
}

export interface ClassSpec {
  owner: Letter;
  courseName: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  place: string;
}

export interface Prepared {
  friends: [Letter, Letter][];
  masterSwitchOn: Letter[];
  events: EventSpec[];
  quests: QuestSpec[];
  classes: ClassSpec[];
  // The day that must have lunch menus, as "2026-11-24".
  lunchDay: string;
  // What the host reads or checks before the session, in Korean.
  notes: string[];
}

// The Places the data stands on, by the campus map's number.
export const PLACE_NUMBERS = ['301', '302', '71'];
