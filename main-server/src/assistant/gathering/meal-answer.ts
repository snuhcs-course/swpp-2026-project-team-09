/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerLine,
  type AnswerReply,
  type ConditionChip,
  type Plan,
  type PlanMember,
} from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem } from '../free-time/free-time.js';
import { koreaTime } from '../korea-time.js';
import {
  type AnswerPerson,
  itemAt,
  itemBefore,
  type MealAnswerArgs,
  mergingLegs,
  minutesBetween,
  Naming,
  wayOn,
  withTopic,
} from './answer-words.js';
import { type Gathering, type GatheringFit, type MemberPart, RECENT_CLASS_MINUTES } from './gathering.js';
import { bandOf, sceneOf } from './meal-scene.js';

export { type AnswerPerson, type MealAnswerArgs } from './answer-words.js';

// The words of a calculated meal: what the app draws and writes for each plan. Nothing here is sent to the model.

const timeOf = (at: Date | null): string | null => (at === null ? null : koreaTime(at));

const plain = (text: string): AnswerLine => [{ text, strong: false }];

// Where a person sets out from and what follows, as the conditions say them.
interface Around {
  originPlaceId: string | null;
  originKnown: boolean;
  next: DayItem | null;
}

// Without a plan the conditions are read from the items around the shared time, or around now without one.
function aroundWithoutPlan(person: AnswerPerson, { shared }: Gathering, now: Date): Around {
  const { start, end } = shared ?? { start: now, end: now };
  const previous = itemBefore(person.items, start);
  const recent = previous !== null && minutesBetween(previous.end, now) <= RECENT_CLASS_MINUTES;
  const originPlaceId = recent ? previous.placeId : null;
  return {
    originPlaceId,
    originKnown: originPlaceId !== null || person.position !== null,
    next: person.items.toSorted(byStart).find((item) => item.start >= end) ?? null,
  };
}

function chipsOf(naming: Naming): ConditionChip[] {
  const { people, gathering, now } = naming.args;
  const [first] = gathering.fits;
  const [mine, ...theirs] = people.map((person, index): Around => {
    const part = first?.parts[index];
    if (part === undefined) {
      return aroundWithoutPlan(person, gathering, now);
    }
    const { origin, next } = part;
    return { originPlaceId: origin?.placeId ?? null, originKnown: origin !== null, next: itemAt(person.items, next) };
  });
  const chips: ConditionChip[] = [];
  if (mine !== undefined && mine.originPlaceId !== null) {
    chips.push({ kind: 'origin', text: `${naming.building(mine.originPlaceId)}에서`, userId: null });
  }
  if (mine !== undefined && mine.next !== null) {
    const clock = clockOf(mine.next.start);
    chips.push({ kind: 'until', text: mine.next.isClass ? `${clock} 수업까지` : `${clock}까지`, userId: null });
  }
  const friends = people.slice(1);
  theirs.forEach(({ originKnown }, index) => {
    const friend = friends[index];
    if (friend !== undefined) {
      const text = originKnown ? friend.name : `${friend.name} · 자리 모름`;
      chips.push({ kind: 'person', text, userId: friend.userId });
    }
  });
  return chips;
}

function noPlanOf({ menusCollected, gathering, people }: MealAnswerArgs): AnswerReply['noPlan'] {
  if (!menusCollected) {
    return { reason: 'no-menu', lines: [plain('그날은 수집된 메뉴가 없어요')] };
  }
  if (gathering.shared === null) {
    const text = people.length > 1 ? '그 시간에는 같이 비는 시간이 없어요' : '그 시간에는 비는 시간이 없어요';
    return { reason: 'no-shared-time', lines: [plain(text)] };
  }
  return { reason: 'no-fit', lines: [plain('시간 안에 다녀올 수 있는 식당이 없어요')] };
}

function memberOf(part: MemberPart, naming: Naming): PlanMember {
  const { userId, name, me } = naming.personOf(part.memberId);
  const { origin, next } = part;
  return {
    userId,
    name,
    me,
    origin: origin === null ? null : { place: naming.buildingPoint(origin.placeId), basis: origin.basis },
    leaveAt: timeOf(part.leaveAt),
    walkMinutes: part.walkMinutes,
    arriveAt: timeOf(part.arriveAt),
    leaveBy: timeOf(part.leaveBy),
    next:
      next === null
        ? null
        : { startAt: koreaTime(next.start), place: next.placeId === null ? null : naming.buildingPoint(next.placeId) },
  };
}

