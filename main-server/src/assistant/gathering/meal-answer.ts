/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type AnswerReply, type ConditionChip, type Plan } from '../dto/answer.dto.js';
import { clockOf, onDay } from '../free-time/free-time.js';
import { mealWindow } from '../free-time/meal-fit.js';
import { koreaTime } from '../korea-time.js';
import {
  GatheringNaming,
  itemAt,
  itemBefore,
  type MealAnswerArgs,
  mealWord,
  mergingLegs,
  type Naming,
  unknownOriginChip,
  wayOn,
  withSubject,
  withTopic,
} from './answer-words.js';
import { type GatheringFit, type GatheringSide, type PersonPart } from './gathering.js';
import { kindFirst, mainMenu, menuBasis, withMenu } from './meal-menu.js';
import { bandOf, mealSpan, sceneOf } from './meal-scene.js';
import { missingParts, nearestFirst } from './missing-inputs.js';
import { conditionsOf, type PersonConditions, windowOf } from './plan-conditions.js';
import { droppedOf, partOf, unfitLines } from './plan-parts.js';
import { notNowPlan, timeChip, unmetBasis, unmetLines } from './unmet-words.js';

export { type AnswerPerson, type MealAnswerArgs } from './answer-words.js';

// The words of a calculated meal: what the app draws and writes for each plan. Nothing here is sent to the model.

const plain = (text: string): AnswerLine => [{ text, strong: false }];

// What the User fixed for the asker: their conditions, and the earliest of the window's end and their own leave-by.
function askerFixed({
  date,
  window,
  people,
}: GatheringNaming['args']['input']): PersonConditions & { end: Date | null } {
  const conditions = conditionsOf(people[0]?.constraints ?? [], date);
  const ends = [conditions.leaveBy, window.until === null ? undefined : onDay(date, window.until)];
  const end = ends.filter((at) => at !== undefined).toSorted((a, b) => a.getTime() - b.getTime())[0] ?? null;
  return { ...conditions, end };
}

// The asker's chosen origin, else the one of their side, marked when it was assumed for a missing location.
export function originChip(naming: GatheringNaming, mine: GatheringSide | undefined): ConditionChip | null {
  const placeId = askerFixed(naming.args.input).chosenPlaceId ?? mine?.origin?.placeId ?? null;
  if (placeId === null) {
    return null;
  }
  const chip: ConditionChip = { kind: 'origin', text: `${naming.placeLabel(placeId)}에서`, userId: null };
  return mine?.origin?.assumed === true ? { ...chip, mark: 'assumed' } : chip;
}

// The end the User fixed when it is earlier than both the asker's next item and the window's own end (the meal's),
// else that item.
export function untilChip(
  naming: GatheringNaming,
  mine: GatheringSide | undefined,
  ownEnd: Date,
): ConditionChip | null {
  const until = mine === undefined ? null : itemAt(naming.asker.items, mine.next);
  const { end } = askerFixed(naming.args.input);
  if (end !== null && end < ownEnd && (until === null || end < until.start)) {
    return { kind: 'until', text: `${clockOf(end)}까지`, userId: null };
  }
  if (until === null) {
    return null;
  }
  const clock = clockOf(until.start);
  return { kind: 'until', text: until.isClass ? `${clock} 수업까지` : `${clock}까지`, userId: null };
}

// Each Friend, marked when their origin is unknown.
export function personChips({ args }: GatheringNaming): ConditionChip[] {
  const theirs = args.gathering.sides.slice(1);
  return args.people.slice(1).map((friend, index): ConditionChip => {
    const side = theirs[index];
    const text = side === undefined || side.origin !== null ? friend.name : unknownOriginChip(friend.name, side.later);
    return { kind: 'person', text, userId: friend.userId };
  });
}

// From the sides, and from the input for what the User fixed: where the asker sets out, until when, and each Friend.
// With no time shared there are no sides.
function chipsOf(naming: Naming): ConditionChip[] {
  const { input, gathering } = naming.args;
  const [mine] = gathering.sides;
  const until = untilChip(naming, mine, mealWindow(input.date, input.meal).end);
  const chips = [originChip(naming, mine), timeChip(naming) ?? until].filter((chip) => chip !== null);
  return [...chips, ...personChips(naming)];
}

// The meal is named where the window is its own, so that a meal the server took by the clock can be corrected.
function noPlanOf(naming: Naming): AnswerReply['noPlan'] {
  const { menus, gathering, people, input } = naming.args;
  const meal = mealWord(naming);
  if (menus === 'none') {
    return { reason: 'no-menu', lines: [plain('그날은 수집된 메뉴가 없어요')] };
  }
  if (menus === 'closed') {
    return { reason: 'no-menu', lines: [plain(`${meal}에 여는 식당이 없어요`)] };
  }
  if (menus === 'closed-at-place') {
    return { reason: 'no-fit', lines: [plain('그곳에는 여는 식당이 없어요')] };
  }
  if (gathering.shared === null) {
    const when = input.window.from === null && input.window.until === null ? `${meal} 시간` : '그 시간';
    const text = people.length > 1 ? `${when}에는 같이 비는 시간이 없어요` : `${when}에는 비는 시간이 없어요`;
    return { reason: 'no-shared-time', lines: [plain(text)] };
  }
  const unfit = unfitLines(naming, windowOf(input), { word: meal, stay: '먹어요' });
  return { reason: 'no-fit', lines: unfit ?? [plain('시간 안에 다녀올 수 있는 식당이 없어요')] };
}

