import type { Timetable } from "./account-forms";
export type ClassOccurrence = {
  id: string;
  entryId: string;
  date: string;
  title: string;
  classTitle: string;
  startMinute: number;
  endMinute: number;
  locationName: string | null;
  status: "예정" | "수업 시간" | "시간 지남";
};
export type ClassDay = {
  date: string;
  kind: "unconfigured" | "outside-semester" | "empty" | "classes";
  items: ClassOccurrence[];
};
export function seoulDate(now: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) =>
    parts.find((item) => item.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function todayClassQuests(
  timetable: Timetable,
  now = Date.now(),
): ClassDay {
  const date = seoulDate(now);
  if (!timetable.semesterStartsOn || !timetable.semesterEndsOn)
    return { date, kind: "unconfigured", items: [] };
  if (date < timetable.semesterStartsOn || date > timetable.semesterEndsOn)
    return { date, kind: "outside-semester", items: [] };
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
  const dayStart = Date.parse(`${date}T00:00:00+09:00`);
  const items = timetable.entries
    .filter((entry) => entry.weekday === weekday)
    .map((entry) => ({
      id: `class:${entry.id}:${date}`,
      entryId: entry.id,
      date,
      title: `수업 들으러 가기 · ${entry.title}`,
      classTitle: entry.title,
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
      locationName: entry.locationName,
      status: (now < dayStart + entry.startMinute * 60_000
        ? "예정"
        : now < dayStart + entry.endMinute * 60_000
          ? "수업 시간"
          : "시간 지남") as ClassOccurrence["status"],
    }))
    .sort(
      (a, b) =>
        a.startMinute - b.startMinute ||
        a.endMinute - b.endMinute ||
        a.id.localeCompare(b.id),
    );
  return { date, kind: items.length ? "classes" : "empty", items };
}
export function canApplyTimetable(
  requestToken: string,
  currentToken: string,
  requestEpoch: number,
  currentEpoch: number,
  version: number,
  currentVersion: number,
) {
  return (
    !!requestToken &&
    requestToken === currentToken &&
    requestEpoch === currentEpoch &&
    version >= currentVersion
  );
}
