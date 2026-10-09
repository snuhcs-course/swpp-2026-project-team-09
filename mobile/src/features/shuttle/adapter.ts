/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ShuttleRoute, ShuttleStop, ShuttleVehicle } from '@/api/shuttle-types';
import { type CardView, cardId } from '@/features/map/adapter';
import { koreaCalendar, koreaMinutes } from '@/korea-time';
import { type MeasuredLine, measureLine, nearestAlong, pointAlong } from './line';

// The shuttle runs on weekdays from 08:00 to 21:00 in Korea's time, in minutes after midnight.
export const SERVICE_HOURS = { from: 8 * 60, until: 21 * 60 } as const;

// A vehicle reported at a new stop travels there along the line in `TRIP_MS`, in steps of `STEP_MS`, each a glide to
// the next point along the line.
export const TRIP_MS = 10_000;
export const STEP_MS = 1000;
const STEPS = TRIP_MS / STEP_MS;

// A vehicle whose report is older than this is removed, checked every `CHECK_EVERY_MS`.
export const STALE_MS = 60_000;
export const CHECK_EVERY_MS = 5000;

export function inService(instant: Date): boolean {
  const { weekday } = koreaCalendar(instant);
  const minutes = koreaMinutes(instant);
  return weekday >= 1 && weekday <= 5 && minutes >= SERVICE_HOURS.from && minutes < SERVICE_HOURS.until;
}

// The route with its line measured, and how far along the line each stop's nearest point is.
export interface ShuttleView {
  route: ShuttleRoute;
  line: MeasuredLine;
  stopAlong: readonly number[];
}

export function toShuttleView(route: ShuttleRoute): ShuttleView {
  const line = measureLine(route.line);
  return { route, line, stopAlong: route.stops.map((stop) => nearestAlong(line, stop)) };
}

// Where a vehicle is on the line: it travels from `from` to `to`, metres along the line, and has taken `step` of the
// trip's steps; a vehicle at its stop has taken all of them. `placed` is a vehicle put where it is without a glide.
export interface Travel {
  carId: string;
  stop: number;
  from: number;
  to: number;
  step: number;
  placed: boolean;
}

export function along({ from, to, step }: Travel): number {
  return from + ((to - from) * step) / STEPS;
}

export function travelling({ step }: Travel): boolean {
  return step < STEPS;
}

export function stepOn(travel: Travel): Travel {
  return travelling(travel) ? { ...travel, step: travel.step + 1, placed: false } : travel;
}

function placedAt(carId: string, stop: number, view: ShuttleView): Travel {
  const at = view.stopAlong[stop] ?? 0;
  return { carId, stop, from: at, to: at, step: STEPS, placed: true };
}

// A vehicle reported at another stop. It travels forward along the loop, past any stops skipped between the two
// reports. A stop more than half the loop ahead counts as behind it, and the vehicle is placed there at once, as it is
// on a phone that asks for less motion.
function moved(last: Travel, stop: number, view: ShuttleView, glide: boolean): Travel {
  const count = view.route.stops.length;
  const ahead = (stop - last.stop + count) % count;
  if (!glide || ahead > count / 2) {
    return placedAt(last.carId, stop, view);
  }
  const { length } = view.line;
  const from = along(last) % length;
  let to = view.stopAlong[stop] ?? 0;
  while (to < from) {
    to += length;
  }
  return { carId: last.carId, stop, from, to, step: 1, placed: false };
}

// The vehicles of a new set, each from where it was: one seen for the first time is placed at its stop, one at the same
// stop keeps its trip, and one missing from the set is gone.
export function nextTravels(
  before: readonly Travel[],
  vehicles: readonly ShuttleVehicle[],
  view: ShuttleView,
  glide: boolean,
): Travel[] {
  return vehicles.flatMap(({ carId, stop: { id } }) => {
    const stop = view.route.stops.findIndex((one) => one.id === id);
    if (stop === -1) {
      return [];
    }
    const last = before.find((travel) => travel.carId === carId);
    if (last === undefined) {
      return [placedAt(carId, stop, view)];
    }
    return [last.stop === stop ? last : moved(last, stop, view, glide)];
  });
}

function nextStop(view: ShuttleView, stop: number): ShuttleStop | undefined {
  const { stops } = view.route;
  return stops[(stop + 1) % stops.length];
}

const KICKER = '셔틀버스 · 교내 순환';
const IN_SERVICE = '운행 중';

function stopCard(view: ShuttleView, stop: ShuttleStop, index: number): CardView {
  return {
    id: cardId.shuttleStop(stop.id),
    kind: 'shuttle-stop',
    mark: { type: 'place', place: 'shuttle' },
    marker: { name: `셔틀버스 · ${stop.name} 정류장`, short: stop.name, count: 0, minutesOld: null },
    subLabel: KICKER,
    title: `${stop.name} 정류장`,
    lines: [{ icon: 'route', text: `다음 정류장 ${nextStop(view, index)?.name ?? ''}` }],
    primary: null,
    secondary: null,
    position: { latitude: stop.latitude, longitude: stop.longitude },
  };
}

function vehicleCard(view: ShuttleView, travel: Travel): CardView {
  const stop = view.route.stops[travel.stop]?.name ?? '';
  return {
    id: cardId.shuttleVehicle(travel.carId),
    kind: 'shuttle-vehicle',
    mark: { type: 'place', place: 'shuttle' },
    marker: { name: `셔틀버스 · ${IN_SERVICE} · ${stop}에 있어요`, short: IN_SERVICE, count: 0, minutesOld: null },
    subLabel: `셔틀버스 · ${IN_SERVICE}`,
    title: '교내 순환 셔틀',
    lines: [{ icon: 'route', text: `${stop}에 있어요 · 다음 정류장 ${nextStop(view, travel.stop)?.name ?? ''}` }],
    primary: { label: '노선 보기', action: 'shuttle-line' },
    secondary: null,
    position: pointAlong(view.line, along(travel)),
    glideMs: travel.placed ? 0 : STEP_MS,
  };
}

// The stops' cards in loop order, then the vehicles'.
export function toShuttleCards(view: ShuttleView, travels: readonly Travel[]): CardView[] {
  return [
    ...view.route.stops.map((stop, index) => stopCard(view, stop, index)),
    ...travels.map((travel) => vehicleCard(view, travel)),
  ];
}
