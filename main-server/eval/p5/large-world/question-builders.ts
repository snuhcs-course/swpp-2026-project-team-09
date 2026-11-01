/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Conditions, type EventCondition, type QuestCondition, type Window } from './answers.ts';
import { type IntendedCall } from './server-stages.ts';

// The questions of the large world (P05 ticket 02b): what each User's message asks, how the rules read it, and the calls
// a model that reads it rightly would make. Their answers are computed from these (eval/p5/large-world/answers.ts).

export type Subset = 'V' | 'L' | 'P' | 'T1' | 'T2' | 'H' | 'S' | 'N' | 'R' | 'O' | 'B' | 'E' | 'C';

export interface Question {
  id: string;
  subset: Subset;
  text: string;
  conditions: Conditions;
  calls: IntendedCall[];
  // A word every card of the answer must hold, for subset L, or a key the answer must hold, to keep a trap in the case.
  literal?: string;
  holds?: string[];
  lacks?: string[];
}

export const DAYS = {
  오늘: '2026-11-02',
  화: '2026-11-03',
  수: '2026-11-04',
  목: '2026-11-05',
  금: '2026-11-06',
  토: '2026-11-07',
  일: '2026-11-08',
} as const;

type Day = (typeof DAYS)[keyof typeof DAYS];

// A window as a question gives it, read as the rules read it and written as a call's inputs (P05 spec, "Search tools").
interface Asked {
  window: Window;
  inputs: Record<string, string>;
}

export const days = (from: string, to: string = from): Asked => ({
  window: { from: `${from}T00:00`, to: `${to}T23:59` },
  inputs: { from, to },
});

export const after = (day: Day, clock: string): Asked => ({
  window: { from: `${day}T${clock}`, to: `${day}T23:59` },
  inputs: { after: `${day}T${clock}` },
});

export const within = (day: Day, from: string, to: string): Asked => ({
  window: { from: `${day}T${from}`, to: `${day}T${to}` },
  inputs: { after: `${day}T${from}`, before: `${day}T${to}` },
});

export const morning = (day: Day): Asked => within(day, '07:00', '10:59');
export const lunch = (day: Day): Asked => within(day, '11:00', '15:59');
export const evening = (day: Day): Asked => within(day, '17:00', '21:59');

// With no day, the next seven days from today (rules.md, section 8).
export const WEEK = days(DAYS.오늘, DAYS.일);

export const SPORTS = [
  'badminton',
  'futsal',
  'basketball',
  'tennis',
  'bowling',
  'running',
  'hiking',
  'tabletennis',
  'squash',
  'climbing',
];
export const SHOWS = ['concert', 'recital', 'musical', 'busking', 'musicfestival'];
export const EXHIBITIONS = ['photo', 'art'];
export const STUDIES = ['coding', 'toeic', 'interview'];

interface QuestAsk extends Omit<QuestCondition, 'window'> {
  words?: string[];
}

interface EventAsk extends Omit<EventCondition, 'window'> {
  words?: string[];
}

function questsCall(asked: Asked, ask: QuestAsk): IntendedCall {
  const { words, capacity, minPlacesLeft, near, forEvent } = ask;
  return {
    tool: 'searchRecruitingQuests',
    input: {
      ...(forEvent === undefined ? asked.inputs : { globalEventId: forEvent }),
      ...(words === undefined ? {} : { words }),
      ...(capacity === undefined ? {} : { capacity }),
      ...(minPlacesLeft === undefined ? {} : { minPlacesLeft }),
      ...(near === undefined ? {} : { placeId: near.place, radius: near.metres }),
    },
  };
}

const eventsCall = (asked: Asked, { words }: EventAsk): IntendedCall => ({
  tool: 'searchGlobalEvents',
  input: { ...asked.inputs, ...(words === undefined ? {} : { words }) },
});

function questConditionOf(asked: Asked, ask: QuestAsk): QuestCondition {
  const { words: _words, ...condition } = ask;
  return { window: asked.window, ...condition };
}

function eventConditionOf(asked: Asked, ask: EventAsk): EventCondition {
  const { words: _words, ...condition } = ask;
  return { window: asked.window, ...condition };
}

type Extra = Pick<Question, 'literal' | 'holds' | 'lacks'>;

export function parties(
  id: string,
  subset: Subset,
  text: string,
  asked: Asked,
  ask: QuestAsk,
  extra: Extra = {},
): Question {
  return {
    id,
    subset,
    text,
    conditions: { quests: questConditionOf(asked, ask) },
    // A question about an event's 파티 takes its Quests and those of its activity within its span.
    calls: [
      questsCall(asked, ask),
      ...(ask.forEvent === undefined ? [] : [questsCall(asked, { ...ask, forEvent: undefined })]),
    ],
    ...extra,
  };
}

export function events(
  id: string,
  subset: Subset,
  text: string,
  asked: Asked,
  ask: EventAsk,
  extra: Extra = {},
): Question {
  return {
    id,
    subset,
    text,
    conditions: { events: eventConditionOf(asked, ask) },
    calls: [eventsCall(asked, ask)],
    ...extra,
  };
}

// A question that says neither 행사 nor 파티 shows both (rules.md, section 5).
export function both(
  id: string,
  subset: Subset,
  text: string,
  asked: Asked,
  { activities, words }: { activities: string[]; words: string[] },
  extra: Extra = {},
): Question {
  return {
    id,
    subset,
    text,
    conditions: {
      quests: questConditionOf(asked, { activities, words }),
      events: eventConditionOf(asked, { activities, words }),
    },
    calls: [questsCall(asked, { activities, words }), eventsCall(asked, { activities, words })],
    ...extra,
  };
}
