/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type StudyBuildingDto, type StudySpaceDto } from '../../study-spaces/dto/study-spaces.dto.js';
import {
  type AnswerLine,
  type AnswerReply,
  type ClosedPlace,
  type StudyInput,
  type TimeBand,
} from '../dto/answer.dto.js';
import { onDay } from '../free-time/free-time.js';
import { type OtherFriend } from '../gathering/answer-words.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { busyIn } from '../gathering/meal-scene.js';
import { type BandRows, othersWithoutPlace, windowBand, withBand } from '../gathering/no-plan-band.js';
import { koreaDate } from '../korea-time.js';
import { pointOf, STUDY_WHATS } from './study-lookup.js';
import { byStay, inArea, studyDayOf, type StudyDay, stayAt } from './study-near.js';
import {
  chipsOf,
  type EndsBy,
  type Faded,
  planOf,
  type Ranked,
  type Spot,
  type StudyHours,
} from './study-plan-parts.js';
import { type WayArgs } from './way.js';
import { WayNaming } from './way-naming.js';

// "공부할 자리 있어?" answered as ranked study places (P10 ticket 03): one plan per building holding a space of the kind
// asked that the User may use. The buildings known open at the arrival come first, then those whose hours are not
// known, each by the longest stay. A building open only to others is dropped, faded; one closed then is listed apart.

export interface StudyPlanArgs {
  input: StudyInput;
  // The User's day from when they are ready (`now` the ready time), where they are, and the walking table.
  way: WayArgs;
  // When the answer is made, for the time card.
  now: Date;
  buildings: readonly StudyBuildingDto[];
  // The asker's Friends with their day, for each time card's "+ 같이"; none given, the band has no `others`.
  others?: readonly OtherFriend[];
  hoursOf: (key: string, at: Date) => StudyHours;
}

// The stay when no next item, end set, or close ends it.
const GUESSED_STAY_MINUTES = 3 * 60;

// Another day asked for without a time is read from this time.
const FIRST_CLOCK = '09:00';

// When the User is ready to set out: the time asked from, the first time of another day, or now.
export function readyAt({ date, window }: Pick<StudyInput, 'date' | 'window'>, now: Date): Date {
  if (window.from !== null) {
    const from = onDay(date, window.from);
    return from > now ? from : now;
  }
  return date > koreaDate(now) ? onDay(date, FIRST_CLOCK) : now;
}

interface Fitting {
  building: StudyBuildingDto;
  usable: StudySpaceDto[];
  restricted: StudySpaceDto[];
}

type Judged =
  | { kind: 'plan'; ranked: Ranked }
  | { kind: 'closed'; closed: ClosedPlace; opensAt: string | null }
  | { kind: 'no-time' };

// The buildings in the area, when one is set, holding a space of the kind asked.
function fittingOf({ buildings, input }: StudyPlanArgs): Fitting[] {
  const { kinds } = STUDY_WHATS[input.what];
  return buildings
    .filter(({ place }) => input.area === null || inArea(input.area, place))
    .map((building) => {
      const fit = building.spaces.filter(({ kind }) => kinds.includes(kind));
      return { building, usable: fit.filter(({ usable }) => usable), restricted: fit.filter(({ usable }) => !usable) };
    })
    .filter(({ usable, restricted }) => usable.length + restricted.length > 0);
}

// Open around the clock first, then the latest close.
const closesIn = ({ hours: { opening } }: Spot): number =>
  opening.state === 'open' ? (opening.closesIn ?? Number.POSITIVE_INFINITY) : 0;

// The earliest opening of a building closed then, or its last close, said as its notice.
function closedOf(building: StudyBuildingDto, spots: readonly Spot[], today: boolean): Judged {
  const closings = spots.flatMap(({ hours: { opening } }) => (opening.state === 'closed' ? [opening] : []));
  const [opensAt = null] = closings.flatMap(({ opensAt: at }) => (at === null ? [] : [at])).toSorted();
  const closedAt =
    closings
      .flatMap(({ closedAt: at }) => (at === null ? [] : [at]))
      .toSorted()
      .at(-1) ?? null;
  const closedWords = closedAt === null ? '그 시간엔 닫혀 있어요' : `${closedAt}에 닫아요`;
  const notice =
    opensAt === null
      ? today && closedAt !== null
        ? `오늘 ${closedAt}에 닫았어요`
        : closedWords
      : `${opensAt}에 열어요`;
  return { kind: 'closed', closed: { place: pointOf(building), notices: [notice] }, opensAt };
}

// The end of the stay: the first of the walk on to the next item, the end set, and the close; else three hours.
function endOf(arrival: Date, limits: readonly [Date | null, EndsBy][]): { end: Date; endsBy: EndsBy } {
  const known = limits.flatMap(([at, by]) => (at === null ? [] : [{ end: at, endsBy: by }]));
  const [first] = known.toSorted((a, b) => a.end.getTime() - b.end.getTime());
  return first ?? { end: new Date(arrival.getTime() + GUESSED_STAY_MINUTES * MINUTE_MS), endsBy: 'guess' };
}

