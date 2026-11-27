/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../places/dto/place.dto.js';
import {
  type AnswerReply,
  type MealInput,
  type MeetInput,
  type PlanInput,
  type ReplyStep,
  type StudyInput,
} from '../dto/answer.dto.js';
import { type Presented, type ToolContext } from '../feature.js';
import { type DayItem, onDay } from '../free-time/free-time.js';
import { idsOn, leftOutNow } from '../free-time/left-out-classes.js';
import { windowOf } from '../gathering/plan-conditions.js';
import { koreaDate, koreaTime } from '../korea-time.js';
import { requestKey, settleAnswer } from '../presented.js';
import {
  answerStep,
  bookingSteps,
  chainedInput,
  isBookCard,
  planChanged,
  pointOf,
  stepOrder,
  stepsSentence,
  withoutChain,
} from './plan-steps.js';

// The steps of a conversation for an app that says `answers` (P05 ticket 74): the steps on screen as the app sends them
// back (`context.steps`, with each answer's conditions in `context.answers`), this message's answers and bookings in the
// place of those of the same request and the new ones after them, in time order, whenever there are two or more. Each
// answer's step names its answer by its request's key.
//
// A step that can move (a meal, a meet, a study place) sets out from the step before it, not before that step ends:
// constraints whose source is `step`, which the server sets again whenever that step changes, while a start the User
// named holds. A step on screen follows the step before it there; a new one, the latest step that starts no later than
// it. Every step whose conditions change is planned again, through the planner of POST /assistant/answers, and the
// reply gives its answer again. A step at a fixed time (the events of a day, Quests, a new 파티) never moves: one that
// starts before a step before it ends stays a step, not done, and says why.

export type Movable = MealInput | MeetInput | StudyInput;

export const isMovable = (input: PlanInput): input is Movable =>
  input.kind === 'meal' || input.kind === 'meet' || input.kind === 'study';

export interface AllStepsServices {
  // The Place of 관정도서관.
  kwanjeong: () => PlaceDto | null;
  // The answer again, from these conditions, as POST /assistant/answers plans it.
  replan: (input: Movable, context: ToolContext) => Promise<AnswerReply>;
  // The asker's Classes and Quests of a day.
  itemsOn: (userId: string, date: string) => Promise<DayItem[]>;
}

type Asking = Pick<ToolContext, 'userId' | 'context' | 'presented'>;

const MINUTE_MS = 60_000;

const clockOf = (at: number): string => koreaTime(new Date(at)).slice(11, 16);

const keyOf = ({ shows }: ReplyStep): string | null => (shows?.kind === 'answer' ? (shows.key ?? null) : null);

const isBooking = ({ kind }: ReplyStep): boolean => kind === 'seat' || kind === 'room';

const dayOf = ({ startAt }: ReplyStep): string | null => (startAt === null ? null : koreaDate(new Date(startAt)));

const startOf = ({ startAt }: ReplyStep): number => (startAt === null ? Number.NaN : Date.parse(startAt));

// The earliest a step that can move may start: a meal's window, the time asked from, else when its plan starts.
export function askedStart(input: Movable, startAt: string | null = null): Date | null {
  if (input.kind === 'meal') {
    return windowOf(input).start;
  }
  if (input.window.from !== null) {
    return onDay(input.date, input.window.from);
  }
  return startAt === null ? null : new Date(startAt);
}

// One step of the conversation as the server settles it.
interface Slot {
  step: ReplyStep;
  // The request of an answer's step.
  key: string | null;
  // The conditions of a step that can move, when they are known.
  input: Movable | null;
  // The answer this message drew for it.
  answer: AnswerReply | null;
  // Whether it stands where a step on screen stood, after the steps before it there.
  onScreen: boolean;
  // Whether this message drew or booked it.
  fresh: boolean;
}

// The steps of the bookings so far, 관정도서관's Place looked up only when there is one.
function bookingsOf(presented: Presented, kwanjeong: () => PlaceDto | null): ReplyStep[] {
  if (!presented.cards.some((card) => isBookCard(card)) && (presented.notDone ?? []).length === 0) {
    return [];
  }
  const place = kwanjeong();
  return bookingSteps(presented, place === null ? null : pointOf(place));
}

// The slots with one of this message in the place of the slot on screen it replaces, or after them.
function placed(slots: readonly Slot[], slot: Slot, replaces: (other: Slot) => boolean): Slot[] {
  const at = slots.findIndex((other) => other.onScreen && !other.fresh && replaces(other));
  return at === -1 ? [...slots, slot] : slots.with(at, { ...slot, onScreen: true });
}

