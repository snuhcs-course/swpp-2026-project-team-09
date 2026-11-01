/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type z } from 'zod';
import { Dice } from './dice.ts';
import { contextPosts } from './context-posts.ts';
import { traps } from './traps.ts';
import { type hoursSchema, type PlacePositions, type Wordings } from './wordings.ts';
import {
  type LargeGlobalEvent,
  type LargeQuest,
  type LargeWorldData,
  largeWorldSchema,
  type QuestPlace,
} from './world-data.ts';

// The generator of a large world (P05 ticket 02b): about 1,000 Quests and a few hundred Global Events made from
// attributes with a fixed random seed, with titles from the checked wordings and the hand-made traps on top. It runs
// only to make a new version (eval/p5/large-world/generate-cli.ts); a run reads the data file and never comes here.

// The clock of the world, as the small P05 world's, and the same asker.
export const WORLD_NOW = '2026-11-02T14:05';
const ASKER = { name: '한서윤', department: '컴퓨터공학부' };

const QUEST_COUNT = 1000;
const EVENT_COUNT = 300;

const HOURS: Record<z.infer<typeof hoursSchema>, readonly [number, number]> = {
  day: [9, 20],
  evening: [17, 23],
  morning: [6, 10],
  late: [21, 23],
  any: [7, 23],
};

const pad = (value: number): string => String(value).padStart(2, '0');

// The day `offset` days after 2026-11-02, in Korea.
function dayAfter(offset: number): string {
  const day = new Date(Date.UTC(2026, 10, 2 + offset));
  return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
}

// A time in Korea, `minutes` after another, on the same clock: Korea has no change of clocks.
function later(time: string, minutes: number): string {
  const moved = new Date(Date.parse(`${time}Z`) + minutes * 60_000);
  return moved.toISOString().slice(0, 16);
}

// The ends of the parts of the day. Nothing is placed exactly there, since the rules do not say which side it is on
// (rules.md, section 8); traps.ts places what is on the edges they do settle.
const UNSETTLED_EDGES = new Set(['11:00', '16:00', '22:00']);

function clockOffEdges(hour: number, minute: number): string {
  const clock = `${pad(hour)}:${pad(minute)}`;
  return UNSETTLED_EDGES.has(clock) ? `${pad(hour)}:10` : clock;
}

// The day a generated Quest starts, as an offset from 11-02: mostly the week of the cases, with some before the clock
// and some after the week.
function dayOfQuest(dice: Dice): number | 'today-before' | 'today-after' {
  return dice.weighted<number | 'today-before' | 'today-after'>([
    ['today-before', 4],
    [-1, 2],
    ['today-after', 7],
    [1, 12],
    [2, 16],
    [3, 12],
    [4, 12],
    [5, 12],
    [6, 10],
    [dice.between(7, 13), 13],
  ]);
}

function startOfQuest(dice: Dice, hours: z.infer<typeof hoursSchema>): string {
  const [low, high] = HOURS[hours];
  const day = dayOfQuest(dice);
  const minute = dice.pick([0, 10, 20, 30, 40, 50]);
  if (day === 'today-before') {
    return `${dayAfter(0)}T${clockOffEdges(dice.between(7, 13), minute)}`;
  }
  if (day === 'today-after') {
    return `${dayAfter(0)}T${clockOffEdges(dice.between(Math.max(low, 15), Math.max(high, 15)), minute)}`;
  }
  return `${dayAfter(day)}T${clockOffEdges(dice.between(low, high), minute)}`;
}

function placeOfQuest(dice: Dice, { places, points, placeWords }: Wordings): QuestPlace | null {
  const kind = dice.weighted([
    ['place', 40],
    ['point', 10],
    ['words', 30],
    ['none', 20],
  ] as const);
  if (kind === 'place') {
    return { seed: dice.pick(Object.keys(places)) };
  }
  if (kind === 'point') {
    return dice.pick(points);
  }
  return kind === 'words' ? { label: dice.pick(placeWords) } : null;
}

