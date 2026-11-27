/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { koreaDate } from '../korea-time.js';
import { peopleRefusal } from './booking-people.js';
import { seatNameOf } from './app-names.js';
import { type Catalogue, type ClockRange, type EquipmentGroup, type LibrarySpace, seatLabelOf } from './catalogue.js';

export { PARTY_MAX, PARTY_REFUSAL, peopleRefusal } from './booking-people.js';

// What the server checks of a 관정 booking before any card is shown: the booking window, the hours, the duration in
// steps, the seat, the room's equipment, the 사용용도 and the people. Every refusal is listed at once, each worded for
// the reply with its bound. Nothing here knows of seats or bookings: those stay on the phone.

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export interface Refusal {
  field: string;
  reason: string;
  bound?: unknown;
}

// The refusals that say the space is closed then, on a Sunday or outside its hours: the User will not be there.
const closedRefusals = new WeakSet<Refusal>();
function closed(refusal: Refusal): Refusal {
  closedRefusals.add(refusal);
  return refusal;
}
export const saysClosed = (refusal: Refusal): boolean => closedRefusals.has(refusal);

// The refusal of a seat for a day after today: the library books seats on their day only (getSectorList: DAY_TO 0).
const sameDayRefusals = new WeakSet<Refusal>();
export const saysSameDayOnly = (refusal: Refusal): boolean => sameDayRefusals.has(refusal);

export interface BookingRequest {
  date: string;
  start?: string | undefined;
  minutes?: number | undefined;
  end?: string | undefined;
  seat?: string | undefined;
  equipment?: string | undefined;
  useDesc?: string | undefined;
  // The User and the companions; left out when they could not be counted, which is refused on its own.
  people?: number | undefined;
}

export interface CheckedBooking {
  date: string;
  start: string;
  minutes: number;
  seat: string | null;
  equipment: EquipmentGroup | null;
  // Null when the space takes none, or when the request did not say: the card then asks.
  useDesc: string | null;
}

export type Checked = { refusals: Refusal[] } | { booking: CheckedBooking };

