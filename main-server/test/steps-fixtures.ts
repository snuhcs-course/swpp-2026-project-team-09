/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerReply,
  type EventsInput,
  type MealInput,
  NO_CONTEXT,
  type PersonConstraint,
  type QuestsInput,
  type ReplyStep,
  type RequestContext,
  type StudyInput,
} from '../src/assistant/dto/answer.dto.js';
import { type ClientCapability, type Presented, type ToolContext } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { type AllStepsServices } from '../src/assistant/steps/all-steps.js';

// The conditions, steps and run of the steps' unit tests (P05 ticket 74), on a made-up Tuesday.

export const DATE = '2087-01-07';
export const ASKER = 'asker';
export const FRIEND = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
export const KWANJEONG = { placeId: 'kwanjeong', label: '62-1동', latitude: 37.4596, longitude: 126.9497 };
export const HALL = { placeId: 'hall', label: '문화관', latitude: 37.4601, longitude: 126.9512 };

export const at = (clock: string): string => `${DATE}T${clock}:00+09:00`;

export const study = (people: string[], constraints: PersonConstraint[] = []): StudyInput => ({
  kind: 'study',
  date: DATE,
  what: 'any',
  people: people.map((userId, index) => ({ userId, constraints: index === 0 ? constraints : [] })),
  together: false,
  window: { from: null, until: null },
  minutes: null,
  chosen: { seatSpaceId: null, roomSpaceId: null },
  area: null,
});

export const meal = (which: MealInput['meal'], constraints: PersonConstraint[] = []): MealInput => ({
  kind: 'meal',
  date: DATE,
  meal: which,
  people: [{ userId: ASKER, constraints }],
  window: { from: null, until: null },
  placeId: null,
});

export const events: EventsInput = { kind: 'events', date: DATE, eventIds: null };
export const quests: QuestsInput = { kind: 'quests', globalEventId: null, questIds: [FRIEND] };

export const stepOf = (more: Partial<ReplyStep>): ReplyStep => ({
  kind: 'seat',
  title: '7층 7A 열람실 2 구역',
  place: KWANJEONG,
  from: null,
  startAt: at('11:00'),
  endAt: at('13:00'),
  status: 'shown',
  reason: null,
  shows: { kind: 'card', key: 'book:7F-7A-zone2:2087-01-07:1100:120' },
  ...more,
});

export const answerStepAt = (key: string, start: string, end: string, more: Partial<ReplyStep> = {}): ReplyStep =>
  stepOf({
    kind: 'events',
    title: key,
    place: HALL,
    startAt: at(start),
    endAt: at(end),
    shows: { kind: 'answer', key },
    ...more,
  });

export const answerOf = (input: AnswerReply['input']): AnswerReply => ({
  input,
  chips: [],
  plans: [],
  dropped: [],
  noPlan: null,
});

export const presented = (more: Partial<Presented> = {}): Presented => ({
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: null,
  ...more,
});

export const contextWith = (asked: Partial<RequestContext>, more: Partial<Presented> = {}): ToolContext => ({
  userId: ASKER,
  now: new Date(at('09:00')),
  context: { ...NO_CONTEXT, ...asked },
  capabilities: new Set<ClientCapability>(['answer', 'answers']),
  found: new FoundIds(),
  shown: null,
  presented: presented(more),
  judged: new Map(),
  restaurants: new Map(),
});

export const services = (replan: AllStepsServices['replan']): AllStepsServices => ({
  kwanjeong: () => null,
  replan,
  itemsOn: () => Promise.resolve([]),
});
