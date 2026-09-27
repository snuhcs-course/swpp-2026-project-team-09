import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Database } from "./database";
import { bad, number, object, text, uuid } from "./validation";

function fields(b: Record<string, any>, allowed: string[]) {
  if (Object.keys(b).some((key) => !allowed.includes(key)))
    bad("Unknown field");
}
function integer(value: any, name: string, min: number, max: number) {
  const n = number(value, name, min, max);
  if (!Number.isInteger(n)) bad(`${name} must be integer`);
  return n;
}
function optionalText(value: any, name: string, max: number) {
  return value === null ? null : text(value, name, max);
}
function version(value: any) {
  return integer(value, "expectedVersion", 1, 2147483646);
}
function conflict(): never {
  throw new ConflictException({
    message: "Reload before saving newer changes",
    code: "VERSION_CONFLICT",
  });
}
function profileView(row: any) {
  return {
    displayName: row.display_name,
    department: row.department,
    admissionYear: row.admission_year,
    interests: row.interests,
    statusMessage: row.status_message,
    version: row.profile_version,
  };
}
export function profileInput(value: any) {
  const b = object(value);
  fields(b, [
    "expectedVersion",
    "displayName",
    "department",
    "admissionYear",
    "interests",
    "statusMessage",
  ]);
  const expectedVersion = version(b.expectedVersion);
  const patch: Record<string, any> = {};
  if ("displayName" in b)
    patch.display_name = text(b.displayName, "displayName", 100);
  if ("department" in b)
    patch.department = optionalText(b.department, "department", 100);
  if ("admissionYear" in b)
    patch.admission_year =
      b.admissionYear === null
        ? null
        : integer(b.admissionYear, "admissionYear", 1900, 2100);
  if ("statusMessage" in b)
    patch.status_message = optionalText(b.statusMessage, "statusMessage", 300);
  if ("interests" in b) {
    if (!Array.isArray(b.interests) || b.interests.length > 20)
      bad("interests must contain at most 20 items");
    patch.interests = b.interests.map((v: any) => text(v, "interest", 40));
    if (new Set(patch.interests).size !== patch.interests.length)
      bad("Duplicate interest");
  }
  if (!Object.keys(patch).length) bad("At least one profile field required");
  return { expectedVersion, patch };
}
function calendarDate(value: any, name: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    bad(`${name} must be YYYY-MM-DD or null`);
  const [y, m, d] = value.split("-").map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1])
    bad(`${name} must be a valid calendar date`);
  return value;
}
export function timetableInput(value: any) {
  const b = object(value);
  fields(b, [
    "expectedVersion",
    "timezone",
    "semesterStartsOn",
    "semesterEndsOn",
    "entries",
  ]);
  const expectedVersion = version(b.expectedVersion);
  if (b.timezone !== undefined && b.timezone !== "Asia/Seoul")
    bad("timezone must be Asia/Seoul");
  const semesterStartsOn = calendarDate(b.semesterStartsOn, "semesterStartsOn");
  const semesterEndsOn = calendarDate(b.semesterEndsOn, "semesterEndsOn");
  if (
    (semesterStartsOn === null) !== (semesterEndsOn === null) ||
    (semesterStartsOn && semesterEndsOn && semesterStartsOn > semesterEndsOn)
  )
    bad("Valid semester date range required");
  if (!Array.isArray(b.entries) || b.entries.length > 100)
    bad("entries must contain at most 100 items");
  if (b.entries.length && !semesterStartsOn)
    bad("Semester dates required for entries");
  const entries = b.entries.map((value: any) => {
    const e = object(value);
    fields(e, [
      "id",
      "title",
      "weekday",
      "startMinute",
      "endMinute",
      "locationName",
    ]);
    const startMinute = integer(e.startMinute, "startMinute", 0, 1439);
    const endMinute = integer(e.endMinute, "endMinute", 1, 1440);
    if (endMinute <= startMinute) bad("endMinute must follow startMinute");
    return {
      id: uuid(e.id).toLowerCase(),
      title: text(e.title, "title", 100),
      weekday: integer(e.weekday, "weekday", 1, 7),
      startMinute,
      endMinute,
      locationName: optionalText(e.locationName, "locationName", 200),
    };
  });
  if (new Set(entries.map((e: any) => e.id)).size !== entries.length)
    bad("Duplicate entry ID");
  const sorted = [...entries].sort(
    (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute,
  );
  for (let i = 1; i < sorted.length; i++) {
    if (
      sorted[i].weekday === sorted[i - 1].weekday &&
      sorted[i].startMinute < sorted[i - 1].endMinute
    )
      bad("Timetable entries overlap");
  }
  return {
    expectedVersion,
    timetable: {
      timezone: "Asia/Seoul",
      semesterStartsOn,
      semesterEndsOn,
      entries,
    },
  };
}
@Injectable()
export class ProfileService {
  constructor(private db: Database) {}
  private async owner(userId: string) {
    this.db.requireReady();
    const row = await this.db.prisma.user.findUnique({ where: { id: userId } });
    if (!row) throw new NotFoundException("Account not found");
    return row;
  }
  async profile(userId: string) {
    return profileView(await this.owner(userId));
  }
  async patchProfile(userId: string, body: any) {
    const { expectedVersion, patch } = profileInput(body);
    this.db.requireReady();
    const rows = await this.db.prisma.user.updateManyAndReturn({
      where: { id: userId, profile_version: expectedVersion },
      data: { ...patch, profile_version: { increment: 1 } },
    });
    if (!rows[0]) conflict();
    return profileView(rows[0]);
  }
  async timetable(userId: string) {
    const row = await this.owner(userId);
    return {
      ...(row.timetable as Record<string, any>),
      version: row.timetable_version,
    };
  }
  async putTimetable(userId: string, body: any) {
    const { expectedVersion, timetable } = timetableInput(body);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      // The conditional UPDATE holds the owner row until both snapshot and hint commit,
      // preserving schedule-write serialization with meetup and quest acceptance.
      const rows = await c.user.updateManyAndReturn({
        where: { id: userId, timetable_version: expectedVersion },
        data: { timetable, timetable_version: { increment: 1 } },
      });
      if (!rows[0]) conflict();
      await this.db.hint(
        c,
        "timetable.changed",
        userId,
        [userId],
        rows[0].timetable_version,
      );
      return {
        ...(rows[0].timetable as Record<string, any>),
        version: rows[0].timetable_version,
      };
    });
  }
}
