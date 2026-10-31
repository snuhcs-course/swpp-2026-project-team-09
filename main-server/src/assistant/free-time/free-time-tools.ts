/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { QuestBoard } from '../../generated/prisma/client.js';
import { defineTool, noneFound, type NoneFound, type Tool } from '../feature.js';
import { koreaDate, koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { type AskedInterval, type CandidateServices, fittingCandidates } from './candidates.js';
import {
  byStart,
  clockOf,
  type DayItem,
  endOfDay,
  freeTimeOf,
  type FreeInterval,
  onDay,
  startOfDay,
} from './free-time.js';
import { cardKey, type JudgedCandidate } from './travel-boxes.js';
import { UserDayService } from './user-day.service.js';

// The 공강 tools, apart from the chat's own (ADR 0009): the server computes Free Time, fit and Travel Time and decides
// which candidates appear, and the model passes the User's words or ids it was given. Rooms, Places, coordinates and
// the reason anyone is busy stay here.

export interface FreeTimeServices extends CandidateServices {
  days: UserDayService;
}

const DAYS_AHEAD = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const CLOCK_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/u;

const clockTime = z.string().regex(CLOCK_TIME, 'Expected HH:MM');

const dateInput = z.iso.date().describe('The day, a calendar day in Korea as YYYY-MM-DD.');

function outOfReach(date: string, now: Date): boolean {
  return date < koreaDate(now) || date > koreaDate(new Date(now.getTime() + DAYS_AHEAD * DAY_MS));
}

function noDay(date: string): NoneFound {
  return noneFound(`${date} is not between today and a week from today.`);
}

function itemName({ name }: DayItem): string {
  return othersText('item.name', name);
}

function getMyDay(days: UserDayService): Tool {
  return defineTool({
    description:
      "Answers the User's items of a day from today to a week ahead, their Classes and the timed Sub Quests of the Quests they hold: each with its id, name, start and end in Korean time. Give the ids to findFreeTimeEvents. Use it to find the Classes the User named, or to learn that they have none that day.",
    input: z.object({ date: dateInput }),
    run: async ({ date }, { userId, now }) => {
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      const items = await days.itemsOn(userId, date);
      return {
        result: 'found',
        items: items
          .toSorted(byStart)
          .map((item) => ({ id: item.id, name: itemName(item), start: clockOf(item.start), end: clockOf(item.end) })),
      };
    },
  });
}

const edge = z
  .union([z.uuid(), clockTime, z.enum(['now', 'end'])])
  .describe('An item id getMyDay returned, a clock time as HH:MM, now, or end for the end of the day.');

const input = z.object({
  date: dateInput,
  from: edge,
  to: edge,
  board: z
    .enum(QuestBoard)
    .optional()
    .describe(
      'Only the 파티 of one Board: meal (식사), career (커리어), hobby (취미) or show (공연·전시). Global Events have no Board and stay.',
    ),
  departurePlace: z
    .uuid()
    .optional()
    .describe(
      'Where the User leaves from, as resolvePlace returned it in this message, after this tool asked by needs.',
    ),
  leaveBy: clockTime.optional().describe('By when the User must leave, as HH:MM, after this tool asked by needs.'),
});

type Conditions = z.output<typeof input>;

// Where a stretch of the day asked for starts or ends, or null for an id that is no item of that day.
function timeOf(
  bound: string,
  { date, items, now }: { date: string; items: readonly DayItem[]; now: Date },
  ofItem: (item: DayItem) => Date,
): Date | null {
  if (bound === 'now') {
    return now > startOfDay(date) ? now : startOfDay(date);
  }
  if (bound === 'end') {
    return endOfDay(date);
  }
  if (CLOCK_TIME.test(bound)) {
    return onDay(date, bound);
  }
  const item = items.find(({ id }) => id === bound);
  return item === undefined ? null : ofItem(item);
}

function askedParts(free: readonly FreeInterval[], from: Date, to: Date): AskedInterval[] {
  return free.flatMap((interval) => {
    const askedStart = interval.start > from ? interval.start : from;
    const askedEnd = interval.end < to ? interval.end : to;
    return askedStart < askedEnd ? [{ ...interval, askedStart, askedEnd }] : [];
  });
}

// What the tool needs to know before it can judge, the earliest gap's first and the before side first.
function neededOf(parts: readonly AskedInterval[], { departurePlace, leaveBy }: Conditions): object | null {
  for (const { previous, next } of parts) {
    if (previous !== null && previous.placeId === null && departurePlace === undefined) {
      return { result: 'needs', needs: { side: 'before', item: itemName(previous) } };
    }
    if (next !== null && next.placeId === null && leaveBy === undefined) {
      return { result: 'needs', needs: { side: 'after', item: itemName(next) } };
    }
  }
  return null;
}

function candidateAnswer({ kind, id, title, start, end, box }: JudgedCandidate): object {
  const { travel = null, ...after } = box;
  return {
    kind,
    id,
    title: othersText(`${kind}.title`, title),
    start: koreaTime(start),
    end: end === null ? null : koreaTime(end),
    travel,
    ...after,
  };
}

function gapAnswer({ askedStart, askedEnd, previous, next }: AskedInterval, date: string): object {
  return {
    start: clockOf(askedStart),
    end: askedEnd >= endOfDay(date) ? '24:00' : clockOf(askedEnd),
    before: previous === null ? null : itemName(previous),
    after: next === null ? null : itemName(next),
  };
}

function findFreeTimeEvents({ days, ...services }: FreeTimeServices): Tool {
  return defineTool({
    description:
      "Finds the gap or gaps of the User's day between from and to, and every recruiting 파티 and published Global Event the User can reach in them and still leave in time, soonest first. Answers result 'found' with the gaps (start, end, and the names of the items before and after) and the candidates with their total; or result 'needs' with the side (before or after) and the item without a Place, for which ask the User and call again with departurePlace or leaveBy; or result 'none' with the reason. Show the candidates with showQuests and showGlobalEvents. Their cards show the way there and when to leave.",
    input,
    run: async (conditions, { userId, now, found, judged }) => {
      const { date, from, to, board, departurePlace, leaveBy } = conditions;
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      if (departurePlace !== undefined) {
        found.refuseUnfound('place', [departurePlace]);
      }
      const items = await days.itemsOn(userId, date);
      const start = timeOf(from, { date, items, now }, (item) => item.end);
      const end = timeOf(to, { date, items, now }, (item) => item.start);
      if (start === null || end === null) {
        return noneFound('No item of that day has this id. Call getMyDay for the ids of that day.');
      }
      const parts = askedParts(freeTimeOf(items, date, now), start, end);
      const needed = neededOf(parts, conditions);
      if (needed !== null) {
        return needed;
      }
      const clockEnd = CLOCK_TIME.test(to) ? to : null;
      const search = { date, clockEnd, board, departurePlace, leaveBy };
      const candidates = await fittingCandidates(services, { userId, now }, parts, search);
      for (const candidate of candidates) {
        found.add(candidate.kind, [candidate.id]);
        judged.set(cardKey(candidate.kind, candidate.id), candidate);
      }
      return {
        result: 'found',
        gaps: parts.map((part) => gapAnswer(part, date)),
        total: candidates.length,
        candidates: candidates.map((candidate) => candidateAnswer(candidate)),
      };
    },
  });
}

export function freeTimeTools(services: FreeTimeServices): { getMyDay: Tool; findFreeTimeEvents: Tool } {
  return { getMyDay: getMyDay(services.days), findFreeTimeEvents: findFreeTimeEvents(services) };
}
