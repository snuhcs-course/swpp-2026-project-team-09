/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { servedLines } from '../../menus/open-rule.js';
import { shownMinutes } from '../../travel/travel.js';
import {
  type CardFact,
  type ConditionChip,
  type Lookup,
  type LookupAction,
  type MapScene,
  type PlacePoint,
} from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem } from '../free-time/free-time.js';
import { type HandledMeal, mealWindow } from '../free-time/meal-fit.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { placeLabelOf } from '../gathering/place-naming.js';
import { koreaDate } from '../korea-time.js';
import { cardOf, fact } from './card.js';
import { friendHere } from './friend-lookup.js';
import { dishesOf } from './menu-lookup.js';
import { shuttleLine } from './shuttle-lookup.js';
import { atPlace, type Way, type WayArgs, wayOf } from './way.js';
import { GATE_BASIS, hereBasis } from './way-lookup.js';
import { dueWords, gated, WayNaming } from './way-naming.js';

// A pressed building's card: the walk there and how long the User can stay before their next item, today's menu, its
// events, and the Friends the asker's map shows in it, with the buttons for what it holds. Nothing goes to the model.

export interface PlaceEvent {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
}

export interface PlaceArgs {
  placeId: string;
  // The User's way, whatever Place it names: the card's goes to the pressed one.
  way: WayArgs;
  // The Place whose outline holds the User's location; null when none does or the location is unknown. The User is in
  // the pressed Place only then, not when the way merely starts there.
  inside: string | null;
  // The meal served now, with its lines at each Restaurant of the Place; null between the meals.
  meal: { meal: HandledMeal; restaurants: readonly { name: string; lines: readonly MenuLineDto[] }[] } | null;
  // The published events at the Place that have not ended, today.
  events: readonly PlaceEvent[];
  // The Friends, as the Friend view gives them, with their Classes today.
  friends: readonly { friend: FriendView; classes: readonly DayItem[] }[];
}

// The suggestion needs a stay this long or longer.
const MEAL_STAY_MINUTES = 15;

const MEAL_WORDS: Record<HandledMeal, string> = { lunch: '점심', dinner: '저녁' };

export function mealAt(now: Date): HandledMeal | null {
  const date = koreaDate(now);
  const meals: HandledMeal[] = ['lunch', 'dinner'];
  return (
    meals.find((meal) => {
      const { start, end } = mealWindow(date, meal);
      return start <= now && now < end;
    }) ?? null
  );
}

// What the card is made of, in the order it says it.
interface Held {
  title: string;
  point: PlacePoint;
  // The way there, null when where the User sets out from is not known.
  way: Way | null;
  here: boolean;
  next: DayItem | undefined;
  // From the arrival, or now when the User is there, to the next item's start less the walk on to its Place.
  stayMinutes: number | null;
  menus: string[];
  events: PlaceEvent[];
  friends: { fact: CardFact; person: MapScene['people'][number] }[];
}

function stayOf(
  { way, placeId }: PlaceArgs,
  found: Way | null,
  here: boolean,
  next: DayItem | undefined,
): number | null {
  if (found === null || next === undefined) {
    return null;
  }
  const onward =
    next.placeId === null || next.placeId === placeId
      ? 0
      : shownMinutes(way.travel.walkingSeconds(placeId, next.placeId));
  const from = here ? found.now : found.arrival;
  return (next.start.getTime() - from.getTime()) / MINUTE_MS - onward;
}

// A Restaurant with a menu for the meal now, by its main dish.
function menusOf({ meal }: PlaceArgs): string[] {
  return (meal?.restaurants ?? []).flatMap(({ name, lines }) => {
    const [main] = servedLines(lines).length === 0 ? [] : dishesOf(lines);
    return main === undefined ? [] : [`${name} · 오늘 ${main}`];
  });
}

function heldOf(args: PlaceArgs): Held {
  const { placeId, way, events, friends } = args;
  const title = placeLabelOf(way.placeOf(placeId));
  const routed = wayOf({ ...way, fromPlaceId: null, toPlaceId: placeId, by: null });
  const found = typeof routed === 'string' ? null : routed;
  const here = found !== null && args.inside === placeId;
  const next = way.me.items.filter(({ start }) => start > way.now).toSorted(byStart)[0];
  return {
    title,
    point: new WayNaming(way).labelledPoint(placeId, title),
    way: found,
    here,
    next,
    stayMinutes: stayOf(args, found, here, next),
    menus: menusOf(args),
    events: events.toSorted(byStart),
    friends: friends.flatMap(({ friend, classes }) => {
      const shown = friendHere({ now: way.now, friend, classes, nearPlaceId: null, placeOf: way.placeOf }, placeId);
      return shown === null ? [] : [shown];
    }),
  };
}

function stayWords(next: DayItem, minutes: number): string {
  const until = `${clockOf(next.start)} ${next.isClass ? '수업' : '일정'} 전까지`;
  return minutes > 0 ? `${until} ${minutes}분 머물 수 있어요` : `${until} 머물 시간이 없어요`;
}

// "11/18 18:00".
function dayAndClock(at: Date): string {
  const [, month, day] = koreaDate(at).split('-');
  return `${Number(month)}/${Number(day)} ${clockOf(at)}`;
}