// The conversation's steps: those on screen the message did not withdraw, then this message's bookings in the place of
// one of the same unit that day, and its answers in the place of one of the same request.
function slotsOf({ context, presented }: Asking, kwanjeong: () => PlaceDto | null): Slot[] {
  const inputs = new Map((context.answers ?? []).map((input) => [requestKey(input), input]));
  const withdrawn = new Set(presented.withdrawn ?? []);
  const screen = (context.steps ?? []).flatMap((step): Slot[] => {
    const key = keyOf(step);
    const input = key === null ? undefined : inputs.get(key);
    const movable = input !== undefined && isMovable(input) ? input : null;
    return key !== null && withdrawn.has(key)
      ? []
      : [{ step, key, input: movable, answer: null, onScreen: true, fresh: false }];
  });
  const booked = bookingsOf(presented, kwanjeong).reduce(
    (slots, step) =>
      placed(
        slots,
        { step, key: null, input: null, answer: null, onScreen: false, fresh: true },
        (other) => isBooking(other.step) && other.step.kind === step.kind && dayOf(other.step) === dayOf(step),
      ),
    screen,
  );
  return (presented.answers ?? []).reduce((slots, answer) => {
    const key = requestKey(answer.input);
    const input = isMovable(answer.input) ? answer.input : null;
    const slot = { step: answerStep(answer, key), key, input, answer, onScreen: false, fresh: true };
    return placed(slots, slot, (other) => other.key === key);
  }, booked);
}

const usableOn =
  (date: string) =>
  ({ step }: Slot): boolean =>
    step.place !== null && step.startAt !== null && dayOf(step) === date;

const latestOf = (slots: readonly Slot[]): ReplyStep | null =>
  slots.toSorted((a, b) => startOf(a.step) - startOf(b.step)).at(-1)?.step ?? null;

// The step a slot follows: for one on screen, the step before it there with a place on its day; for a new one, the
// latest other step with a place on its day that starts no later than it does.
function stepBeforeSlot(slots: readonly Slot[], at: number): ReplyStep | null {
  const slot = slots[at];
  if (slot?.input === null || slot === undefined) {
    return null;
  }
  const usable = usableOn(slot.input.date);
  if (slot.onScreen) {
    return slots.slice(0, at).findLast((other) => usable(other))?.step ?? null;
  }
  const start = slot.step.startAt === null ? askedStart(slot.input)?.getTime() : startOf(slot.step);
  return latestOf(
    slots.filter(
      (other, index) => index !== at && usable(other) && start !== undefined && startOf(other.step) <= start,
    ),
  );
}

const withConstraints = <Input extends Movable>(
  input: Input,
  change: (asker: Input['people'][number]) => Input['people'][number],
): Input => {
  const [asker, ...others] = input.people;
  return asker === undefined ? input : { ...input, people: [change(asker), ...others] };
};

const unchained = <Input extends Movable>(input: Input): Input =>
  withConstraints(input, (asker) => ({ ...asker, constraints: withoutChain(asker.constraints) }));

// The asker's constraints in any order: one the User added after a chain changes nothing about where they set out.
const constraintsOf = (input: Movable): string =>
  (input.people[0]?.constraints ?? [])
    .map((one) => JSON.stringify(one))
    .toSorted((a, b) => a.localeCompare(b))
    .join();

const sameConstraints = (a: Movable, b: Movable): boolean => constraintsOf(a) === constraintsOf(b);

// The conditions set out from the step before. Without one they stay as they are, unless the steps on screen are known,
// when a chain of an earlier step is dropped with it; so is a chain over a start the User named. When an item of the
// asker's day lies between the step before's end and their start, they set out from no step: the planner sets the asker
// out from that item itself. A Class left out is no such item.
export async function startAfter<Input extends Movable>(
  input: Input,
  before: ReplyStep | null,
  asking: Asking,
  services: Pick<AllStepsServices, 'itemsOn'>,
): Promise<Input> {
  const end = before?.endAt ?? before?.startAt ?? null;
  const chained = before === null ? null : chainedInput(input, before, 'step');
  if (before === null && asking.context.steps === undefined) {
    return input;
  }
  if (chained === null || end === null) {
    return unchained(input);
  }
  const left = new Set(idsOn(leftOutNow(asking), input.date));
  const items = await services.itemsOn(asking.userId, input.date);
  const from = Date.parse(end);
  const until = askedStart(input)?.getTime() ?? Number.POSITIVE_INFINITY;
  const between = items.some((item) => !left.has(item.id) && item.end.getTime() > from && item.start.getTime() < until);
  return between ? unchained(input) : chained;
}

