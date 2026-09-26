/** Half-open intervals: touching endpoints do not overlap. No private entry metadata escapes. */
export interface AvailabilityInterval {
  startsAt: Date;
  endsAt: Date;
}
export interface TimetableAvailability {
  /** True when semester dates are supplied, even when the window is outside that semester. */
  configured: boolean;
  /** Only this portion of the requested window has known timetable coverage. */
  coverage: AvailabilityInterval[];
  busy: AvailabilityInterval[];
  free: AvailabilityInterval[];
}
const DAY = 86_400_000;
const MINUTE = 60_000;
const seoul = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul", era: "short", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
function timestamp(value: Date): number {
  if (!(value instanceof Date) || !Number.isFinite(+value))
    throw new RangeError("A valid Date is required");
  return +value;
}
function interval(startsAt: number, endsAt: number): AvailabilityInterval {
  return { startsAt: new Date(startsAt), endsAt: new Date(endsAt) };
}
function bounds(value: AvailabilityInterval): [number, number] {
  const start = timestamp(value?.startsAt), end = timestamp(value?.endsAt);
  if (end <= start) throw new RangeError("Interval end must follow start");
  return [start, end];
}
export function overlaps(a: AvailabilityInterval, b: AvailabilityInterval): boolean {
  const [as, ae] = bounds(a), [bs, be] = bounds(b);
  return as < be && bs < ae;
}
function calendarDate(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    throw new RangeError("Semester dates must be valid YYYY-MM-DD dates");
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value)
    throw new RangeError("Invalid semester calendar date");
  return ms;
}
// Represent local calendar fields temporarily as UTC to do calendar arithmetic.
// Intl supplies Seoul's offset instead of depending on the host process timezone.
function wallTime(instant: number): number {
  const parts = Object.fromEntries(seoul.formatToParts(instant).map(p => [p.type, p.value]));
  const wall = new Date(0);
  const year = parts.era === "BC" ? 1 - Number(parts.year) : Number(parts.year);
  wall.setUTCFullYear(year, Number(parts.month) - 1, Number(parts.day));
  wall.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second), 0);
  return +wall;
}
function instantForWall(wall: number): number {
  let instant = wall;
  for (let i = 0; i < 4; i++) {
    const difference = wall - wallTime(instant);
    if (!difference) return instant;
    instant += difference;
  }
  throw new RangeError("Timetable contains a nonexistent Seoul local time");
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
    throw new RangeError("Invalid timetable weekday or minute");
  return value;
}

/**
 * Expand validated profile timetable JSON within an explicit [from,to) window.
 * At most 31 elapsed days and 100 weekly entries; missing semester is unconfigured.
 * Free time is the complement of merged busy time ONLY within semester coverage,
 * never a claim about quests, other calendars, or time outside the requested window.
 * Empty entries with semester dates intentionally configure an empty class calendar.
 */
export function getTimetableAvailability(timetable: unknown, from: Date, to: Date): TimetableAvailability {
  const [start, end] = bounds({ startsAt: from, endsAt: to });
  if (end - start > 31 * DAY) throw new RangeError("Availability window cannot exceed 31 days");
  const empty = (): TimetableAvailability => ({ configured: false, coverage: [], busy: [], free: [] });
  if (timetable === null || timetable === undefined) return empty();
  if (typeof timetable !== "object" || Array.isArray(timetable)) throw new TypeError("Timetable must be an object");
  const t = timetable as Record<string, any>;
  if (t.timezone !== "Asia/Seoul") throw new RangeError("Timetable timezone must be Asia/Seoul");
  if (!Array.isArray(t.entries) || t.entries.length > 100) throw new RangeError("Timetable permits at most 100 entries");
  if (t.semesterStartsOn === null && t.semesterEndsOn === null) {
    if (t.entries.length) throw new RangeError("Entries require semester dates");
    return empty();
  }
  const firstDay = calendarDate(t.semesterStartsOn), lastDay = calendarDate(t.semesterEndsOn);
  if (lastDay < firstDay) throw new RangeError("Semester end must not precede start");
  const entries = t.entries.map((e: any) => {
    const weekday = integer(e?.weekday, 1, 7);
    const startMinute = integer(e?.startMinute, 0, 1439), endMinute = integer(e?.endMinute, 1, 1440);
    if (endMinute <= startMinute) throw new RangeError("Entry end must follow start");
    return { weekday, startMinute, endMinute };
  });
  const coveredStart = Math.max(start, instantForWall(firstDay));
  const coveredEnd = Math.min(end, instantForWall(lastDay + DAY));
  const result: TimetableAvailability = { configured: true, coverage: [], busy: [], free: [] };
  if (coveredStart >= coveredEnd) return result;
  result.coverage.push(interval(coveredStart, coveredEnd));
  const busy: Array<[number, number]> = [];
  // Iterate only local dates touched by the bounded window, never the whole term.
  const firstCoveredDay = Math.floor(wallTime(coveredStart) / DAY) * DAY;
  const lastCoveredDay = Math.floor(wallTime(coveredEnd - 1) / DAY) * DAY;
  for (let day = firstCoveredDay; day <= lastCoveredDay; day += DAY) {
    const weekday = new Date(day).getUTCDay() || 7;
    for (const entry of entries) {
      if (entry.weekday !== weekday) continue;
      const a = Math.max(coveredStart, instantForWall(day + entry.startMinute * MINUTE));
      const b = Math.min(coveredEnd, instantForWall(day + entry.endMinute * MINUTE));
      if (a < b) busy.push([a, b]);
    }
  }
  busy.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const next of busy) {
    const previous = merged[merged.length - 1];
    if (previous && next[0] <= previous[1]) previous[1] = Math.max(previous[1], next[1]);
    else merged.push([...next]);
  }
  let cursor = coveredStart;
  for (const [a, b] of merged) {
    if (cursor < a) result.free.push(interval(cursor, a));
    result.busy.push(interval(a, b));
    cursor = b;
  }
  if (cursor < coveredEnd) result.free.push(interval(cursor, coveredEnd));
  return result;
}