function judge({ building, usable }: Fitting, day: StudyDay, args: StudyPlanArgs): Judged {
  const placeId = building.place.id;
  const stay = stayAt({ ...day, start: day.start ?? { placeId, basis: 'timetable' } }, placeId, args.way.travel);
  const spots = usable.map((space) => ({ space, hours: args.hoursOf(space.key, stay.arrival) }));
  const open = spots
    .filter(({ hours }) => hours.opening.state === 'open')
    .toSorted((a, b) => closesIn(b) - closesIn(a));
  const unknown = spots.filter(({ hours }) => hours.opening.state === 'unknown');
  const [best, ...rest] = [...open, ...unknown];
  if (best === undefined) {
    return closedOf(building, spots, koreaDate(stay.arrival) === koreaDate(args.now));
  }
  const { until } = args.input.window;
  const close = closesIn(best);
  const { end, endsBy } = endOf(stay.arrival, [
    [stay.leaveBy, 'next'],
    [until === null ? null : onDay(args.input.date, until), 'until'],
    [
      open.length === 0 || close === Number.POSITIVE_INFINITY
        ? null
        : new Date(stay.arrival.getTime() + close * MINUTE_MS),
      'close',
    ],
  ]);
  const minutes = (end.getTime() - stay.arrival.getTime()) / MINUTE_MS;
  if (minutes <= 0) {
    return { kind: 'no-time' };
  }
  return {
    kind: 'plan',
    ranked: { building, spots: [best, ...rest], open: open.length > 0, stay: { ...stay, minutes }, end, endsBy },
  };
}

const strong = (text: string): AnswerLine[number] => ({ text, strong: true });
const plain = (text: string): AnswerLine[number] => ({ text, strong: false });

const noFit = (...lines: AnswerLine[]): AnswerReply['noPlan'] => ({ reason: 'no-fit', lines });

// Why there is no plan: nothing of the kind there, all of it open only to others, no time before the next item, or all
// of it closed then, with the building that opens first.
function noPlanOf(
  fitting: readonly Fitting[],
  judged: readonly Judged[],
  { input, way, now }: StudyPlanArgs,
): AnswerReply['noPlan'] {
  if (fitting.length === 0) {
    return noFit([plain(input.area === null ? '찾는 공부할 곳이 없어요' : '보는 범위에 공부할 곳이 없어요')]);
  }
  if (judged.length === 0) {
    return noFit([plain('쓸 수 있는 공부할 곳이 없어요')], [plain('학과·대학원 전용인 곳은 흐리게 두었어요')]);
  }
  if (judged.some(({ kind }) => kind === 'no-time')) {
    return noFit([plain('다음 일정 전까지 머물 시간이 없어요')]);
  }
  const when = way.now.getTime() - now.getTime() < MINUTE_MS ? '지금' : '그 시간에';
  const opening = judged
    .flatMap((one) =>
      one.kind === 'closed' && one.opensAt !== null ? [{ place: one.closed.place, at: one.opensAt }] : [],
    )
    .toSorted((a, b) => a.at.localeCompare(b.at));
  const [first] = opening;
  return noFit(
    [plain(`${when} 연 공부할 곳이 없어요`)],
    ...(first === undefined ? [] : [[strong(first.place.label), plain(` ${first.at}에 열어요`)]]),
  );
}

const fadedOf = ({ building, restricted }: Fitting): { dropped: AnswerReply['dropped'][number]; faded: Faded } => {
  const [space] = restricted;
  const openTo = space?.restrictedTo ?? null;
  return {
    dropped: {
      place: pointOf(building),
      reason: openTo === null ? '쓸 수 없는 곳이에요' : `${openTo} 학생만 쓸 수 있어요`,
    },
    faded: { place: pointOf(building), tag: [space?.name, openTo].filter(Boolean).join(' · ') },
  };
};

// By the longest stay, a stay of three hours or more counting as long enough, then by the shorter walk.
function byLongEnough(group: readonly Ranked[]): Ranked[] {
  const keyed = group.map((one) => ({
    one,
    stay: { ...one.stay, minutes: one.stay.minutes >= GUESSED_STAY_MINUTES ? null : one.stay.minutes },
  }));
  return byStay(keyed).map(({ one }) => one);
}

// The time card of an answer without a plan (P05 ticket 67), as a meal's keeps (ticket 65): the User's lane and their
// other Friends, with no walk, from when they are ready to the end they set, else their next item, which the range
// shows, else three hours on.
function noPlanBand({ input, way, now, others }: StudyPlanArgs, { ready, next }: StudyDay): TimeBand {
  const guessed = new Date(ready.getTime() + GUESSED_STAY_MINUTES * MINUTE_MS);
  const end = input.window.until === null ? (next?.start ?? guessed) : onDay(input.date, input.window.until);
  const naming = new WayNaming(way);
  const label = (placeId: string): string => naming.placeLabel(placeId);
  const rows = (from: Date, until: Date): BandRows => ({
    lanes: [{ userId: way.me.userId, name: '나', busy: busyIn(way.me.items, from, until, label) }],
    ...othersWithoutPlace(others, { from, until, label }),
  });
  return windowBand({ start: ready, end }, now, rows, next?.end);
}

export function studyPlanAnswer(args: StudyPlanArgs): AnswerReply {
  const day = studyDayOf(args.way);
  const fitting = fittingOf(args);
  const drops = fitting.filter(({ usable }) => usable.length === 0).map((one) => fadedOf(one));
  const judged = fitting.filter(({ usable }) => usable.length > 0).map((one) => judge(one, day, args));
  const ranked = judged.flatMap((one) => (one.kind === 'plan' ? [one.ranked] : []));
  const ordered = [
    ...byLongEnough(ranked.filter(({ open }) => open)),
    ...byLongEnough(ranked.filter(({ open }) => !open)),
  ];
  const context = { ...args, day, ordered, faded: drops.map(({ faded }) => faded) };
  return {
    input: args.input,
    chips: chipsOf(args, day),
    plans: ordered.map((one, index) => planOf(one, index, context)),
    dropped: drops.map(({ dropped }) => dropped),
    closed: judged.flatMap((one) => (one.kind === 'closed' ? [one.closed] : [])),
    noPlan: ordered.length > 0 ? null : withBand(noPlanOf(fitting, judged, args), () => noPlanBand(args, day)),
    choosable: true,
  };
}
