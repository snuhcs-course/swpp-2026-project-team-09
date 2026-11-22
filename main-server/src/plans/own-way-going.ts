/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  DETOUR_MINUTES,
  type GatheringTravel,
  MINUTE_MS,
  type ShuttleStops,
} from '../assistant/gathering/gathering.js';
import { atSettingOut, legOf, walkingMinutes as minutes } from '../assistant/gathering/gathering-travel.js';
import { type TravelMode } from '../travel/travel.js';
import { type Gathered, type TimedStep } from './own-way.js';

// How a person goes to a Quest's gathering, by the rules the Plan was made by: through the Merging Point on foot when it
// lies on their way, they can be there by its start, and their own way by the shuttle would not get them there sooner;
// else straight, by the shuttle of that day and hour when it is 3 minutes faster, as late as still has them there at
// the start, or as soon as they are ready.

export interface OwnLeg {
  from: string;
  to: string;
  minutes: number;
  by: TravelMode;
  shuttle: ShuttleStops | null;
}

export interface Going {
  leaveAt: Date;
  arriveAt: Date;
  legs: OwnLeg[];
  // Their Merging Point, when they take it.
  meeting: TimedStep | null;
}

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

const onFootLeg = (from: string, to: string, travel: GatheringTravel): OwnLeg => ({
  from,
  to,
  minutes: minutes(from, to, travel),
  by: 'walk',
  shuttle: null,
});

function throughMeeting(
  from: string,
  readyAt: Date,
  { destination, meeting }: Gathered,
  travel: GatheringTravel,
): Going | null {
  if (meeting === null || from === meeting.placeId || from === destination.placeId) {
    return null;
  }
  const toMeeting = onFootLeg(from, meeting.placeId, travel);
  const onward = onFootLeg(meeting.placeId, destination.placeId, travel);
  const onTheWay = toMeeting.minutes + onward.minutes - minutes(from, destination.placeId, travel) <= DETOUR_MINUTES;
  if (!onTheWay || plusMinutes(readyAt, toMeeting.minutes) > meeting.start) {
    return null;
  }
  const arriveAt = plusMinutes(meeting.start, onward.minutes);
  const own = legOf(from, destination.placeId, travel, readyAt);
  if (own.by === 'shuttle' && plusMinutes(readyAt, own.minutes) < arriveAt) {
    return null;
  }
  return { leaveAt: plusMinutes(meeting.start, -toMeeting.minutes), arriveAt, legs: [toMeeting, onward], meeting };
}

export function goingFrom(from: string, readyAt: Date, gathered: Gathered, travel: GatheringTravel): Going {
  const met = throughMeeting(from, readyAt, gathered, travel);
  if (met !== null) {
    return met;
  }
  const { destination } = gathered;
  const atReady = legOf(from, destination.placeId, travel, readyAt);
  const settled = atSettingOut(from, destination.placeId, travel, atReady, destination.start);
  const onTime = plusMinutes(destination.start, -settled.minutes);
  const leg = onTime >= readyAt ? settled : atReady;
  const late = onTime < readyAt;
  const { minutes: count, by, shuttle } = leg;
  return {
    leaveAt: late ? readyAt : onTime,
    arriveAt: late ? plusMinutes(readyAt, count) : destination.start,
    legs: [{ from, to: destination.placeId, minutes: count, by, shuttle }],
    meeting: null,
  };
}
