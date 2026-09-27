import type { Timetable, ClassEntry } from "./account-forms";
import type { TimeFields } from "./forms";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export type ExtractionKind = "timetable" | "event";
export type TimetableImageDraft = {
  semesterStartsOn: string | null;
  semesterEndsOn: string | null;
  entries: Omit<ClassEntry, "id">[];
};
export type EventImageDraft = {
  title: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  locationName: string | null;
};
export type ExtractionResult = { warnings: string[] } & (
  | { kind: "timetable"; draft: TimetableImageDraft }
  | { kind: "event"; draft: EventImageDraft }
);
export function resizedImage(width: number, height: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error("사진 크기를 확인할 수 없어요. 다른 사진을 선택해 주세요.");
  const scale = Math.min(1, 1600 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
export function imageByteLength(base64: string) {
  return (
    Math.floor((base64.length * 3) / 4) -
    (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0)
  );
}
export function timetableImageDraft(
  current: Timetable,
  extracted: TimetableImageDraft,
  createId: () => string,
): Timetable {
  return {
    version: current.version,
    timezone: "Asia/Seoul",
    semesterStartsOn: extracted.semesterStartsOn,
    semesterEndsOn: extracted.semesterEndsOn,
    entries: extracted.entries.map((entry) => ({
      title: entry.title,
      weekday: entry.weekday,
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
      locationName: entry.locationName,
      id: createId(),
    })),
  };
}
export function eventImageTimes(draft: EventImageDraft): TimeFields {
  const local = (value: string | null) => {
    if (!value) return { date: "", time: "" };
    const d = new Date(value),
      two = (n: number) => String(n).padStart(2, "0");
    return {
      date: `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`,
      time: `${two(d.getHours())}:${two(d.getMinutes())}`,
    };
  };
  const start = local(draft.startsAt),
    end = local(draft.endsAt);
  return {
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
  };
}
// Reconstruct only documented fields; extracted data cannot supply IDs, owners, versions or coordinates.
export function readExtraction(
  value: unknown,
  kind: ExtractionKind,
): ExtractionResult {
  const invalid = () =>
    new Error(
      "사진에서 읽은 내용이 올바르지 않아요. 더 선명한 사진을 선택하거나 직접 입력해 주세요.",
    );
  if (!value || typeof value !== "object") throw invalid();
  const result = value as Record<string, unknown>,
    draft = result.draft as Record<string, unknown> | undefined;
  if (
    result.kind !== kind ||
    !draft ||
    typeof draft !== "object" ||
    !Array.isArray(result.warnings) ||
    result.warnings.length > 12 ||
    !result.warnings.every(
      (item) => typeof item === "string" && item.length <= 500,
    )
  )
    throw invalid();
  const text = (v: unknown, max: number): string => {
    if (typeof v !== "string" || v.length > max) throw invalid();
    return v;
  };
  const nullable = (v: unknown, max: number) =>
    v === null ? null : text(v, max);
  const date = (v: unknown): string | null => {
    if (v === null) return null;
    const s = text(v, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
      !Number.isFinite(Date.parse(s)) ||
      new Date(s).toISOString().slice(0, 10) !== s
    )
      throw invalid();
    return s;
  };
  if (kind === "timetable") {
    if (!Array.isArray(draft.entries) || draft.entries.length > 100)
      throw invalid();
    const entries = draft.entries.map((raw) => {
      if (!raw || typeof raw !== "object") throw invalid();
      const e = raw as Record<string, unknown>,
        weekday = e.weekday as number,
        startMinute = e.startMinute as number,
        endMinute = e.endMinute as number;
      if (
        !Number.isInteger(weekday) ||
        weekday < 1 ||
        weekday > 7 ||
        !Number.isInteger(startMinute) ||
        !Number.isInteger(endMinute) ||
        startMinute < 0 ||
        endMinute > 1440 ||
        startMinute >= endMinute
      )
        throw invalid();
      return {
        title: text(e.title, 100),
        weekday,
        startMinute,
        endMinute,
        locationName: nullable(e.locationName, 200),
      };
    });
    return {
      kind,
      warnings: result.warnings as string[],
      draft: {
        semesterStartsOn: date(draft.semesterStartsOn),
        semesterEndsOn: date(draft.semesterEndsOn),
        entries,
      },
    };
  }
  const timestamp = (v: unknown) => {
    if (v === null) return null;
    const s = text(v, 40);
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        s,
      ) ||
      !Number.isFinite(Date.parse(s))
    )
      throw invalid();
    date(s.slice(0, 10));
    return s;
  };
  return {
    kind,
    warnings: result.warnings as string[],
    draft: {
      title: text(draft.title, 200),
      description: text(draft.description, 5000),
      startsAt: timestamp(draft.startsAt),
      endsAt: timestamp(draft.endsAt),
      locationName: nullable(draft.locationName, 300),
    },
  };
}
export function extractionError(status?: number, code?: string) {
  if (status === 429)
    return "지금 다른 사진을 처리하고 있어요. 잠시 후 다시 시도해 주세요.";
  if (
    code === "CONFIGURATION_REQUIRED" ||
    code === "EXTRACTION_UNAVAILABLE" ||
    status === 503
  )
    return "사진 읽기 기능의 준비가 필요해요. 지금은 직접 입력할 수 있어요.";
  if (code === "EXTRACTION_TIMEOUT" || status === 504)
    return "사진을 읽는 데 시간이 오래 걸렸어요. 더 선명하거나 작은 사진으로 다시 시도해 주세요.";
  if (status === 502)
    return "사진 내용을 정확히 읽지 못했어요. 다른 사진을 선택하거나 직접 입력해 주세요.";
  return "사진을 읽지 못했어요. 연결 상태와 사진을 확인한 뒤 다시 시도해 주세요.";
}

// This approved evaluation is same-machine only. Deployment hosts require a separate decision.
export function isLocalExtractionApi(value: string) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      ["127.0.0.1", "localhost", "[::1]", "10.0.2.2"].includes(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function eventImageSaveSource<
  T extends { latitude: number | null; longitude: number | null },
>(original: T | null): T | null {
  return original ? { ...original, latitude: null, longitude: null } : null;
}
