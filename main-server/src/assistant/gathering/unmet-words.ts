/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SHORTEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { type AnswerLine, type AnswerReply, type ConditionChip } from '../dto/answer.dto.js';
import { clockOf, type DayItem } from '../free-time/free-time.js';
import { type RelaxOffer } from '../refusals/relax.dto.js';
import { type AnswerPerson, mealWord, type Naming, withSubject, withTopic } from './answer-words.js';
import { type GatheringFit, minutesBetween, minutesSaid } from './gathering.js';
import { missingLines, NEAREST_BASIS } from './missing-inputs.js';
import { type Relax, startsByOf, type Unmet } from './unmet-plans.js';

// The words of a meal whose conditions cannot all be met (P02-14): a meal 지금 nobody can make (board n11) and the one
// eased from it (n11b), a plan moved past a Class too soon to eat before (n10), a nearer Restaurant that closes first
// (n12), and a Friend whose position is unknown (n23). A Friend is named and timed only by their Timetable's Classes.

type Part = AnswerLine[number];

const plain = (text: string): Part => ({ text, strong: false });
const strong = (text: string): Part => ({ text, strong: true });

// The asker is told of a walk this short that no reminder to leave comes.
const SHORT_WALK_MINUTES = 5;

const COUNTS = ['', '', '둘이', '셋이', '넷이', '다섯이', '여섯이', '일곱이', '여덟이'];
const together = (people: number): string => COUNTS[people] ?? `${people}명이`;

// 으로 after a clock read with a final consonant at its end (영, 삼, 육), else 로.
const toward = (clock: string): string => `${clock}${/[036]$/u.test(clock) ? '으로' : '로'}`;

const kindOf = ({ isClass }: DayItem): string => (isClass ? '수업' : '일정');

const byStart = (a: DayItem, b: DayItem): number => a.start.getTime() - b.start.getTime();

const eased = ({ input }: Naming['args']): string | null =>
  input.window.now === true && input.window.from !== null ? input.window.from : null;

// The meal's first serving as a line ("저녁은 17:00부터예요").
const servedLine = (naming: Naming, opensAt: Date): string =>
  `${withTopic(mealWord(naming))} ${clockOf(opensAt)}부터예요`;

// What keeps a person from a meal 지금: the item they are in until its end, else their next item when it starts before
// a meal begun by `startsBy` could end; a Friend's only when it is a Class. Null when no item stands in the way.
function busyLine({ me, name, items }: AnswerPerson, now: Date, startsBy: Date): AnswerLine | null {
  const current = items.find(({ start, end }) => start <= now && now < end);
  const next = items.filter(({ start }) => start > now).toSorted(byStart)[0];
  const cuts = next !== undefined && next.start.getTime() < startsBy.getTime() + SHORTEST_MEAL_SECONDS * 1000;
  const item = current ?? (cuts ? next : undefined);
  if (item === undefined || (!me && !item.isClass)) {
    return null;
  }
  if (current !== undefined) {
    return [
      ...(me ? [] : [plain(`${withTopic(name)} `)]),
      strong(clockOf(current.end)),
      plain(`까지 ${kindOf(current)}이에요`),
    ];
  }
  const again = items.some(({ end, isClass }) => end <= now && isClass === item.isClass) ? '다시 ' : '';
  return [
    ...(me ? [] : [plain(`${withSubject(name)} `)]),
    strong(clockOf(item.start)),
    plain(`에 ${again}${kindOf(item)}이에요`),
  ];
}

function offerOf(relax: Relax, naming: Naming): RelaxOffer {
  if (relax.kind === 'without') {
    return { ...relax, label: `${naming.personOf(relax.userId).name} 빼고 보기` };
  }
  return { ...relax, label: `${relax.time} 이후` };
}

// Why nothing fits 지금: the meal is not served by then, else what keeps the one in the way from it, if anything does.
function whyNotNow(naming: Naming, { opensAt, blocker }: Unmet, startsBy: Date): AnswerLine | null {
  if (opensAt > startsBy) {
    return [plain(servedLine(naming, opensAt))];
  }
  return blocker === null ? null : busyLine(naming.personOf(blocker), naming.args.now, startsBy);
}

