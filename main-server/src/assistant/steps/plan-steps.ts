/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../places/dto/place.dto.js';
import {
  type AnswerReply,
  type MealInput,
  type MeetInput,
  type PlacePoint,
  type PersonConstraint,
  type PlanInput,
  type ReplyStep,
  type StudyInput,
} from '../dto/answer.dto.js';
import { type Card, type NotDone, type ToolContext } from '../feature.js';
import { onDay } from '../free-time/free-time.js';
import { windowOf } from '../gathering/plan-conditions.js';
import { placeLabelOf } from '../gathering/place-naming.js';
import { koreaDate, koreaTime } from '../korea-time.js';
import { type LibrarySpace } from '../library/catalogue.js';
import { type LibraryCard } from '../library/library-card.js';
import { reviseAnswer } from '../presented.js';

// The steps of a message that asked for several things (P03): each library book card, each booking a library tool
// refused, and the answer drawn on the map, in time order. A meal planned after another step sets out from that step's
// place when it ends, unless the User named where they start; the server decides it, since the model calls its tools
// in any order, often together.

const MINUTE_MS = 60_000;

export interface StepsServices {
  // The Place of 관정도서관.
  kwanjeong: () => PlaceDto | null;
  // The meal's answer again, from these conditions.
  replanMeal: (input: MealInput, context: ToolContext) => Promise<AnswerReply>;
}

export const pointOf = (place: PlaceDto): PlacePoint => ({
  placeId: place.id,
  label: placeLabelOf(place),
  latitude: place.latitude,
  longitude: place.longitude,
});

const plusMinutes = (at: Date, minutes: number): Date => new Date(at.getTime() + minutes * MINUTE_MS);

const clockOf = (at: Date): string => koreaTime(at).slice(11, 16);

// A book card's step, at 관정도서관.
export function bookingStep(card: LibraryCard, place: PlacePoint | null): ReplyStep | null {
  const { key, action, space, date, start, minutes } = card.library;
  if (action !== 'book' || space === null) {
    return null;
  }
  const startAt = date === null || start === null ? null : onDay(date, start);
  return {
    kind: space.unit,
    title: `${space.floor}층 ${space.name}`,
    place,
    from: null,
    startAt: startAt === null ? null : koreaTime(startAt),
    endAt: startAt === null || minutes === null ? null : koreaTime(plusMinutes(startAt, minutes)),
    status: 'shown',
    reason: null,
    shows: { kind: 'card', key },
  };
}

// What a library tool was asked for and refused, as a step that was not done. Its place is filled with the steps.
export function refusedBookingStep(
  space: Pick<LibrarySpace, 'floor' | 'name' | 'unit'>,
  asked: { date: string; start?: string | undefined; minutes?: number | undefined; end?: string | undefined },
  reasons: readonly string[],
): ReplyStep {
  const start = asked.start === undefined ? null : onDay(asked.date, asked.start);
  const byLength = start === null || asked.minutes === undefined ? null : plusMinutes(start, asked.minutes);
  const end = asked.end === undefined ? byLength : onDay(asked.date, asked.end);
  return {
    kind: space.unit ?? 'seat',
    title: space.floor === null ? space.name : `${space.floor}층 ${space.name}`,
    place: null,
    from: null,
    startAt: start === null ? null : koreaTime(start),
    endAt: end === null ? null : koreaTime(end),
    status: 'not-done',
    reason: reasons.join(' · ') || null,
    shows: null,
  };
}

// Keeps a step that was not done for the reply's steps; closed when its place was closed then.
export function noteNotDone(
  context: Pick<ToolContext, 'presented' | 'capabilities'>,
  step: ReplyStep,
  closed = false,
): void {
  if (!context.capabilities.has('answer')) {
    return;
  }
  context.presented.notDone = [...(context.presented.notDone ?? []), { step, closed }];
}

// What a plan is called when none was found: a meal by its meal, the rest by their kind.
const MEAL_WORDS: Record<MealInput['meal'], string> = { lunch: '점심', dinner: '저녁' };
const KIND_WORDS: Record<Exclude<PlanInput['kind'], 'meal'>, string> = {
  meet: '만남',
  events: '행사',
  quests: '파티',
  'new-quest': '새 파티',
  study: '공부할 곳',
};

// The answer's step: its first Plan, or why it has none. `key`: its request's, for an app that says `answers` (P05
// ticket 74).
export function answerStep(answer: AnswerReply, key?: string): ReplyStep {
  const [plan] = answer.plans;
  const shows = key === undefined ? { kind: 'answer' as const } : { kind: 'answer' as const, key };
  if (plan !== undefined) {
    return {
      kind: answer.input.kind,
      title: plan.title,
      place: plan.place,
      from: plan.parts[0]?.origin?.place ?? null,
      startAt: plan.startAt,
      endAt: plan.endAt,
      status: 'shown',
      reason: null,
      shows,
    };
  }
  const { input } = answer;
  const start = input.kind === 'meal' ? windowOf(input).start : null;
  return {
    kind: input.kind,
    title: input.kind === 'meal' ? MEAL_WORDS[input.meal] : KIND_WORDS[input.kind],
    place: null,
    from: null,
    startAt: start === null ? null : koreaTime(start),
    endAt: null,
    status: 'not-done',
    reason: (answer.noPlan?.lines ?? []).map((line) => line.map(({ text }) => text).join('')).join(' ') || null,
    shows,
  };
}