// The merging point's step, then the one at the place, titled as given.
export function subQuestsOf(
  { placeId, start, meeting }: GatheringFit,
  naming: GatheringNaming,
  title: string,
): Plan['subQuests'] {
  const there = { at: koreaTime(start), placeId, title };
  if (meeting === null) {
    return [there];
  }
  const names = meeting.personIds.map((personId) => naming.personOf(personId).name).join(', ');
  const merging = `${names}: ${naming.placeLabel(meeting.placeId)} 앞에서 만나기`;
  return [{ at: koreaTime(meeting.at), placeId: meeting.placeId, title: merging }, there];
}

export function meetingOf({ meeting }: GatheringFit, naming: GatheringNaming): Plan['meeting'] {
  return meeting === null
    ? null
    : { place: naming.placePoint(meeting.placeId), at: koreaTime(meeting.at), userIds: meeting.personIds };
}

// The second line of a plan alone: how long the asker walks and when they must leave.
function aloneLine(mine: PersonPart | undefined): string | null {
  const walk = mine?.walkMinutes ?? 0;
  const leaveBy = mine?.leaveBy ?? null;
  if (leaveBy !== null) {
    return walk > 0 ? `${walk}분을 걷고 ${clockOf(leaveBy)}엔 나서야 해요` : `${clockOf(leaveBy)}엔 나서야 해요`;
  }
  return walk > 0 ? `걸어서 ${walk}분이에요` : null;
}

// The first of the parts by `at`, the earlier person on a tie.
function firstBy(parts: readonly PersonPart[], at: (part: PersonPart) => number): PersonPart | undefined {
  return parts.toSorted((a, b) => at(a) - at(b))[0];
}

// When a person reaches the place on their own: ready, plus their whole walk; ready alone when their origin is unknown.
const ownArrival = ({ readyAt, walkMinutes }: PersonPart): number => readyAt.getTime() + (walkMinutes ?? 0) * 60_000;

// Who keeps the plan from the window the User fixed, or the window it was fitted in when that, not a person, does: the
// meal's own, or the Restaurant's hours. The start first, then the end.
function missedLine({ key, start, end, parts, window: own }: GatheringFit, naming: Naming): string | null {
  const { input } = naming.args;
  const { date, window } = input;
  const held = own ?? windowOf(input);
  const meal = mealWord(naming);
  if (window.from !== null) {
    if (start > held.start) {
      const last = firstBy(parts, (part) => -ownArrival(part));
      const { me, name } = naming.personOf(last?.personId ?? naming.asker.userId);
      const clock = clockOf(start);
      if (me) {
        return `${clock}에야 도착해요`;
      }
      return last?.origin === null
        ? `${withTopic(name)} ${clock}부터 가능해요`
        : `${withSubject(name)} ${clock}에 도착해요`;
    }
    if (held.start > onDay(date, window.from)) {
      return own === undefined
        ? `${withTopic(meal)} ${clockOf(held.start)}부터예요`
        : `${withTopic(key)} ${clockOf(held.start)}에 열어요`;
    }
  }
  if (window.until !== null) {
    if (end < held.end) {
      const first = firstBy(parts, (part) => (part.leaveBy ?? end).getTime());
      const { me, name } = naming.personOf(first?.personId ?? naming.asker.userId);
      return me ? `${clockOf(end)}엔 나서야 해요` : `${withTopic(name)} ${clockOf(end)}에 나서야 해요`;
    }
    if (held.end < onDay(date, window.until)) {
      return own === undefined
        ? `${withTopic(meal)} ${clockOf(held.end)}까지예요`
        : `${withTopic(key)} ${clockOf(held.end)}에 닫아요`;
    }
  }
  return null;
}

// The first line, which every plan has, opens with the meal, so that a meal the server took by the clock can be
// corrected.
function linesOf(fit: GatheringFit, naming: Naming): AnswerLine[] {
  const { key, start, togetherMinutes, parts } = fit;
  const { people, aloneMinutes } = naming.args;
  const missed = missedLine(fit, naming);
  const meal = { text: `${mealWord(naming)} `, strong: false };
  if (people.length > 1) {
    const fewer = aloneMinutes === null ? 0 : aloneMinutes - togetherMinutes;
    const second = missed ?? (fewer > 0 ? `같이 먹으면 식사가 ${fewer}분 줄어요` : mealSpan(fit));
    return [[meal, { text: `${clockOf(start)} ${key}`, strong: true }], plain(second)];
  }
  const first: AnswerLine = [meal, { text: key, strong: true }, { text: ` · ${mealSpan(fit)}`, strong: false }];
  const second = missed ?? aloneLine(parts[0]);
  return second === null ? [first] : [first, plain(second)];
}