// Board n11: nothing fits 지금. Null for any other answer without a plan.
export function notNowPlan(naming: Naming): AnswerReply['noPlan'] {
  const { unmet, people, menus, now, input } = naming.args;
  const startsBy = startsByOf(input, now);
  if (unmet?.relax === null || unmet?.relax === undefined || startsBy === undefined || menus !== 'open') {
    return null;
  }
  const first = [
    plain(people.length > 1 ? `지금은 ${together(people.length)} 먹을 때가 없어요` : '지금은 먹을 때가 없어요'),
  ];
  const why = whyNotNow(naming, unmet, startsBy);
  return {
    reason: 'no-shared-time',
    lines: why === null ? [first] : [first, why],
    relax: unmet.relax.map((relax) => offerOf(relax, naming)),
  };
}

// The time chip in place of the until chip: 지금 when nothing fits it, the start it was eased to, or the Class the
// asker alone could not eat before. Null for the until chip as it is.
export function timeChip({ args }: Naming): ConditionChip | null {
  const from = eased(args);
  if (from !== null) {
    return { kind: 'from', text: `${from} 이후`, userId: null, mark: 'relaxed' };
  }
  const { unmet, gathering } = args;
  if (gathering.fits.length === 0) {
    return unmet?.relax === null || unmet?.relax === undefined ? null : { kind: 'from', text: '지금', userId: null };
  }
  const soon = unmet?.tooSoon ?? null;
  if (soon === null) {
    return null;
  }
  const text = soon.isClass ? `${clockOf(soon.start)} 수업까지` : `${clockOf(soon.start)}까지`;
  return { kind: 'until', text, userId: null, mark: 'relaxed' };
}

// Board n11b: the time and the Restaurant, the minutes of those eating, and what was eased.
function easedLines(fit: GatheringFit, { args }: Naming): AnswerLine[] | null {
  const { key, start, end, togetherMinutes } = fit;
  const from = eased(args);
  if (from === null) {
    return null;
  }
  const said =
    args.people.length > 1 ? `${together(args.people.length)} ${togetherMinutes}분` : `식사 ${togetherMinutes}분`;
  const minutes = minutesSaid(fit) ? said : `${clockOf(end)}까지`;
  return [[strong(`${clockOf(start)} ${key}`), plain(` · ${minutes}`)], [plain(`지금 대신 ${toward(from)} 미뤘어요`)]];
}

// Board n10: the minutes left before the item, and the plan after it.
function tooSoonLines({ key, start }: GatheringFit, { args }: Naming): AnswerLine[] | null {
  const soon = args.unmet?.tooSoon ?? null;
  if (soon === null) {
    return null;
  }
  const kind = kindOf(soon);
  return [
    [plain(`${kind}까지 ${minutesBetween(args.now, soon.start)}분이라 식사는 어려워요`)],
    [plain(`${kind} 끝나고 `), strong(clockOf(start)), plain(` ${key}`)],
  ];
}

// Board n23: the Friends whose way the plan leaves out, for nobody knows where they are. A window the User fixed keeps
// the lines that say who misses it.
function unknownLines({ key, parts }: GatheringFit, naming: Naming): AnswerLine[] | null {
  const unknown = parts.slice(1).filter(({ origin }) => origin === null);
  const { from, until } = naming.args.input.window;
  if (unknown.length === 0 || from !== null || until !== null) {
    return null;
  }
  const names = unknown.map(({ personId }) => naming.personOf(personId).name).join(', ');
  return [
    [strong(key), plain(` · ${names}의 길은 빼고 정했어요`)],
    [plain(`${withTopic(names)} 지금 어디 있는지 몰라요`)],
  ];
}

// Board n12: the pick of the asker alone, when a nearer Restaurant closes before a meal fits there. The arrival is the
// meal's start: the asker may be free to get there hours before a dinner the User set (P03).
function closingLines({ key, start, parts }: GatheringFit, { args }: Naming): AnswerLine[] | null {
  const [mine] = parts;
  if (args.people.length > 1 || mine?.walkMinutes === null || mine?.walkMinutes === undefined) {
    return null;
  }
  const walk = mine.walkMinutes;
  const [nearer] = args.gathering.dropped
    .flatMap(({ key: closed, closing }) =>
      closing?.walkMinutes === null || closing === undefined ? [] : [{ closed, ...closing, walk: closing.walkMinutes }],
    )
    .filter((drop) => drop.walk < walk)
    .toSorted((a, b) => a.walk - b.walk);
  if (nearer === undefined) {
    return null;
  }
  return [
    [strong(key), plain(` · ${clockOf(start)} 도착`)],
    [plain(`${withTopic(nearer.closed)} ${clockOf(nearer.at)}에 닫아요`)],
  ];
}