const startOf = ({ startAt }: ReplyStep): number => (startAt === null ? Number.POSITIVE_INFINITY : Date.parse(startAt));

// In time order, a step without a time last; steps at the same time stay as they came.
export const inTimeOrder = (steps: readonly ReplyStep[]): ReplyStep[] =>
  steps.toSorted((a, b) => startOf(a) - startOf(b));

// The step a meal follows: of the steps at a place on the meal's day that start no later than the meal may, the latest.
// A step that starts as the meal's window opens comes first, since the meal cannot come before it.
export function stepBefore(steps: readonly ReplyStep[], input: MealInput): ReplyStep | null {
  return stepBeforeAt(steps, input.date, windowOf(input).start);
}

// Of the steps at a place on that day that start no later than `start`, the latest.
export function stepBeforeAt(steps: readonly ReplyStep[], date: string, start: Date): ReplyStep | null {
  const before = steps.filter(
    ({ place, startAt }) =>
      place !== null &&
      startAt !== null &&
      koreaDate(new Date(startAt)) === date &&
      Date.parse(startAt) <= start.getTime(),
  );
  return inTimeOrder(before).at(-1) ?? null;
}

// The conditions of a step that can move with the asker setting out from the step's place, free from when it ends: a
// meal's, a meet's or a study plan's, whose people take the same constraints. Null when the asker already has a start of
// their own: one they named, or one kept from the plan on screen.
//
// `source`: what the new constraints say set them. An app before `answers` is given `asker`, as always, and cannot
// tell them from the User's own. For an app that says `answers` they are `step` (P05 ticket 74): those of an earlier
// chain are dropped and set again from the step before, while a start the User named still holds.
export function chainedInput<Input extends MealInput | MeetInput | StudyInput>(
  input: Input,
  step: ReplyStep,
  source: 'asker' | 'step' = 'asker',
): Input | null {
  const [asker, ...others] = input.people;
  const own = source === 'step' ? withoutChain(asker?.constraints ?? []) : (asker?.constraints ?? []);
  if (asker === undefined || step.place === null || own.some(({ kind }) => kind === 'from')) {
    return null;
  }
  const end = step.endAt ?? step.startAt;
  const ready = end === null ? [] : [{ kind: 'notBefore' as const, time: clockOf(new Date(end)), source }];
  const from = { kind: 'from' as const, placeId: step.place.placeId, source };
  return { ...input, people: [{ ...asker, constraints: [...own, from, ...ready] }, ...others] };
}

// The constraints without those a step before set.
export const withoutChain = (constraints: readonly PersonConstraint[]): PersonConstraint[] =>
  constraints.filter(({ source }) => source !== 'step');

export const isBookCard = (card: Card): card is LibraryCard =>
  card.kind === 'library' && card.library.action === 'book';

// A refused booking's step at 관정도서관, whose place the library tool did not know. One refused because 관정 was closed
// keeps no place, so that no later step sets out from it.
const atKwanjeong = ({ step, closed }: NotDone, place: PlacePoint | null): ReplyStep =>
  !closed && step.place === null && (step.kind === 'seat' || step.kind === 'room') ? { ...step, place } : step;

const dayOf = ({ startAt }: ReplyStep): string | null => (startAt === null ? null : koreaDate(new Date(startAt)));

// Whether a booked step is the one a refusal asked for: the same seat or room, or another of the same unit on the same
// day, which the model booked in its place (P05 ticket 74). A refusal without a day is one of any day.
const doneInstead = (refused: ReplyStep, booked: ReplyStep): boolean =>
  booked.kind === refused.kind &&
  (booked.title === refused.title || dayOf(refused) === null || dayOf(refused) === dayOf(booked));

// The steps the library tools put in the reply so far: its book cards and the bookings refused. A request is one step:
// a refusal the model asked again and got a card for, or a card of the same unit that day, is left out, and of two
// refusals of the same space the last stands.
export function bookingSteps(presented: ToolContext['presented'], place: PlacePoint | null): ReplyStep[] {
  const booked = presented.cards.flatMap((card) => {
    const step = isBookCard(card) ? bookingStep(card, place) : null;
    return step === null ? [] : [step];
  });
  const refused = (presented.notDone ?? []).filter(
    ({ step }, at, all) =>
      !booked.some((done) => doneInstead(step, done)) &&
      !all.slice(at + 1).some((later) => later.step.kind === step.kind && later.step.title === step.title),
  );
  return [...booked, ...refused.map((notDone) => atKwanjeong(notDone, place))];
}

// The meal's conditions set out from the step before it among those shown so far, or as they are.
export function afterEarlierSteps(input: MealInput, steps: readonly ReplyStep[]): MealInput {
  const before = stepBefore(steps, input);
  return (before === null ? null : chainedInput(input, before)) ?? input;
}