// A title of the activity, one in ten misspelt.
function titleFrom(dice: Dice, { titles, typos }: { titles: readonly string[]; typos: readonly string[] }): string {
  return dice.pick(dice.chance(0.1) && typos.length > 0 ? typos : titles);
}

function eventFrom(
  dice: Dice,
  key: string,
  activity: string,
  wordings: Wordings,
  positions: PlacePositions,
): LargeGlobalEvent | null {
  const written = wordings.activities[activity]?.event;
  if (written === undefined) {
    return null;
  }
  const offset = dice.weighted<number>([
    [dice.between(-12, -1), 10],
    [dice.between(0, 6), 55],
    [dice.between(7, 20), 35],
  ]);
  const hour = dice.between(10, 19);
  const clock = hour === 11 || hour === 16 ? `${pad(hour)}:30` : `${pad(hour)}:${dice.pick(['00', '30'])}`;
  const starts = `${dayAfter(offset)}T${clock}`;
  // An end on the hour or half past would touch a window's start, which the rules do not settle: 20 minutes past each.
  const hours = dice.between(1, 3);
  const days = written.days === undefined ? null : dice.between(written.days[0], written.days[1]);
  const place = dice.pick(Object.keys(wordings.places));
  const position = positions[place];
  if (position === undefined) {
    throw new Error(`No position for ${place}`);
  }
  let ends: string | null = later(starts, hours * 60 + 20);
  if (days !== null) {
    ends = `${dayAfter(offset + days - 1)}T18:20`;
  } else if (dice.chance(0.05)) {
    ends = null;
  }
  return {
    key,
    title: titleFrom(dice, written).replace('{host}', dice.pick(wordings.hosts)),
    description: dice.pick(written.descriptions),
    activity,
    starts,
    ends,
    place: `${place} ${dice.between(1, 4)}층`,
    latitude: Number((position.latitude + dice.between(-5, 5) / 100_000).toFixed(5)),
    longitude: Number((position.longitude + dice.between(-5, 5) / 100_000).toFixed(5)),
  };
}

function generatedEvents(dice: Dice, wordings: Wordings, positions: PlacePositions): LargeGlobalEvent[] {
  const kinds = Object.entries(wordings.activities).flatMap(([activity, { event }]) =>
    // What runs for days is in every window it overlaps, so there are fewer of them.
    event === undefined ? [] : [[activity, event.days === undefined ? 1 : 0.5] as const],
  );
  return Array.from({ length: EVENT_COUNT }, (_, index) => {
    const event = eventFrom(dice, `e${String(index + 1).padStart(4, '0')}`, dice.weighted(kinds), wordings, positions);
    if (event === null) {
      throw new Error('An activity of the list has no event');
    }
    return event;
  }).filter(({ activity, starts }) => !(activity === 'lecture' && starts.startsWith(RESERVED_LECTURE_DAY)));
}

// The day of the 대면 and 비대면 trap: its only 특강 are the trap's, each saying which it is.
export const RESERVED_LECTURE_DAY = dayAfter(4);

interface QuestDraft {
  key: string;
  description: string;
  capacity: number;
  holders: number;
  joinPolicy: 'open' | 'approval' | 'closed';
  asked: boolean;
}

const CAPACITIES = [2, 3, 4, 4, 4, 5, 6, 6, 8];

function holdersOf(dice: Dice, capacity: number): number {
  return dice.chance(0.1) ? capacity : dice.between(1, Math.max(capacity - 1, 1));
}

const startOfEvent = (event: LargeGlobalEvent): number => Date.parse(`${event.starts}Z`);

const NOW_MOMENT = Date.parse(`${WORLD_NOW}Z`);