// A Plan's lines when an input was missing (the pick's alone, P02-13) or a condition was eased or could not be met,
// null when none was. `first` for the pick, `nearest` when the Plans come nearest first for want of a Timetable.
export function unmetLines(
  fit: GatheringFit,
  naming: Naming,
  { first, nearest }: { first: boolean; nearest: boolean },
): AnswerLine[] | null {
  return (
    (first ? missingLines(fit, nearest) : null) ??
    easedLines(fit, naming) ??
    tooSoonLines(fit, naming) ??
    unknownLines(fit, naming) ??
    (first ? closingLines(fit, naming) : null)
  );
}

// Board n23's basis for a Friend whose position is unknown: what the asker sees of them, and where their way is shown.
function unknownBasis({ name, items, level }: AnswerPerson, now: Date): string[] {
  const ended = items
    .filter(({ end, isClass }) => isClass && end <= now)
    .toSorted((a, b) => b.end.getTime() - a.end.getTime())[0];
  const seen =
    level === 'timetable'
      ? `${withTopic(name)} 시간표만 보여요. ${ended === undefined ? '' : `${clockOf(ended.end)}에 수업이 끝나 `}지금 자리는 몰라요`
      : `${withTopic(name)} 지금 어디 있는지 몰라요`;
  return [seen, `${name}의 길은 ${name}의 초대장에 떠요. 나에게는 수락과 거절만 와요`];
}

// Board n11b's first line: whose item, ending last before the eased start and after the meal is first served, kept
// them all from eating sooner. When no item did, and the meal was not served yet, when it is.
function easedBasis(naming: Naming, from: string): string | null {
  const { people, now, unmet } = naming.args;
  const opensAt = unmet?.opensAt ?? now;
  const before = people
    .flatMap((person) => person.items.map((item) => ({ person, item })))
    .filter(({ item }) => item.end > now && item.end > opensAt && clockOf(item.end) <= from)
    .toSorted((a, b) => b.item.end.getTime() - a.item.end.getTime())[0];
  if (before === undefined) {
    return opensAt > now ? servedLine(naming, opensAt) : null;
  }
  if (people.length < 2 || (!before.person.me && !before.item.isClass)) {
    return null;
  }
  const { person, item } = before;
  const who = person.me ? '' : `${withSubject(person.name)} `;
  return `${who}${clockOf(item.end)}까지 ${kindOf(item)}이라 ${from}부터 ${together(people.length)} 돼요`;
}

// A Plan's basis as `basisOf` gives it, one line for each Friend first: those of a Friend whose position is unknown
// replaced, what kept them from eating sooner first when 지금 was eased, and for the asker alone moved past a Class, that a
// short walk gets no reminder. Why the Plans come nearest first heads it when they do (P02-13).
export function unmetBasis(fit: GatheringFit, naming: Naming, basis: readonly string[], nearest: boolean): string[] {
  const { args } = naming;
  const friends = fit.parts.slice(1);
  const lines = [
    ...friends.flatMap((part, index) =>
      part.origin === null ? unknownBasis(naming.personOf(part.personId), args.now) : basis.slice(index, index + 1),
    ),
    ...basis.slice(friends.length),
  ];
  const from = eased(args);
  const why = from === null ? null : easedBasis(naming, from);
  const walk = fit.parts[0]?.walkMinutes ?? null;
  const short = (args.unmet?.tooSoon ?? null) !== null && walk !== null && walk < SHORT_WALK_MINUTES;
  return [
    ...(nearest ? [NEAREST_BASIS] : []),
    ...(why === null ? [] : [why]),
    ...lines,
    ...(short ? [`${SHORT_WALK_MINUTES}분이 안 되는 길이라 나설 알림은 없어요`] : []),
  ];
}