// The step a meal follows while the model plans it: of the steps shown so far at a place on its day, the latest that
// starts before the meal's window ends. The model is told to call the tools in time order, so a step shown before the
// meal comes before it, even one that starts inside its window ("5시 반부터 관정 있다가 저녁", P05 ticket 74).
export function stepShownBefore(steps: readonly ReplyStep[], input: MealInput): ReplyStep | null {
  return stepBeforeAt(steps, input.date, new Date(windowOf(input).end.getTime() - MINUTE_MS));
}

// The meal's conditions set out from the step shown before it, or as they are. planMeal calls it, so that the plan the
// model reads and words is the one the app shows.
export function afterStepsShown(input: MealInput, steps: readonly ReplyStep[]): MealInput {
  const before = stepShownBefore(steps, input);
  return (before === null ? null : chainedInput(input, before)) ?? input;
}

// An answer's step without a plan has only the time it asked for, so it comes after the steps that have one, in the
// order they came (P05 ticket 74): a dinner too late for today is not ① before a seat after it.
const planless = ({ shows, place, status }: ReplyStep): boolean =>
  shows?.kind === 'answer' && place === null && status === 'not-done';

export const stepOrder = (steps: readonly ReplyStep[]): ReplyStep[] => [
  ...inTimeOrder(steps.filter((step) => !planless(step))),
  ...steps.filter((step) => planless(step)),
];

// Whether an answer planned again shows another plan than the one the model was given and worded: another first plan,
// another time, or none.
export const planChanged = (worded: AnswerReply, planned: AnswerReply): boolean => {
  const [before] = worded.plans;
  const [after] = planned.plans;
  return before !== undefined && (after?.id !== before.id || after.startAt !== before.startAt);
};

// The reply's words when the server changed a plan the model had worded (P05 ticket 74): one short sentence per step,
// in their order, made from the steps alone, so that the words never contradict the plan drawn.
export function stepsSentence(steps: readonly ReplyStep[]): string {
  return steps
    .map(({ title, startAt, status, reason }) =>
      status === 'not-done'
        ? `${title}: ${reason ?? '하지 못했어요'}`
        : `${startAt === null ? '' : `${clockOf(new Date(startAt))} `}${title}`,
    )
    .map((line) => (/[.!?]$/u.test(line) ? line : `${line}.`))
    .join(' ');
}

// Puts the steps of the run in what it presented, when there are two or more. A meal the model planned before the
// step it follows, or together with it, is planned again from that step.
export async function presentSteps(context: ToolContext, services: StepsServices): Promise<void> {
  const { presented } = context;
  const pending = presented.cards.some((card) => isBookCard(card)) || (presented.notDone ?? []).length > 0;
  if (!pending) {
    return;
  }
  const kwanjeong = services.kwanjeong();
  const others = bookingSteps(presented, kwanjeong === null ? null : pointOf(kwanjeong));
  delete presented.notDone;
  if (others.length < 2 && presented.answer === null) {
    return;
  }
  const retold = await mealAfterBookings(context, others, services);
  const all = presented.answer === null ? others : [...others, answerStep(presented.answer)];
  presented.steps = stepOrder(all);
  if (retold) {
    presented.retold = stepsSentence(presented.steps);
  }
}

// A meal the model planned before the booking it follows, or together with it, planned again from that booking, and
// whether the plan is then another than the one the model worded. A replan that fails keeps the meal as the model
// planned it, so the rest of the reply still reaches the User. The plan set out from the booking stands; when the model
// worded another, the steps say it instead (P05 ticket 74).
async function mealAfterBookings(
  context: ToolContext,
  bookings: readonly ReplyStep[],
  services: StepsServices,
): Promise<boolean> {
  const { answer } = context.presented;
  if (answer?.input.kind !== 'meal') {
    return false;
  }
  const chained = afterEarlierSteps(answer.input, bookings);
  if (chained === answer.input) {
    return false;
  }
  const replanned = await services.replanMeal(chained, context).catch(() => answer);
  reviseAnswer(context.presented, () => replanned);
  return planChanged(answer, replanned);
}

// The rules of a message that asks for several things, a fragment of the chat's system prompt for an app that draws
// answers. They take the place of any rule that a reply is one sentence about one answer.
export const STEPS_RULES = `One message may ask for several things in a day, such as "16시에 관정 갔다가 19시쯤 저녁 먹으려고 하는데 7층 예약하고 스케줄 짜줘": a 관정 seat, then dinner.

- Do every one of them in this message, each with its own tools as if it were asked alone. Never do only the last one, and never ask which one comes first: the app shows them as one plan in time order.
- Do them in time order, and call the tool of a later one only after the tools of the one before it have answered: the server then plans the later one from the place and the end of the one before it. Do not work that out yourself. Give planMeal startPlaceId only when the User names where they set out from for the meal ("220동에서 출발해서").
- A seat or room booked before a later one ends at that one's time ("16시에 관정 갔다가 19시 저녁" is 16:00–19:00), unless the User gave its end or its length.
- When a tool refuses one of them or finds none, still do the others, and say which one could not be done and why.
- Your reply says each of them in one short sentence, in time order, and nothing more.`;
