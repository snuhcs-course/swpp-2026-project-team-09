export type Profile = {
  displayName: string;
  department: string | null;
  admissionYear: number | null;
  interests: string[];
  statusMessage: string | null;
  version: number;
};
export type ClassEntry = {
  id: string;
  title: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  locationName: string | null;
};
export type Timetable = {
  version: number;
  timezone: "Asia/Seoul";
  semesterStartsOn: string | null;
  semesterEndsOn: string | null;
  entries: ClassEntry[];
};
export type ProfileDraft = {
  displayName: string;
  department: string;
  admissionYear: string;
  interests: string;
  statusMessage: string;
};
export function profileDraft(p: Profile): ProfileDraft {
  return {
    displayName: p.displayName,
    department: p.department ?? "",
    admissionYear: p.admissionYear?.toString() ?? "",
    interests: p.interests.join(", "),
    statusMessage: p.statusMessage ?? "",
  };
}
export function profileBody(p: ProfileDraft) {
  const displayName = p.displayName.trim(),
    department = p.department.trim() || null,
    statusMessage = p.statusMessage.trim() || null;
  const year = p.admissionYear.trim();
  const interests = p.interests
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!displayName || displayName.length > 100)
    throw new Error("이름은 1~100자로 입력해 주세요.");
  if ((department?.length ?? 0) > 100 || (statusMessage?.length ?? 0) > 300)
    throw new Error("학과는 100자, 상태 메시지는 300자까지 입력할 수 있어요.");
  if (year && (!/^\d{4}$/.test(year) || +year < 1900 || +year > 2100))
    throw new Error(
      "입학 연도는 1900~2100 사이의 네 자리 연도로 입력해 주세요.",
    );
  if (
    interests.length > 20 ||
    interests.some((s) => s.length > 40) ||
    new Set(interests).size !== interests.length
  )
    throw new Error(
      "관심사는 중복 없이 20개까지, 각각 40자까지 입력해 주세요.",
    );
  return {
    displayName,
    department,
    statusMessage,
    admissionYear: year ? +year : null,
    interests,
  };
}
export function minuteOfDay(value: string, end = false) {
  if (end && value === "24:00") return 1440;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new Error(
      "시간은 09:00처럼 입력해 주세요. 24:00은 종료 시간에만 쓸 수 있어요.",
    );
  return +value.slice(0, 2) * 60 + +value.slice(3);
}
export const clockText = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
export function validateTimetable(
  t: Pick<Timetable, "semesterStartsOn" | "semesterEndsOn" | "entries">,
) {
  const validDate = (s: string | null): s is string =>
    !!s &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (
    !validDate(t.semesterStartsOn) ||
    !validDate(t.semesterEndsOn) ||
    t.semesterStartsOn > t.semesterEndsOn
  )
    throw new Error(
      "학기 시작일과 종료일을 YYYY-MM-DD 형식의 올바른 날짜 순서로 입력해 주세요.",
    );
  if (t.entries.length > 100)
    throw new Error("수업은 100개까지 등록할 수 있어요.");
  if (new Set(t.entries.map((e) => e.id)).size !== t.entries.length)
    throw new Error(
      "수업 식별자가 중복되어 있어요. 중복 수업을 삭제하고 다시 추가해 주세요.",
    );
  const sorted = [...t.entries].sort(
    (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute,
  );
  for (const [i, entry] of sorted.entries()) {
    if (
      !entry.title.trim() ||
      entry.title.trim().length > 100 ||
      (entry.locationName?.length ?? 0) > 200
    )
      throw new Error("수업명은 1~100자, 장소는 200자까지 입력해 주세요.");
    if (
      !Number.isInteger(entry.weekday) ||
      entry.weekday < 1 ||
      entry.weekday > 7 ||
      !Number.isInteger(entry.startMinute) ||
      !Number.isInteger(entry.endMinute) ||
      entry.startMinute < 0 ||
      entry.endMinute > 1440 ||
      entry.startMinute >= entry.endMinute
    )
      throw new Error("수업의 요일과 시작·종료 시간을 확인해 주세요.");
    const previous = sorted[i - 1];
    if (
      previous &&
      previous.weekday === entry.weekday &&
      previous.endMinute > entry.startMinute
    )
      throw new Error(`${entry.title}: 같은 요일의 수업 시간이 겹쳐요.`);
  }
}
// These IDs identify local class entries, not authentication or security tokens.
export const classId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
