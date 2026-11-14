/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type AnswerLine, type MapScene, type PlacePoint } from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { PlaceNaming } from '../gathering/place-naming.js';
import { type Way, type WayArgs } from './way.js';

// How a way's start, Place, and shuttle stops are called and where they are, shared by the words of a walk and of
// the shuttle.

export const part = (text: string, strong = false): AnswerLine[number] => ({ text, strong });

// The leave-by notification of a way taken alone is sent only for a way this long or longer.
export const REMIND_WALK_MINUTES = 5;

const GATE = '정문';

export class WayNaming extends PlaceNaming {
  constructor(private readonly args: WayArgs) {
    super(args.placeOf);
  }

  from({ start }: Way): string {
    return start.basis === 'gate' ? GATE : this.placeLabel(start.placeId);
  }

  // The Place gone to, by its name and number when it has both, since the User may have asked by either; the Place of
  // their next item as their Timetable calls it.
  to({ toPlaceId, next }: Way): { name: string; label: string } {
    const { number, name } = this.args.placeOf(toPlaceId);
    if (next !== null || number === null) {
      return { name, label: this.placeLabel(toPlaceId) };
    }
    return { name, label: `${name}(${number}동)` };
  }

  // The User where they are when that is the start, else at the start's Place.
  me({ start }: Way): MapScene['people'][number] {
    const { me, location } = this.args;
    const here = start.basis === 'location' ? (location?.at ?? null) : null;
    return {
      userId: me.userId,
      name: me.name,
      me: true,
      at: here ?? this.position(start.placeId),
      source: here === null ? 'timetable' : 'exact',
      tag: '나',
    };
  }

  // A stop is a point of the map, not a Place: its point holds the stop's id.
  stopPoint(name: string): PlacePoint {
    const { id, latitude, longitude } = this.stop(name);
    return { placeId: id, label: `${name} 정류장`, latitude, longitude };
  }

  stopPosition(name: string): Position {
    const { latitude, longitude } = this.stop(name);
    return { latitude, longitude };
  }

  private stop(name: string): WayArgs['shuttle']['stops'][number] {
    const found = this.args.shuttle.stops.find((stop) => stop.name === name);
    if (found === undefined) {
      throw new Error(`The shuttle route has no stop ${name}`);
    }
    return found;
  }
}

type Deadline = NonNullable<Way['deadline']>;

export const gated = ({ start }: Way): boolean => start.basis === 'gate';

// "13:00 수업" for a Class, else the clock time.
export const dueWords = ({ at, isClass }: Deadline): string => (isClass ? `${clockOf(at)} 수업` : clockOf(at));
