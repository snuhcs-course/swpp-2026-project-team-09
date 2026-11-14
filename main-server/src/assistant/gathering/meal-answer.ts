/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type AnswerReply, type ConditionChip, type Plan, type PlanPart } from '../dto/answer.dto.js';
import { clockOf, onDay } from '../free-time/free-time.js';
import { koreaTime } from '../korea-time.js';
import {
  itemAt,
  itemBefore,
  type MealAnswerArgs,
  mergingLegs,
  Naming,
  wayOn,
  withSubject,
  withTopic,
} from './answer-words.js';
import { type GatheringFit, type GatheringSide, type PersonPart } from './gathering.js';
import { bandOf, sceneOf } from './meal-scene.js';

export { type AnswerPerson, type MealAnswerArgs } from './answer-words.js';

// The words of a calculated meal: what the app draws and writes for each plan. Nothing here is sent to the model.

const timeOf = (at: Date | null): string | null => (at === null ? null : koreaTime(at));

const plain = (text: string): AnswerLine => [{ text, strong: false }];

// The earliest end the User fixed for the asker: the window's or their own leave-by, as HH:MM.
function fixedEnd({ window, people }: MealAnswerArgs['input']): string | null {
  const ends = (people[0]?.constraints ?? []).flatMap((constraint) =>
    constraint.kind === 'leaveBy' ? [constraint.time] : [],
  );
  if (window.until !== null) {
    ends.push(window.until);
  }
  return ends.toSorted()[0] ?? null;
}

// The asker's chosen origin, else the one of their side.
function originChip(naming: Naming, mine: GatheringSide | undefined): ConditionChip | null {
  const chosen = naming.args.input.people[0]?.constraints.findLast(({ kind }) => kind === 'from');
  const placeId = chosen?.kind === 'from' ? chosen.placeId : (mine?.origin?.placeId ?? null);
  return placeId === null ? null : { kind: 'origin', text: `${naming.placeLabel(placeId)}에서`, userId: null };
}

// The end the User fixed when it is earlier than the asker's next item or nothing follows, else that item.
function untilChip(naming: Naming, mine: GatheringSide | undefined): ConditionChip | null {
  const { input } = naming.args;
  const until = mine === undefined ? null : itemAt(naming.asker.items, mine.next);
  const fixed = fixedEnd(input);
  if (fixed !== null && (until === null || onDay(input.date, fixed) < until.start)) {
    return { kind: 'until', text: `${fixed}까지`, userId: null };
  }
  if (until === null) {
    return null;
  }
  const clock = clockOf(until.start);
  return { kind: 'until', text: until.isClass ? `${clock} 수업까지` : `${clock}까지`, userId: null };
}

// From the sides, and from the input for what the User fixed: where the asker sets out, until when, and each Friend,
// marked when their origin is unknown. With no time shared there are no sides.
function chipsOf(naming: Naming): ConditionChip[] {
  const { people, gathering } = naming.args;
  const [mine, ...theirs] = gathering.sides;
  const chips = [originChip(naming, mine), untilChip(naming, mine)].filter((chip) => chip !== null);
  people.slice(1).forEach((friend, index) => {
    const side = theirs[index];
    const text = side === undefined || side.origin !== null ? friend.name : `${friend.name} · 자리 모름`;
    chips.push({ kind: 'person', text, userId: friend.userId });
  });
  return chips;
}

function noPlanOf({ menus, gathering, people }: MealAnswerArgs): AnswerReply['noPlan'] {
  if (menus === 'none') {
    return { reason: 'no-menu', lines: [plain('그날은 수집된 메뉴가 없어요')] };
  }
  if (menus === 'closed') {
    return { reason: 'no-menu', lines: [plain('그 끼니에 여는 식당이 없어요')] };
  }
  if (menus === 'closed-at-place') {
    return { reason: 'no-fit', lines: [plain('그곳에는 여는 식당이 없어요')] };
  }
  if (gathering.shared === null) {
    const text = people.length > 1 ? '그 시간에는 같이 비는 시간이 없어요' : '그 시간에는 비는 시간이 없어요';
    return { reason: 'no-shared-time', lines: [plain(text)] };
  }
  return { reason: 'no-fit', lines: [plain('시간 안에 다녀올 수 있는 식당이 없어요')] };
}

