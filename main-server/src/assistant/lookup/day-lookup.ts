/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Weekday } from '../../generated/prisma/client.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { shownMinutes, type TravelProvider } from '../../travel/travel.js';
import { type AnswerLine, type Lookup, type LookupAction, type MapScene } from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem, weekdayOf } from '../free-time/free-time.js';
import { MINUTE_MS, minutesBetween } from '../gathering/gathering.js';
import { PlaceNaming } from '../gathering/place-naming.js';
import { koreaTime } from '../korea-time.js';
import { type KeptQuest } from '../../quests/kept-quests.js';
import { keptAsked, keptDto, keptStep, keptWords } from './day-quests.js';
import { part, REMIND_WALK_MINUTES } from './way-naming.js';

// A day's Classes drawn on the map: numbered in order at their buildings, the walks between them, the Free Time
// between them, and a leave-by notification for the first walk still ahead. A Class is its time and building, never its
// course name, so that the answer could be shown to anyone looking at the phone. Only the words are sent to the model.

export interface DayArgs {
  // YYYY-MM-DD in Korea.
  date: string;
  now: Date;
  me: { userId: string; items: readonly DayItem[] };
  travel: Pick<TravelProvider, 'walkingSeconds'>;
  placeOf: (placeId: string) => PlaceDto;
  // The User's Quests of the day, and those asked for by id: with ids, only those are drawn, and no Class.
  kept?: readonly KeptQuest[];
  asked?: readonly string[];
}

// What the model is given: clock times, the buildings' labels, and minutes.
export interface DayWords {
  date: string;
  classes: { start: string; end: string; place: string | null }[];
  freeMinutes: number[];
  walkMinutes: number[];
  quests: object[];
}

export type DayAnswer =
  | { result: 'found'; lookup: Lookup; words: DayWords }
  | { result: 'none'; reason: 'no-classes' | 'not-kept' | 'ambiguous' };

// A Class or a Quest of the day, as the map numbers them in order.
interface Entry {
  start: Date;
  end: Date | null;
  placeId: string | null;
  // The step's words: a Class's building, a Quest's kind and place.
  text: string;
}

const WEEKDAY_WORDS: Record<Weekday, string> = {
  monday: '월',
  tuesday: '화',
  wednesday: '수',
  thursday: '목',
  friday: '금',
  saturday: '토',
  sunday: '일',
};

const NO_PLACE = '장소 없음';

// Free Time this long or longer is said in hours: "70분", but "3시간 10분".
const HOURS_FROM_MINUTES = 120;

interface Walk {
  fromPlaceId: string;
  toPlaceId: string;
  // The Class walked to.
  to: DayItem;
  minutes: number;
}

export function durationWords(minutes: number): string {
  if (minutes < HOURS_FROM_MINUTES) {
    return `${minutes}분`;
  }
  const rest = minutes % 60;
  return rest === 0 ? `${minutes / 60}시간` : `${Math.floor(minutes / 60)}시간 ${rest}분`;
}