function friendBasis(part: PersonPart, { key, meeting }: GatheringFit, naming: GatheringNaming): string {
  const { name, items } = naming.personOf(part.personId);
  const { origin, readyAt, walkMinutes, leaveBy } = part;
  if (origin === null) {
    return `${withTopic(name)} 지금 어디 있는지 몰라요`;
  }
  const from = naming.placeLabel(origin.placeId);
  const pieces: string[] = [];
  const { now } = naming.args;
  const before = itemBefore(items, readyAt);
  if (origin.basis === 'location') {
    pieces.push(`${name} 지금 ${from}`);
  } else if (origin.basis === 'chosen') {
    pieces.push(`${name} ${from}에서`);
  } else {
    const ended = (before?.isClass ?? true) ? '수업 끝' : '일정 끝';
    const endedAt = before !== null && before.end > now ? ` ${clockOf(before.end)}` : '';
    pieces.push(`${name}${endedAt} ${from} ${ended}`);
  }
  // Ready later than their own day allows: the asker's "not before" moved it.
  if (readyAt > now && (before === null || readyAt > before.end)) {
    pieces.push(`${clockOf(readyAt)}부터 가능`);
  }
  const legs = mergingLegs(part, meeting);
  if (legs !== null && legs.toMeeting === 0) {
    pieces.push(`같이 걸어서 ${legs.onward}분`);
  } else if (legs !== null && meeting !== null) {
    pieces.push(`${naming.placeLabel(meeting.placeId)}까지 걸어서 ${legs.toMeeting}분, 같이 ${legs.onward}분`);
  } else if (walkMinutes !== null && walkMinutes > 0) {
    pieces.push(`${key}까지 걸어서 ${walkMinutes}분`);
  }
  if (leaveBy !== null) {
    pieces.push(`${clockOf(leaveBy)}에 나서요`);
  }
  return pieces.join(' · ');
}

// Each Friend's way, then the asker's way there when they walk alone, then when the asker must leave.
export function basisOf(fit: GatheringFit, naming: GatheringNaming): string[] {
  const [mine, ...theirs] = fit.parts;
  const lines = theirs.map((part) => friendBasis(part, fit, naming));
  if (mine === undefined) {
    return lines;
  }
  const { origin, walkMinutes, leaveBy } = mine;
  if (fit.meeting === null && origin !== null && walkMinutes !== null && walkMinutes > 0) {
    lines.push(`${naming.placeLabel(origin.placeId)} → ${fit.key} 걸어서 ${walkMinutes}분`);
  }
  if (leaveBy !== null) {
    const leaving = `${clockOf(leaveBy)}에 나서요`;
    const onward = wayOn(mine);
    lines.push(
      onward === null
        ? leaving
        : `${fit.key} → ${naming.placeLabel(onward.placeId)} 걸어서 ${onward.minutes}분, 그래서 ${leaving}`,
    );
  }
  return lines;
}

// `first` for the Plan shown first, `nearest` when the Plans come nearest first for want of a Timetable.
function planOf(fit: GatheringFit, naming: Naming, { first, nearest }: { first: boolean; nearest: boolean }): Plan {
  const { key, placeId, start, end, togetherMinutes } = fit;
  const served = naming.args.served?.get(key);
  const unmet = unmetLines(fit, naming, { first, nearest });
  return {
    id: key,
    title: `${key}에서 ${mealWord(naming)}`,
    place: naming.labelledPoint(placeId, key),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    togetherMinutes,
    meeting: meetingOf(fit, naming),
    parts: fit.parts.map((part) => partOf(part, naming)),
    subQuests: subQuestsOf(fit, naming, `${key}에서 식사`),
    lines: withMenu(unmet ?? linesOf(fit, naming), served, { key, date: naming.args.input.date, now: naming.args.now }),
    basis: [
      ...unmetBasis(fit, naming, basisOf(fit, naming), nearest),
      ...(served === undefined ? [] : menuBasis(served)),
    ],
    scene: sceneOf(fit, naming, mealWord(naming)),
    band: bandOf(fit, naming),
    ...(served === undefined ? {} : { menu: mainMenu(served.lines, served.cuisines) }),
  };
}

export function mealAnswer(args: MealAnswerArgs): AnswerReply {
  const naming = new GatheringNaming(args);
  const nearest = nearestFirst(args);
  const plans = kindFirst(nearest ?? args.gathering.fits, args.input.cuisine, args.served).map((fit, index) =>
    planOf(fit, naming, { first: index === 0, nearest: nearest !== null }),
  );
  return {
    input: args.input,
    chips: chipsOf(naming),
    plans,
    dropped: droppedOf(naming),
    noPlan: plans.length > 0 ? null : (notNowPlan(naming) ?? noPlanOf(naming)),
    ...missingParts(args.missing),
  };
}