function stepsOf({ key, placeId, start, meeting }: GatheringFit, naming: Naming): Plan['steps'] {
  const meal = { at: koreaTime(start), placeId, title: `${key}에서 식사` };
  if (meeting === null) {
    return [meal];
  }
  const names = meeting.memberIds.map((memberId) => naming.personOf(memberId).name).join(', ');
  const title = `${names}: ${naming.building(meeting.placeId)} 앞에서 만나기`;
  return [{ at: koreaTime(meeting.at), placeId: meeting.placeId, title }, meal];
}

// The second line of a plan alone: how long the asker walks and when they must leave.
function aloneLine(mine: MemberPart | undefined): string | null {
  const walk = mine?.walkMinutes ?? 0;
  const leaveBy = mine?.leaveBy ?? null;
  if (leaveBy !== null) {
    return walk > 0 ? `${walk}분을 걷고 ${clockOf(leaveBy)}엔 나서야 해요` : `${clockOf(leaveBy)}엔 나서야 해요`;
  }
  return walk > 0 ? `걸어서 ${walk}분이에요` : null;
}

function linesOf(
  { key, start, togetherMinutes, parts }: GatheringFit,
  { people, aloneMinutes }: MealAnswerArgs,
): AnswerLine[] {
  if (people.length > 1) {
    const fewer = aloneMinutes === null ? 0 : aloneMinutes - togetherMinutes;
    const second = fewer > 0 ? `같이 먹으면 식사가 ${fewer}분 줄어요` : `식사 ${togetherMinutes}분`;
    return [[{ text: `${clockOf(start)} ${key}`, strong: true }], plain(second)];
  }
  const first: AnswerLine = [
    { text: key, strong: true },
    { text: ` · 식사 ${togetherMinutes}분`, strong: false },
  ];
  const second = aloneLine(parts[0]);
  return second === null ? [first] : [first, plain(second)];
}

function friendBasis(part: MemberPart, { key, meeting }: GatheringFit, naming: Naming): string {
  const { name, items } = naming.personOf(part.memberId);
  const { origin, readyAt, walkMinutes, leaveBy } = part;
  if (origin === null) {
    return `${withTopic(name)} 지금 어디 있는지 몰라요`;
  }
  const building = naming.building(origin.placeId);
  const pieces: string[] = [];
  if (origin.basis === 'location') {
    pieces.push(`${name} 지금 ${building}`);
  } else {
    const ended = (itemBefore(items, readyAt)?.isClass ?? true) ? '수업 끝' : '일정 끝';
    const later = readyAt > naming.args.now ? ` ${clockOf(readyAt)}` : '';
    pieces.push(`${name}${later} ${building} ${ended}`);
  }
  const legs = mergingLegs(part, meeting);
  if (legs !== null && meeting !== null) {
    pieces.push(`${naming.building(meeting.placeId)}까지 걸어서 ${legs.toMeeting}분, 같이 ${legs.onward}분`);
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
    lines.push(`${naming.building(origin.placeId)} → ${fit.key} 걸어서 ${walkMinutes}분`);
  }
  if (leaveBy !== null) {
    const leaving = `${clockOf(leaveBy)}에 나서요`;
    const onward = wayOn(mine);
    lines.push(
      onward === null
        ? leaving
        : `${fit.key} → ${naming.building(onward.placeId)} 걸어서 ${onward.minutes}분, 그래서 ${leaving}`,
    );
  }
  return lines;
}

function planOf(fit: GatheringFit, naming: Naming): Plan {
  const { key, placeId, start, end, togetherMinutes, meeting } = fit;
  return {
    id: key,
    title: `${key}에서 ${naming.mealWord()}`,
    place: naming.keyPoint(placeId, key),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    togetherMinutes,
    meeting:
      meeting === null
        ? null
        : { place: naming.buildingPoint(meeting.placeId), at: koreaTime(meeting.at), userIds: meeting.memberIds },
    members: fit.parts.map((part) => memberOf(part, naming)),
    steps: stepsOf(fit, naming),
    lines: linesOf(fit, naming.args),
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
      place: naming.keyPoint(drop.placeId, drop.key),
      reason: naming.dropReason(drop),
    })),
    noPlan: plans.length > 0 ? null : noPlanOf(args),
  };
}