// What a Quest holds whatever it is for.
function commonOf(dice: Dice, key: string, wordings: Wordings): QuestDraft {
  const capacity = dice.pick(CAPACITIES);
  const holders = holdersOf(dice, capacity);
  const joinPolicy = dice.weighted([
    ['open', 70],
    ['approval', 28],
    ['closed', 2],
  ] as const);
  return {
    key,
    description: dice.pick(wordings.questDescriptions),
    capacity,
    holders,
    joinPolicy,
    asked: joinPolicy === 'approval' && holders < capacity && dice.chance(0.05),
  };
}

function questForEvent(
  dice: Dice,
  { asked, joinPolicy, ...common }: QuestDraft,
  event: LargeGlobalEvent,
  written: Wordings['activities'][string],
): LargeQuest {
  return {
    ...common,
    ...(joinPolicy === 'closed' ? { joinPolicy, board: null } : { joinPolicy, board: written.board }),
    title: titleFrom(dice, written.quest),
    activity: event.activity,
    started: startOfEvent(event) < NOW_MOMENT,
    asker: asked ? 'asked' : 'none',
    globalEvent: event.key,
  };
}

function questAlone(dice: Dice, { asked, joinPolicy, ...common }: QuestDraft, wordings: Wordings): LargeQuest {
  const holds = !asked && dice.chance(0.015);
  const activity = dice.weighted(
    Object.entries(wordings.activities).map(([name, { weight }]) => [name, weight] as const),
  );
  const written = wordings.activities[activity];
  if (written === undefined) {
    throw new Error(`No activity ${activity}`);
  }
  const starts = startOfQuest(dice, written.hours);
  const place = placeOfQuest(dice, wordings);
  // One in thirty is posted on another Board than the obvious one.
  const board = dice.chance(1 / 30) ? dice.pick(['meal', 'career', 'hobby', 'show'] as const) : written.board;
  return {
    ...common,
    ...(joinPolicy === 'closed' ? { joinPolicy, board: null } : { joinPolicy, board }),
    title: titleFrom(dice, written.quest),
    activity,
    started: Date.parse(`${starts}Z`) < NOW_MOMENT,
    asker: asked ? 'asked' : holds ? 'holds' : 'none',
    starts,
    ends: later(starts, 120),
    place,
  };
}

// Most Quests stand alone; about one in eight goes to a Global Event, whose time and place it takes. `taken` counts each
// event's Holders, since a User holds one Quest for an event and the world has so many people.
function questFrom(
  dice: Dice,
  key: string,
  wordings: Wordings,
  events: readonly LargeGlobalEvent[],
  taken: Map<string, number>,
): LargeQuest {
  const draft = commonOf(dice, key, wordings);
  const event = dice.chance(0.12) ? dice.pick(events) : null;
  const written = event === null ? undefined : wordings.activities[event.activity];
  const taking = (taken.get(event?.key ?? '') ?? 0) + draft.holders;
  if (event === null || written === undefined || taking > wordings.people.length) {
    return questAlone(dice, draft, wordings);
  }
  taken.set(event.key, taking);
  return questForEvent(dice, draft, event, written);
}

// A world, the same one each time for the same seed, wordings and positions.
export function generateWorld(
  version: string,
  randomSeed: number,
  wordings: Wordings,
  positions: PlacePositions,
): LargeWorldData {
  const dice = new Dice(randomSeed);
  const generated = generatedEvents(dice, wordings, positions);
  const { globalEvents: trapEvents, quests: handQuests } = traps();
  const trapQuests = [...handQuests, ...contextPosts()];
  const taken = new Map<string, number>();
  const count = QUEST_COUNT - trapQuests.length;
  const quests = Array.from({ length: count }, (_, index) =>
    questFrom(dice, `q${String(index + 1).padStart(4, '0')}`, wordings, generated, taken),
  );
  return largeWorldSchema.parse({
    version,
    randomSeed,
    now: WORLD_NOW,
    asker: ASKER,
    people: wordings.people,
    places: positions,
    globalEvents: [...generated, ...trapEvents],
    quests: [...quests, ...trapQuests],
  });
}
