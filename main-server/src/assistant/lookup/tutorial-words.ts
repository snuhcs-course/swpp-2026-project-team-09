/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type TravelProvider } from '../../travel/travel.js';
import { type TutorialPlace, type TutorialVisit } from '../../tutorial/tutorial-content.js';
import { type AnswerLine, type ConditionChip, type Lookup, type MapScene, type PlacePoint } from '../dto/answer.dto.js';
import { clockOf, type DayItem } from '../free-time/free-time.js';
import { type PlaceNaming } from '../gathering/place-naming.js';
import { NO_NEXT_CLOSING, type Order, STOP_MINUTES, STOPS_MAX, type Visit } from './tutorial-order.js';
import { type WayArgs, type WayStart } from './way.js';
import { part } from './way-naming.js';

// The words and the map of the Tutorial Quests in order: the Places numbered with when each quest is done there, the
// walks between them and on to the next item; in the card, when all are done and the quests as steps; in the basis,
// what decides the order and when each quest can be done. Nothing here marks a quest done.

export interface OpenQuest {
  key: string;
  title: string;
  places: readonly TutorialPlace[];
  visit: TutorialVisit | null;
}

export interface TutorialArgs {
  now: Date;
  me: { userId: string; name: string; items: readonly DayItem[] };
  location: WayArgs['location'];
  // The Place the User named to set out from.
  fromPlaceId: string | null;
  gatePlaceId: string;
  // In the content's order.
  quests: readonly OpenQuest[];
  // The Place of a quest's place: the Place of its number, or the one its point is in or near.
  placeIdOf: (place: TutorialPlace) => string | null;
  travel: Pick<TravelProvider, 'walkingSeconds'>;
  placeOf: (placeId: string) => PlaceDto;
}

export interface LeftWords {
  quest: string;
  reason: string;
  // What says when it can be done.
  when: string | null;
}

// What the model is given: clock times, the quests' titles, Places by name and floor, and minutes.
export interface TutorialWords {
  from: string;
  stops: { at: string; quest: string; place: string; walkMinutes: number; when: string | null }[];
  doneAt: string;
  next: { at: string; isClass: boolean; place: string | null; walkMinutes: number | null } | null;
  minutesPerStop: number;
  leftOut: LeftWords[];
  online: string[];
}

export type LeftReason = Order['left'][number]['reason'] | 'unmapped';

// Where a quest is done: the Place walked to, where it is drawn, and how a step calls it.
export interface Located {
  quest: OpenQuest;
  placeId: string;
  at: Position;
  words: string;
}

export interface Next {
  item: DayItem;
  placeId: string | null;
  // "17:00 수업", or the clock time of an item that is not a Class.
  due: string;
  label: string | null;
}

export interface Drawn {
  args: TutorialArgs;
  start: WayStart;
  visits: { visit: Visit; located: Located }[];
  doneAt: Date;
  order: Order;
  left: { quest: OpenQuest; reason: LeftReason }[];
  online: string[];
  next: Next | null;
  naming: PlaceNaming;
}

const COUNTS = ['한', '두', '세', '네', '다섯'];

const countWord = (count: number): string => COUNTS[count - 1] ?? String(count);

const MODEL_REASONS: Record<LeftReason, (next: Next | null) => string> = {
  closed: () => 'closed when the User could be there',
  'no-time': (next) =>
    next === null ? `no time before ${NO_NEXT_CLOSING}, when the order ends` : 'no time before the next item',
  more: () => 'at most five are ordered at once',
  unmapped: () => 'its place is not on the walking table',
};

const dueOf = (next: Next | null): string => next?.due ?? NO_NEXT_CLOSING;

const LEFT_BASIS: Record<LeftReason, (next: Next | null) => string> = {
  closed: (next) => `${dueOf(next)} 전에는 열지 않아 뺐어요`,
  'no-time': (next) => `${dueOf(next)} 전에 시간이 모자라 뺐어요`,
  more: () => `한 번에 ${countWord(STOPS_MAX)} 곳까지라 뺐어요`,
  unmapped: () => '걸어서 몇 분인지 몰라 뺐어요',
};

export const leftWords = (quest: OpenQuest, reason: LeftReason, next: Next | null): LeftWords => ({
  quest: quest.title,
  reason: MODEL_REASONS[reason](next),
  when: noteOf(quest),
});

export const noteOf = ({ visit }: OpenQuest): string | null => visit?.note ?? null;

const pointOf = ({ placeId, words, at }: Located): PlacePoint => ({ placeId, label: words, ...at });