// The meal's conditions set out from the step before it while the model plans it, so that the plan the model reads and
// words is the one the app shows: a meal on screen follows the step before it there; a new one, the latest step on
// screen that starts no later than its window, or the latest this message showed before it, in the order the model
// is told to call the tools, that starts before its window ends ("5시 반부터 관정 있다가 저녁").
export function mealAfterSteps(
  input: MealInput,
  asking: Asking,
  kwanjeong: () => PlaceDto | null,
  services: Pick<AllStepsServices, 'itemsOn'>,
): Promise<MealInput> {
  const key = requestKey(input);
  const slots = slotsOf(asking, kwanjeong);
  const own = slots.findIndex((slot) => slot.key === key && slot.onScreen);
  const slot = slots[own];
  if (slot !== undefined) {
    return startAfter(input, stepBeforeSlot(slots.with(own, { ...slot, input }), own), asking, services);
  }
  const usable = usableOn(input.date);
  const { start, end } = windowOf(input);
  const before = latestOf(
    slots.filter(
      (other) =>
        other.key !== key &&
        usable(other) &&
        startOf(other.step) <= (other.fresh ? end.getTime() - MINUTE_MS : start.getTime()),
    ),
  );
  return startAfter(input, before, asking, services);
}

interface Settled {
  slots: Slot[];
  // Whether a plan the model worded was planned again into another.
  retold: boolean;
}

// A slot whose conditions changed, planned again. A replan that fails keeps the answer it had, so that the rest of the
// reply still reaches the User.
async function settled(
  slots: readonly Slot[],
  at: number,
  context: ToolContext,
  services: AllStepsServices,
): Promise<Settled> {
  const slot = slots[at];
  if (slot?.input === null || slot === undefined) {
    return { slots: [...slots], retold: false };
  }
  const input = await startAfter(slot.input, stepBeforeSlot(slots, at), context, services);
  const planned = sameConstraints(input, slot.input) ? null : await services.replan(input, context).catch(() => null);
  if (planned === null) {
    return { slots: [...slots], retold: false };
  }
  settleAnswer(context.presented, planned);
  const next = {
    ...slot,
    step: answerStep(planned, slot.key ?? requestKey(planned.input)),
    input: isMovable(planned.input) ? planned.input : null,
    answer: planned,
  };
  return { slots: slots.with(at, next), retold: slot.answer !== null && planChanged(slot.answer, planned) };
}

// The order the steps that can move are settled in: those on screen in their order, then the new ones by when they
// start, so that the step before one is settled first.
function settleOrder(slots: readonly Slot[]): number[] {
  const startOfSlot = ({ input, step }: Slot): number =>
    step.startAt === null
      ? ((input === null ? null : askedStart(input))?.getTime() ?? Number.POSITIVE_INFINITY)
      : startOf(step);
  const movable = slots.flatMap((slot, at) => (slot.input === null ? [] : [{ slot, at }]));
  return [
    ...movable.filter(({ slot }) => slot.onScreen).map(({ at }) => at),
    ...movable
      .filter(({ slot }) => !slot.onScreen)
      .toSorted((a, b) => startOfSlot(a.slot) - startOfSlot(b.slot))
      .map(({ at }) => at),
  ];
}

const FIXED_KINDS: ReadonlySet<ReplyStep['kind']> = new Set(['events', 'quests', 'new-quest']);

// A step at a fixed time that starts before a step before it ends cannot be reached: it stays, not done, with why. A
// step on screen once out of reach is judged again.
function withReach(steps: readonly ReplyStep[]): ReplyStep[] {
  return steps.map((each, at): ReplyStep => {
    if (!FIXED_KINDS.has(each.kind) || each.place === null || each.startAt === null) {
      return each;
    }
    const step = { ...each, status: 'shown' as const, reason: null };
    const latest = Math.max(...steps.slice(0, at).flatMap(({ endAt }) => (endAt === null ? [] : [Date.parse(endAt)])));
    return latest > startOf(step)
      ? { ...step, status: 'not-done', reason: `앞 일정이 ${clockOf(latest)}에 끝나 제때 갈 수 없어요` }
      : step;
  });
}

// Puts the conversation's steps in what the run presented, when there are two or more, each step that can move set out
// from the one before it. When the server planned a step the model had worded into another plan, the steps say it in
// the model's place: the plan set out from the step before stands.
export async function presentAllSteps(context: ToolContext, services: AllStepsServices): Promise<void> {
  const { presented } = context;
  const slots = slotsOf(context, services.kwanjeong);
  delete presented.notDone;
  if (slots.length < 2) {
    return;
  }
  const done = await settleOrder(slots).reduce(
    async (sofar: Promise<Settled>, at) => {
      const { slots: current, retold } = await sofar;
      const next = await settled(current, at, context, services);
      return { slots: next.slots, retold: retold || next.retold };
    },
    Promise.resolve({ slots, retold: false }),
  );
  presented.steps = withReach(stepOrder(done.slots.map(({ step }) => step)));
  if (done.retold) {
    presented.retold = stepsSentence(presented.steps);
  }
}