// "6시간", "1시간 30분", "30분".
export function durationWords(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest}분`;
  }
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

// What the reply calls a space of this kind.
export function kindWord(space: LibrarySpace): string {
  if (space.unit === 'seat') {
    return '열람실';
  }
  return space.kind === 'group-study-room' ? '그룹스터디룸' : space.name;
}

export function minutesOfClock(clock: string): number {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return hours * 60 + minutes;
}

export function clockOfMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

// The earliest start a booking can have now: the next 30-minute mark, or now when it is one. As minutes of the day in
// Korea.
export function earliestStartMinutes(now: Date, stepMinutes: number): number {
  const korea = new Date(now.getTime() + 9 * 60 * MINUTE_MS);
  const minutes = korea.getUTCHours() * 60 + korea.getUTCMinutes() + (korea.getUTCSeconds() > 0 ? 1 : 0);
  return Math.ceil(minutes / stepMinutes) * stepMinutes;
}

// The last day the space can be booked for now: today for a seat, today + 3 days for a room.
export function lastBookableDate(space: LibrarySpace, now: Date): string {
  return addDays(koreaDate(now), space.bookingAheadDays);
}

// A room request made before the window holds its date waits for it, up to this many days ahead.
export const WAIT_DAYS_AHEAD = 14;

// Why a date cannot be booked, or null when it can. A request that waits for the window keeps a date after it.
export function windowRefusal(space: LibrarySpace, date: string, now: Date, waitsForWindow = false): Refusal | null {
  const today = koreaDate(now);
  const last = lastBookableDate(space, now);
  if (date < today) {
    return { field: 'date', reason: '지난 날짜는 예약할 수 없어요', bound: today };
  }
  if (waitsForWindow && date > addDays(today, WAIT_DAYS_AHEAD)) {
    const reason = `${kindWord(space)}은 ${WAIT_DAYS_AHEAD}일 뒤까지만 미리 정해 둘 수 있어요`;
    return { field: 'date', reason, bound: addDays(today, WAIT_DAYS_AHEAD) };
  }
  if (date > last && !waitsForWindow && space.bookingAheadDays === 0) {
    const refusal = { field: 'date', reason: `${kindWord(space)}은 당일만 예약할 수 있어요`, bound: last };
    sameDayRefusals.add(refusal);
    return refusal;
  }
  if (date > last && !waitsForWindow) {
    const reason = `${kindWord(space)}은 ${space.bookingAheadDays}일 뒤까지만 예약할 수 있어요`;
    return { field: 'date', reason, bound: last };
  }
  if (space.closedOnSunday && new Date(`${date}T00:00:00Z`).getUTCDay() === 0) {
    return closed({ field: 'date', reason: `${seatNameOf(space) ?? space.name}은 일요일에 열지 않아요` });
  }
  return null;
}

// The space asked for today after its closing (P05 ticket 57): nothing of today can be seen or booked there, and it
// opens again on the next day. Null before its closing, on another day, or without its hours.
export function closedTodayRefusal(space: LibrarySpace, date: string, now: Date): Refusal | null {
  const { hours } = space;
  if (hours === null || date !== koreaDate(now) || earliestStartMinutes(now, 1) < minutesOfClock(hours.close)) {
    return null;
  }
  return closed({ field: 'date', reason: `${kindWord(space)}은 오늘 ${hours.close}에 닫았어요`, bound: hours });
}

function hoursRefusal(space: LibrarySpace, hours: ClockRange, start: number, end: number): Refusal | null {
  if (start >= minutesOfClock(hours.open) && end <= minutesOfClock(hours.close)) {
    return null;
  }
  return closed({
    field: 'start',
    reason: `${kindWord(space)}은 ${hours.open}–${hours.close}에 이용할 수 있어요`,
    bound: hours,
  });
}

export function durationRefusal(space: LibrarySpace, minutes: number): Refusal | null {
  const { minMinutes, maxMinutes, stepMinutes } = space;
  if (minutes % stepMinutes !== 0) {
    return { field: 'minutes', reason: `${stepMinutes}분 단위로 예약할 수 있어요`, bound: stepMinutes };
  }
  if (minutes < minMinutes) {
    return { field: 'minutes', reason: `최소 ${durationWords(minMinutes)}이에요`, bound: minMinutes };
  }
  if (minutes > maxMinutes) {
    return {
      field: 'minutes',
      reason: `${kindWord(space)}은 최대 ${durationWords(maxMinutes)}이에요`,
      bound: maxMinutes,
    };
  }
  return null;
}

function seatRefusal(space: LibrarySpace, seat: string): Refusal {
  const { seatLabels } = space;
  const range =
    seatLabels === null
      ? [...space.rooms.keys()].join(', ')
      : `${seatLabels.prefix}${String(seatLabels.from).padStart(seatLabels.digits, '0')}–${seatLabels.prefix}${String(seatLabels.to).padStart(seatLabels.digits, '0')}`;
  return { field: 'seat', reason: `${seat}은 ${seatNameOf(space) ?? space.name}의 자리가 아니에요`, bound: range };
}

function equipmentOf(space: LibrarySpace, equipment: string): EquipmentGroup | undefined {
  const asked = equipment.trim().toLowerCase();
  return space.equipmentGroups.find(({ id }) => id.toLowerCase() === asked);
}

// The request's time, from start and minutes or end, with what is missing or wrong about it.
function timeOf(
  space: LibrarySpace,
  { date, start, minutes, end }: BookingRequest,
  now: Date,
): { refusals: Refusal[]; start?: number; minutes?: number } {
  const refusals: Refusal[] = [];
  if (start === undefined) {
    refusals.push({ field: 'start', reason: '몇 시부터 예약할지 알려 주세요' });
  }
  if (minutes === undefined && end === undefined) {
    refusals.push({ field: 'minutes', reason: '몇 시간 또는 몇 시까지 예약할지 알려 주세요' });
  }
  if (start === undefined) {
    return { refusals };
  }
  const from = minutesOfClock(start);
  const length = minutes ?? (end === undefined ? undefined : minutesOfClock(end) - from);
  if (from % space.stepMinutes !== 0) {
    refusals.push({ field: 'start', reason: `시작 시간은 ${space.stepMinutes}분 단위예요`, bound: space.stepMinutes });
  }
  const earliest = earliestStartMinutes(now, space.stepMinutes);
  if (date === koreaDate(now) && from < earliest) {
    refusals.push({
      field: 'start',
      reason: `이미 지난 시간이에요. 오늘은 ${clockOfMinutes(earliest)}부터 예약할 수 있어요`,
      bound: clockOfMinutes(earliest),
    });
  }
  if (length === undefined) {
    return { refusals, start: from };
  }
  if (length <= 0) {
    refusals.push({ field: 'end', reason: '끝나는 시간이 시작 시간보다 늦어야 해요' });
    return { refusals, start: from };
  }
  const duration = durationRefusal(space, length);
  if (duration !== null) {
    refusals.push(duration);
  }
  const hours = space.hours === null ? null : hoursRefusal(space, space.hours, from, from + length);
  if (hours !== null) {
    refusals.push(hours);
  }
  return { refusals, start: from, minutes: length };
}

function equipmentRefusal(space: LibrarySpace): Refusal {
  const options = space.equipmentGroups.map(({ id }) => id);
  return {
    field: 'equipment',
    reason: options.length === 0 ? `${space.name}은 방을 장비로 고르지 않아요` : `${space.name}에는 그런 방이 없어요`,
    bound: options,
  };
}

// Checks a booking of an implemented space. Each wrong or missing field gives a refusal, all of them at once.
export function checkBooking(
  catalogue: Catalogue,
  space: LibrarySpace,
  request: BookingRequest,
  now: Date,
  waitsForWindow = false,
): Checked {
  const window = windowRefusal(space, request.date, now, waitsForWindow);
  // Nothing else of a seat for a later day is asked about: any answer would be refused for the day in turn.
  if (window !== null && saysSameDayOnly(window)) {
    return { refusals: [window] };
  }
  const time = timeOf(space, request, now);
  const refusals = [...(window === null ? [] : [window]), ...time.refusals];
  const seat = request.seat === undefined ? null : seatLabelOf(space, request.seat);
  if (request.seat !== undefined && seat === null) {
    refusals.push(seatRefusal(space, request.seat));
  }
  const equipment = request.equipment === undefined ? undefined : equipmentOf(space, request.equipment);
  if (request.equipment !== undefined && equipment === undefined) {
    refusals.push(equipmentRefusal(space));
  }
  // A seat takes no 사용용도, so one given for it is left out.
  const options = space.useDescOptions;
  const useDesc = options === null ? null : (request.useDesc ?? null);
  if (useDesc !== null && options !== null && !options.includes(useDesc)) {
    refusals.push({ field: 'useDesc', reason: `사용 용도는 ${options.join(', ')} 중 하나예요`, bound: options });
  }
  const people = request.people === undefined ? null : peopleRefusal(catalogue, space, request.people);
  if (people !== null) {
    refusals.push(people);
  }
  if (refusals.length > 0 || time.start === undefined || time.minutes === undefined) {
    return { refusals };
  }
  return {
    booking: {
      date: request.date,
      start: clockOfMinutes(time.start),
      minutes: time.minutes,
      seat,
      equipment: equipment ?? null,
      useDesc,
    },
  };
}
