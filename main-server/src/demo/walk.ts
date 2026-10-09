/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { metresBetween, type Position } from '../common/geometry.js';
import { DEMO_USERS } from './demo-data.js';

// A person's pace, in metres a second.
const WALKING_SPEED = 1.4;

// Where along the line, `metres` from its start, going round again past its end and back past its start. The line is
// the shuttle's loop, which ends where it starts.
export function positionAlong(line: readonly Position[], metres: number): Position {
  const lengths = line.slice(1).map((point, index) => metresBetween(line[index] ?? point, point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let left = ((metres % total) + total) % total;
  for (const [index, length] of lengths.entries()) {
    const from = line[index];
    const to = line[index + 1];
    if (from !== undefined && to !== undefined && left <= length) {
      const share = length === 0 ? 0 : left / length;
      return {
        latitude: from.latitude + (to.latitude - from.latitude) * share,
        longitude: from.longitude + (to.longitude - from.longitude) * share,
      };
    }
    left -= length;
  }
  return line.at(-1) ?? { latitude: 0, longitude: 0 };
}

export function lineLength(line: readonly Position[]): number {
  return line.slice(1).reduce((sum, point, index) => sum + metresBetween(line[index] ?? point, point), 0);
}

// Each demo User with the Master Switch on, spread along the line, every other one walking the other way.
export function walkersAt(line: readonly Position[], elapsedMs: number): { key: string; position: Position }[] {
  const walkers = DEMO_USERS.filter(({ masterSwitchOn }) => masterSwitchOn);
  const total = lineLength(line);
  return walkers.map(({ key }, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    const start = (total * index) / walkers.length;
    return { key, position: positionAlong(line, start + (direction * WALKING_SPEED * elapsedMs) / 1000) };
  });
}

const SEOUL_OFFSET = 9 * 60 * 60 * 1000;

// When the worker collects the operator's vehicles: weekdays from 08:00 to 20:59 in Asia/Seoul.
export function workerCollectsVehicles(now: Date): boolean {
  const seoul = new Date(now.getTime() + SEOUL_OFFSET);
  const weekday = seoul.getUTCDay();
  const hour = seoul.getUTCHours();
  return weekday >= 1 && weekday <= 5 && hour >= 8 && hour <= 20;
}

// A vehicle moves on to the next stop each minute and a half.
const MS_AT_A_STOP = 90 * 1000;

// Two vehicles half a loop apart, as the operator reports them: at a stop's place on its drawing, 5 px below its top.
export function vehiclesAt(
  stops: readonly { left: number; top: number }[],
  now: Date,
): { carId: string; x: number; y: number }[] {
  const step = Math.floor(now.getTime() / MS_AT_A_STOP);
  return [0, Math.floor(stops.length / 2)].flatMap((offset, index) => {
    const stop = stops[(step + offset) % stops.length];
    return stop === undefined ? [] : [{ carId: `DEMO${index + 1}`, x: stop.left, y: stop.top + 5 }];
  });
}
