/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { type ClockRange, type EquipmentGroup, type LibrarySpace, type SpaceUnit } from './catalogue.js';

// The shape of kwanjeong-spaces.yaml and how each entry becomes a space: a space's own value wins over its kind's
// common one, and the catalogue's texts are read by their first range ("7–10", "09:00–23:00 …", "0:30–3:00 …").

const SEAT_KINDS = new Set(['reading-room', 'notebook-zone', 'grad-reading-room']);

const CLOCK_RANGE = /(\d{1,2}):(\d{2})\s*–\s*(\d{1,2}):(\d{2})/u;
const NUMBER_RANGE = /^(\d+)\s*–\s*(\d+)$/u;
const SEAT_RANGE = /^([A-Z]?)(\d+)\s*–\s*[A-Z]?(\d+)/u;

const text = z.string().trim().min(1);
const count = z.int().min(0);

const commonSchema = z.object({
  duration: text.optional(),
  hours: text.optional(),
  useDesc: z.array(text).nullable().optional(),
  needs_pledge: z.boolean().optional(),
  pledge_text: text.optional(),
  booking_ahead_days: count,
  step_minutes: z.int().min(1),
  notes: z.array(text),
});

const roomGroupSchema = z.object({
  group: text.optional(),
  name: z.union([text, z.array(text)]).optional(),
  names: z.array(text).optional(),
  seatNos: z.array(z.int()).optional(),
  equipment: text.optional(),
});

const spaceSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9-]{1,40}$/u, 'Expected an id of letters, digits and dashes'),
  floor: z.int().optional(),
  roomNo: z.int().optional(),
  sectorNo: z.int().optional(),
  seatNos: z.array(z.int()).optional(),
  rooms: z.array(z.union([text, roomGroupSchema])).optional(),
  name: text,
  kind: text.optional(),
  bookable: z.union([z.boolean(), z.literal('unknown')]),
  implemented: z.boolean(),
  why_not: text.optional(),
  purpose: text.optional(),
  capacity: z.string().regex(NUMBER_RANGE, 'Expected a range such as 4–6').nullable().optional(),
  common: z.enum(['group_study_room', 'media_room', 'reading_room']).optional(),
  hours: text.optional(),
  duration: text.optional(),
  useDesc: z.array(text).optional(),
  seat_labels: z.string().regex(SEAT_RANGE, 'Expected a range of labels such as 7001–7192').optional(),
  mapImage: z.strictObject({ width: z.int().min(1), height: z.int().min(1) }).optional(),
  for_affiliation: z.enum(['undergraduate', 'graduate', 'exchange']).optional(),
  site_notes: z.array(text).optional(),
  aliases: z.array(z.object({ text, source: z.enum(['site', 'proposed']) })).optional(),
});

export const fileSchema = z.object({
  common: z.object({ group_study_room: commonSchema, media_room: commonSchema, reading_room: commonSchema }),
  spaces: z.array(spaceSchema).min(1),
});

type SpaceEntry = z.infer<typeof spaceSchema>;
type Common = z.infer<typeof commonSchema>;

function minutesOf(hours: string, minutes: string): number {
  return Number(hours) * 60 + Number(minutes);
}

function clock(hours: string, minutes: string): string {
  return `${hours.padStart(2, '0')}:${minutes}`;
}

function clockRange(value: string | undefined): ClockRange | null {
  const match = value === undefined ? null : CLOCK_RANGE.exec(value);
  if (match === null) {
    return null;
  }
  const [, openHours = '', openMinutes = '', closeHours = '', closeMinutes = ''] = match;
  return { open: clock(openHours, openMinutes), close: clock(closeHours, closeMinutes) };
}

function durationRange(value: string | undefined): { min: number; max: number } | null {
  const match = value === undefined ? null : CLOCK_RANGE.exec(value);
  if (match === null) {
    return null;
  }
  const [, minHours = '', minMinutes = '', maxHours = '', maxMinutes = ''] = match;
  return { min: minutesOf(minHours, minMinutes), max: minutesOf(maxHours, maxMinutes) };
}