function linesOf({ visits, doneAt, next }: Drawn): AnswerLine[] {
  return [
    [part(`${countWord(visits.length)} 곳을 돌면 `), part(clockOf(doneAt), true), part('에 끝나요')],
    next === null
      ? [part('오늘 남은 일정이 없어요')]
      : [part('다음은 '), part(next.due, true), ...(next.label === null ? [] : [part(` · ${next.label}`)])],
  ];
}

// What decides the order, the minutes each stop is given, when each quest ordered can be done, the quests left out with
// why and when they can be done, and those done online.
function basisOf({ visits, order, left, online, next }: Drawn): string[] {
  const onward = next === null || next.label === null ? '' : `${next.label}까지 `;
  return [
    `가장 일찍 끝나는 순서예요 · ${onward}모두 걸어서 ${order.walkMinutes}분`,
    `한 곳에 ${STOP_MINUTES}분씩 잡았어요`,
    ...visits.flatMap(({ located }) => noteOf(located.quest) ?? []),
    ...left.flatMap(({ quest, reason }) => {
      const line = `${quest.title} · ${LEFT_BASIS[reason](next)}`;
      const note = noteOf(quest);
      return note === null ? [line] : [line, note];
    }),
    ...(online.length === 0 ? [] : [`${online.join(', ')} · 온라인으로 할 수 있어요`]),
  ];
}

function meOf({ args, start, naming }: Drawn): MapScene['people'][number] {
  const { me, location } = args;
  const here = start.basis === 'location' ? (location?.at ?? null) : null;
  return {
    userId: me.userId,
    name: me.name,
    me: true,
    at: here ?? naming.position(start.placeId),
    source: here === null ? 'timetable' : 'exact',
    tag: '나',
  };
}

function routesOf({ args, start, visits, order, next, naming }: Drawn): MapScene['routes'] {
  const { userId } = args.me;
  let from = naming.position(start.placeId);
  const routes: MapScene['routes'] = [];
  for (const { visit, located } of visits) {
    if (visit.walkMinutes > 0) {
      routes.push({ userId, role: 'me', from, to: located.at, minutes: visit.walkMinutes });
    }
    from = located.at;
  }
  if (next !== null && next.placeId !== null && order.onwardMinutes !== null && order.onwardMinutes > 0) {
    routes.push({ userId, role: 'next', from, to: naming.position(next.placeId), minutes: order.onwardMinutes });
  }
  return routes;
}

function sceneOf(drawn: Drawn): MapScene {
  const { visits, next, naming } = drawn;
  const stops = visits.map(({ visit, located }, index) => ({
    place: pointOf(located),
    role: 'pick' as const,
    tag: `${clockOf(visit.start)} ${located.quest.title}`,
    order: index + 1,
  }));
  const after =
    next === null || next.placeId === null
      ? []
      : [
          {
            place: naming.placePoint(next.placeId),
            role: 'next' as const,
            tag: `${next.due} · ${naming.placeLabel(next.placeId)}`,
          },
        ];
  return { people: [meOf(drawn)], places: [...stops, ...after], routes: routesOf(drawn), flags: [] };
}

export function wordsOf(drawn: Drawn, from: string, leftOut: LeftWords[]): TutorialWords {
  const { visits, doneAt, order, next, online } = drawn;
  return {
    from,
    stops: visits.map(({ visit, located }) => ({
      at: clockOf(visit.start),
      quest: located.quest.title,
      place: located.words,
      walkMinutes: visit.walkMinutes,
      when: noteOf(located.quest),
    })),
    doneAt: clockOf(doneAt),
    next:
      next === null
        ? null
        : {
            at: clockOf(next.item.start),
            isClass: next.item.isClass,
            place: next.label,
            walkMinutes: order.onwardMinutes,
          },
    minutesPerStop: STOP_MINUTES,
    leftOut,
    online,
  };
}

// From where the User sets out and until their next item; route guidance to the first stop.
export function lookupOf(drawn: Drawn, from: string, first: Located): Lookup {
  const { visits, next } = drawn;
  const chips: ConditionChip[] = [{ kind: 'origin', text: `${from}에서`, userId: null }];
  if (next !== null) {
    chips.push({ kind: 'until', text: `${next.due}까지`, userId: null });
  }
  return {
    kind: 'tutorial',
    chips,
    lines: linesOf(drawn),
    basis: basisOf(drawn),
    scene: sceneOf(drawn),
    band: null,
    actions: [{ kind: 'guide', to: pointOf(first) }],
    steps: visits.map(({ visit, located }) => ({
      at: clockOf(visit.start),
      text: `${located.words} · ${located.quest.title}`,
    })),
  };
}