function partOf(part: PersonPart, naming: Naming): PlanPart {
  const { userId, name, me } = naming.personOf(part.personId);
  const { origin, next } = part;
  return {
    userId,
    name,
    me,
    origin: origin === null ? null : { place: naming.placePoint(origin.placeId), basis: origin.basis },
    leaveAt: timeOf(part.leaveAt),
    walkMinutes: part.walkMinutes,
    leaveBy: timeOf(part.leaveBy),
    next:
      next === null
        ? null
        : { startAt: koreaTime(next.start), place: next.placeId === null ? null : naming.placePoint(next.placeId) },
  };
}

function subQuestsOf({ key, placeId, start, meeting }: GatheringFit, naming: Naming): Plan['subQuests'] {
  const meal = { at: koreaTime(start), placeId, title: `${key}에서 식사` };
  if (meeting === null) {
    return [meal];
  }
  const names = meeting.personIds.map((personId) => naming.personOf(personId).name).join(', ');
  const title = `${names}: ${naming.placeLabel(meeting.placeId)} 앞에서 만나기`;
  return [{ at: koreaTime(meeting.at), placeId: meeting.placeId, title }, meal];
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

// Who keeps the plan from the window the User fixed: the last to arrive when it starts later than the window's start,
// else the first to leave when it ends earlier than the window's end.
function missedLine({ start, end, parts }: GatheringFit, naming: Naming): string | null {
  const { date, window } = naming.args.input;
  if (window.from !== null && start > onDay(date, window.from)) {
    const last = firstBy(parts, (part) => -(part.canArriveAt ?? part.readyAt).getTime());
    const { me, name } = naming.personOf(last?.personId ?? naming.asker.userId);
    return me ? `${clockOf(start)}에야 도착해요` : `${withSubject(name)} ${clockOf(start)}에 도착해요`;
  }
  if (window.until !== null && end < onDay(date, window.until)) {
    const first = firstBy(parts, (part) => (part.leaveBy ?? end).getTime());
    const { me, name } = naming.personOf(first?.personId ?? naming.asker.userId);
    return me ? `${clockOf(end)}엔 나서야 해요` : `${withTopic(name)} ${clockOf(end)}에 나서야 해요`;
  }
  return null;
}

function linesOf(fit: GatheringFit, naming: Naming): AnswerLine[] {
  const { key, start, togetherMinutes, parts } = fit;
  const { people, aloneMinutes } = naming.args;
  const missed = missedLine(fit, naming);
  if (people.length > 1) {
    const fewer = aloneMinutes === null ? 0 : aloneMinutes - togetherMinutes;
    const second = missed ?? (fewer > 0 ? `같이 먹으면 식사가 ${fewer}분 줄어요` : `식사 ${togetherMinutes}분`);
    return [[{ text: `${clockOf(start)} ${key}`, strong: true }], plain(second)];
  }
  const first: AnswerLine = [
    { text: key, strong: true },
    { text: ` · 식사 ${togetherMinutes}분`, strong: false },
  ];
  const second = missed ?? aloneLine(parts[0]);
  return second === null ? [first] : [first, plain(second)];
}

function friendBasis(part: PersonPart, { key, meeting }: GatheringFit, naming: Naming): string {
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
  // Ready later than their own day lets them be: the asker said from when they can come.
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
function basisOf(fit: GatheringFit, naming: Naming): string[] {
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

function planOf(fit: GatheringFit, naming: Naming): Plan {
  const { key, placeId, start, end, togetherMinutes, meeting } = fit;
  return {
    id: key,
    title: `${key}에서 ${naming.mealWord()}`,
    place: naming.labelledPoint(placeId, key),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    togetherMinutes,
    meeting:
      meeting === null
        ? null
        : { place: naming.placePoint(meeting.placeId), at: koreaTime(meeting.at), userIds: meeting.personIds },
    parts: fit.parts.map((part) => partOf(part, naming)),
    subQuests: subQuestsOf(fit, naming),
    lines: linesOf(fit, naming),
    basis: basisOf(fit, naming),
    scene: sceneOf(fit, naming),
    band: bandOf(fit, naming),
  };
}

export function mealAnswer(args: MealAnswerArgs): AnswerReply {
  const naming = new Naming(args);
  const plans = args.gathering.fits.map((fit) => planOf(fit, naming));
  return {
    input: args.input,
    chips: chipsOf(naming),
    plans,
    dropped: args.gathering.dropped.map((drop) => ({
      place: naming.labelledPoint(drop.placeId, drop.key),
      reason: naming.dropReason(drop),
    })),
    noPlan: plans.length > 0 ? null : noPlanOf(args),
  };
}