function numberRange(value: string | null | undefined): { min: number; max: number } | null {
  const match = value === null || value === undefined ? null : NUMBER_RANGE.exec(value);
  return match === null ? null : { min: Number(match[1]), max: Number(match[2]) };
}

function seatLabelsOf(value: string | undefined): LibrarySpace['seatLabels'] {
  const match = value === undefined ? null : SEAT_RANGE.exec(value);
  if (match === null) {
    return null;
  }
  const [, prefix = '', from = '', to = ''] = match;
  return { prefix, from: Number(from), to: Number(to), digits: from.length };
}

function namesOf(name: string | string[] | undefined, names: string[] | undefined): string[] {
  if (names !== undefined) {
    return names;
  }
  if (name === undefined) {
    return [];
  }
  return Array.isArray(name) ? name : [name];
}

// The rooms by name and the groups a User can ask for, from `rooms`: plain names in the order of `seatNos`, or groups
// of rooms, each with its own seat numbers.
function roomsOf(entry: SpaceEntry): { rooms: Map<string, number>; groups: EquipmentGroup[] } {
  const rooms = new Map<string, number>();
  const groups: EquipmentGroup[] = [];
  const seatNos = entry.seatNos ?? [];
  (entry.rooms ?? []).forEach((room, index) => {
    if (typeof room === 'string') {
      const seatNo = seatNos[index];
      if (seatNo !== undefined) {
        rooms.set(room, seatNo);
      }
      return;
    }
    const names = namesOf(room.name, room.names);
    const groupSeatNos = room.seatNos ?? [];
    names.forEach((name, at) => {
      const seatNo = groupSeatNos[at];
      if (seatNo !== undefined) {
        rooms.set(name, seatNo);
      }
    });
    groups.push({
      id: room.group ?? names.join('/'),
      equipment: room.equipment ?? null,
      rooms: names,
      seatNos: groupSeatNos,
    });
  });
  return { rooms, groups };
}

export function spaceOf(entry: SpaceEntry, common: Common | undefined): LibrarySpace {
  const kind = entry.kind ?? null;
  const unit: SpaceUnit | null = kind === null || kind === 'other' ? null : SEAT_KINDS.has(kind) ? 'seat' : 'room';
  const duration = durationRange(entry.duration ?? common?.duration) ?? { min: 0, max: 0 };
  const { rooms, groups } = roomsOf(entry);
  const hoursText = entry.hours ?? common?.hours;
  return {
    id: entry.id,
    name: entry.name,
    floor: entry.floor ?? null,
    kind,
    purpose: entry.purpose ?? '',
    aliases: (entry.aliases ?? []).map((alias) => alias.text),
    bookable: entry.bookable === true,
    implemented: entry.implemented,
    whyNot: entry.why_not ?? null,
    roomNo: entry.roomNo ?? null,
    sectorNo: entry.sectorNo ?? null,
    seatNos: entry.seatNos ?? [],
    unit,
    hours: clockRange(hoursText),
    closedOnSunday: hoursText?.includes('closed Sunday') ?? false,
    minMinutes: duration.min,
    maxMinutes: duration.max,
    stepMinutes: common?.step_minutes ?? 30,
    bookingAheadDays: common?.booking_ahead_days ?? 0,
    capacity: numberRange(entry.capacity),
    useDescOptions: entry.useDesc ?? common?.useDesc ?? null,
    pledge: common?.needs_pledge === true ? (common.pledge_text ?? null) : null,
    notes: [...(common?.notes ?? []), ...(entry.site_notes ?? [])],
    mapImage: entry.mapImage ?? null,
    seatLabels: seatLabelsOf(entry.seat_labels),
    rooms,
    equipmentGroups: groups,
    forAffiliation: entry.for_affiliation ?? null,
  };
}