function dateWords(date: string): string {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 ${WEEKDAY_WORDS[weekdayOf(date)]}요일`;
}

const entrySpan = ({ start, end }: Entry): string =>
  end === null ? clockOf(start) : `${clockOf(start)}–${clockOf(end)}`;

function gapsOf(classes: readonly DayItem[]): number[] {
  return classes.slice(1).flatMap((next, index) => {
    const minutes = minutesBetween(classes[index]?.end ?? next.start, next.start);
    return minutes > 0 ? [minutes] : [];
  });
}

function walksOf(classes: readonly DayItem[], travel: DayArgs['travel']): Walk[] {
  return classes.slice(1).flatMap((to, index) => {
    const fromPlaceId = classes[index]?.placeId ?? null;
    const toPlaceId = to.placeId;
    if (fromPlaceId === null || toPlaceId === null || fromPlaceId === toPlaceId) {
      return [];
    }
    return [{ fromPlaceId, toPlaceId, to, minutes: shownMinutes(travel.walkingSeconds(fromPlaceId, toPlaceId)) }];
  });
}

function linesOf(
  date: string,
  { classes, quests }: { classes: readonly DayItem[]; quests: readonly KeptQuest[] },
  gaps: readonly number[],
  walks: readonly Walk[],
): AnswerLine[] {
  const counts = [
    ...(classes.length > 0 || quests.length === 0 ? [`수업 ${classes.length}개`] : []),
    ...(quests.length > 0 ? [`일정 ${quests.length}개`] : []),
  ];
  const lines: AnswerLine[] = [[part(`${dateWords(date)} `), part(counts.join(' · '), true)]];
  if (gaps.length > 0) {
    lines.push([part(`빈 시간 ${gaps.map((minutes) => durationWords(minutes)).join(', ')}`)]);
  }
  if (walks.length > 0) {
    lines.push([part(`수업 사이 걸어서 ${walks.map(({ minutes }) => `${minutes}분`).join(', ')}`)]);
  }
  return lines;
}

function sceneOf(entries: readonly Entry[], walks: readonly Walk[], userId: string, naming: PlaceNaming): MapScene {
  return {
    people: [],
    places: entries.flatMap((entry, index) =>
      entry.placeId === null
        ? []
        : [
            {
              place: naming.placePoint(entry.placeId),
              role: 'next' as const,
              tag: `${entrySpan(entry)} · ${entry.text}`,
              order: index + 1,
            },
          ],
    ),
    routes: walks.map(({ fromPlaceId, toPlaceId, minutes }) => ({
      userId,
      role: 'next' as const,
      from: naming.position(fromPlaceId),
      to: naming.position(toPlaceId),
      minutes,
    })),
    flags: [],
  };
}

// A leave-by notification for the first walk of 5 minutes or more whose leave-by time is later than now, rounded up to
// the minute.
function remindOf(walks: readonly Walk[], now: Date, naming: PlaceNaming): LookupAction[] {
  const ready = Math.ceil(now.getTime() / MINUTE_MS) * MINUTE_MS;
  const leaveBy = ({ to, minutes }: Walk): Date => new Date(to.start.getTime() - minutes * MINUTE_MS);
  const walk = walks.find((each) => each.minutes >= REMIND_WALK_MINUTES && leaveBy(each).getTime() > ready);
  if (walk === undefined) {
    return [];
  }
  const { to, toPlaceId, minutes } = walk;
  const text = `지금 나서면 ${clockOf(to.start)} 수업에 맞아요 · ${naming.placeLabel(toPlaceId)}까지 걸어서 ${minutes}분`;
  return [{ kind: 'remind', at: koreaTime(leaveBy(walk)), text }];
}

// The Classes and Quests of the day in order, each with its step's words.
function entriesOf(
  classes: readonly DayItem[],
  quests: readonly KeptQuest[],
  placeWords: (placeId: string | null) => string | null,
): Entry[] {
  return [
    ...classes.map(({ start, end, placeId }) => ({ start, end, placeId, text: placeWords(placeId) ?? NO_PLACE })),
    ...quests.map((quest) => ({
      start: quest.start,
      end: quest.end,
      placeId: quest.placeId ?? null,
      text: keptStep(quest),
    })),
  ].toSorted((one, other) => one.start.getTime() - other.start.getTime());
}

export function dayAnswer({ date, now, me, travel, placeOf, kept = [], asked }: DayArgs): DayAnswer {
  const focused = asked !== undefined && asked.length > 0;
  const { quests, ambiguous } = keptAsked(kept, asked);
  if (ambiguous) {
    return { result: 'none', reason: 'ambiguous' };
  }
  const classes = focused ? [] : me.items.filter(({ isClass }) => isClass).toSorted(byStart);
  if (classes.length === 0 && quests.length === 0) {
    return { result: 'none', reason: focused ? 'not-kept' : 'no-classes' };
  }
  const naming = new PlaceNaming(placeOf);
  const placeWords = (placeId: string | null): string | null => (placeId === null ? null : naming.placeLabel(placeId));
  const keptPlace = (quest: KeptQuest): string | null => placeWords(quest.placeId) ?? quest.placeLabel;
  const entries = entriesOf(classes, quests, placeWords);
  const gaps = gapsOf(classes);
  const walks = walksOf(classes, travel);
  const lookup: Lookup = {
    kind: 'day',
    chips: [],
    lines: linesOf(date, { classes, quests }, gaps, walks),
    basis: walks.map(
      ({ fromPlaceId, toPlaceId, minutes }) =>
        `${naming.placeLabel(fromPlaceId)} → ${naming.placeLabel(toPlaceId)} 걸어서 ${minutes}분`,
    ),
    scene: sceneOf(entries, walks, me.userId, naming),
    band: null,
    actions: remindOf(walks, now, naming),
    steps: entries.map((entry) => ({ at: entrySpan(entry), text: entry.text })),
    ...(focused ? { kept: quests.map((quest) => keptDto(quest, keptPlace(quest), placeOf)) } : {}),
  };
  return {
    result: 'found',
    lookup,
    words: {
      date,
      classes: classes.map(({ start, end, placeId }) => ({
        start: clockOf(start),
        end: clockOf(end),
        place: placeWords(placeId),
      })),
      freeMinutes: gaps,
      walkMinutes: walks.map(({ minutes }) => minutes),
      quests: quests.map((quest) => keptWords(quest, keptPlace(quest))),
    },
  };
}