// An end on a later day than now, or than the start of an event ahead, is said with its day, and so is that start.
function eventWords({ title, start, end }: PlaceEvent, now: Date): string {
  if (start <= now) {
    if (end === null) {
      return `${title} · 열려 있어요`;
    }
    return `${title} · ${koreaDate(end) === koreaDate(now) ? clockOf(end) : dayAndClock(end)}까지 열려요`;
  }
  if (end === null) {
    return `${title} · ${clockOf(start)}부터`;
  }
  return koreaDate(end) === koreaDate(start)
    ? `${title} · ${clockOf(start)}–${clockOf(end)}`
    : `${title} · ${dayAndClock(start)}–${dayAndClock(end)}`;
}

// A way that starts at the Place itself without the User in it has no walk to state: beside it when the location is
// near, and nothing when the start is only the last item's Place or the gate.
function routeWords({ way, here }: Held): string[] {
  if (here) {
    return ['지금 여기 있어요'];
  }
  if (way === null) {
    return [];
  }
  if (atPlace(way)) {
    return way.start.basis === 'location' ? ['바로 옆이에요'] : [];
  }
  return [`걸어서 ${way.walkMinutes}분 · ${clockOf(way.arrival)} 도착`];
}

function factsOf(held: Held, now: Date): CardFact[] {
  const { next, stayMinutes } = held;
  return [
    ...routeWords(held).map((text) => fact('route', text)),
    ...(next === undefined || stayMinutes === null ? [] : [fact('clock', stayWords(next, stayMinutes))]),
    ...held.menus.map((text) => fact('meal', text)),
    ...held.events.map((event) => fact('flag', eventWords(event, now))),
    ...held.friends.map(({ fact: line }) => line),
  ];
}

// When a Restaurant there serves the meal now, no Friend line is shown, and the stay is 15 minutes or more, or nothing
// follows today.
function noteOf({ menus, friends, next, stayMinutes }: Held, meal: PlaceArgs['meal']): string | null {
  const long = next === undefined || (stayMinutes !== null && stayMinutes >= MEAL_STAY_MINUTES);
  return meal !== null && menus.length > 0 && friends.length === 0 && long
    ? `${MEAL_WORDS[meal.meal]}시간이에요. 여기서 드실래요?`
    : null;
}

function actionsOf({ placeId, way, meal }: PlaceArgs, held: Held): LookupAction[] {
  const date = koreaDate(way.now);
  const actions: LookupAction[] = [];
  if (meal !== null && held.menus.length > 0) {
    const people = [{ userId: way.me.userId, constraints: [] }];
    const input = {
      kind: 'meal' as const,
      date,
      meal: meal.meal,
      people,
      window: { from: null, until: null },
      placeId,
    };
    actions.push({ kind: 'plan', label: '여기서 먹기', input });
  }
  const [first] = held.events;
  if (first !== undefined) {
    const eventIds = held.events.map(({ id }) => id);
    actions.push(
      { kind: 'plan', label: '행사 보기', input: { kind: 'events', date, eventIds } },
      { kind: 'plan', label: '같이 갈 파티', input: { kind: 'quests', globalEventId: first.id, questIds: null } },
    );
  }
  return held.here ? actions : [...actions, { kind: 'guide', to: held.point }];
}

// The way's chips: where the User sets out from, and their next item.
function chipsOf({ way, next }: Held, naming: WayNaming): ConditionChip[] {
  const from: ConditionChip[] = way === null ? [] : [{ kind: 'origin', text: `${naming.from(way)}에서`, userId: null }];
  const until: ConditionChip[] =
    next === undefined
      ? []
      : [{ kind: 'until', text: `${dueWords({ at: next.start, isClass: next.isClass })}까지`, userId: null }];
  return [...from, ...until];
}

// A walk's, with the shuttle's minutes when it is 15 minutes or more; where the way starts when that is the Place, the
// User being in it or not.
function basisOf({ way, here, title }: Held, naming: WayNaming): string[] {
  if (way === null) {
    return [];
  }
  if (!here && atPlace(way) && way.start.basis === 'location') {
    return [`지금 위치가 ${naming.to(way).label} 바로 옆이에요`];
  }
  if (here || atPlace(way)) {
    return [hereBasis(way, naming)];
  }
  const shuttle = shuttleLine(way);
  return [
    `${naming.from(way)}에서 ${title}까지 걸어서 ${way.walkMinutes}분`,
    ...(shuttle === null ? [] : [shuttle]),
    ...(gated(way) ? [GATE_BASIS] : []),
  ];
}

export function placeAnswer(args: PlaceArgs): Lookup {
  const held = heldOf(args);
  const naming = new WayNaming(args.way);
  const { number, name } = args.way.placeOf(args.placeId);
  return {
    kind: 'place',
    chips: chipsOf(held, naming),
    lines: [],
    basis: basisOf(held, naming),
    scene: {
      people: held.friends.map(({ person }) => person),
      places: [{ place: held.point, role: 'pick', tag: null }],
      routes: [],
      flags: [],
    },
    band: null,
    actions: actionsOf(args, held),
    card: cardOf(held.title, number === null ? null : name, factsOf(held, args.way.now), noteOf(held, args.meal)),
  };
}
