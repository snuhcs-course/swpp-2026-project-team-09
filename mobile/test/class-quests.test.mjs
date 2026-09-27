import test from "node:test";
import assert from "node:assert/strict";
import {
  canApplyTimetable,
  seoulDate,
  todayClassQuests,
} from "../src/class-quests.ts";
const entry = {
  id: "23862137-2a6b-4eef-9139-31ed62f8c746",
  title: "소프트웨어 개발",
  weekday: 1,
  startMinute: 540,
  endMinute: 600,
  locationName: "301동",
};
const timetable = {
  version: 1,
  timezone: "Asia/Seoul",
  semesterStartsOn: "2026-09-28",
  semesterEndsOn: "2026-10-05",
  entries: [entry],
};
const monday = Date.parse("2026-09-28T08:00:00+09:00");
test("projection uses the Seoul date and weekday independent of device timezone", () => {
  const saved = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      const day = todayClassQuests(
        timetable,
        Date.parse("2026-09-27T15:00:00Z"),
      );
      assert.equal(seoulDate(Date.parse("2026-09-27T14:59:59Z")), "2026-09-27");
      assert.equal(day.date, "2026-09-28");
      assert.equal(day.items.length, 1);
      assert.equal(day.items[0].title, "수업 들으러 가기 · 소프트웨어 개발");
      assert.equal(day.items[0].status, "예정");
    }
  } finally {
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  }
});
test("semester bounds are inclusive and unconfigured, outside and empty states remain distinct", () => {
  assert.equal(
    todayClassQuests({ ...timetable, semesterStartsOn: null }, monday).kind,
    "unconfigured",
  );
  assert.equal(
    todayClassQuests({ ...timetable, semesterEndsOn: null }, monday).kind,
    "unconfigured",
  );
  assert.equal(
    todayClassQuests(timetable, Date.parse("2026-09-27T23:59:59+09:00")).kind,
    "outside-semester",
  );
  assert.equal(todayClassQuests(timetable, monday).kind, "classes");
  assert.equal(
    todayClassQuests(timetable, Date.parse("2026-10-05T23:59:59+09:00")).kind,
    "classes",
  );
  assert.equal(
    todayClassQuests(timetable, Date.parse("2026-10-06T00:00:00+09:00")).kind,
    "outside-semester",
  );
  assert.equal(
    todayClassQuests({ ...timetable, entries: [] }, monday).kind,
    "empty",
  );
  assert.equal(
    todayClassQuests(timetable, Date.parse("2026-09-29T09:00:00+09:00")).kind,
    "empty",
  );
});
test("class time status changes exactly at start and end without attendance/completion state", () => {
  for (const [time, status] of [
    ["08:59:59", "예정"],
    ["09:00:00", "수업 시간"],
    ["09:59:59", "수업 시간"],
    ["10:00:00", "시간 지남"],
  ]) {
    assert.equal(
      todayClassQuests(timetable, Date.parse(`2026-09-28T${time}+09:00`))
        .items[0].status,
      status,
    );
  }
});
test("24:00 ending and weekday7 use the correct calendar date at midnight", () => {
  const table = {
    ...timetable,
    semesterStartsOn: "2026-09-27",
    entries: [
      { ...entry, weekday: 7, startMinute: 1380, endMinute: 1440 },
      entry,
    ],
  };
  const before = todayClassQuests(
    table,
    Date.parse("2026-09-27T23:59:59+09:00"),
  );
  assert.equal(before.items[0].endMinute, 1440);
  assert.equal(before.items[0].status, "수업 시간");
  const after = todayClassQuests(
    table,
    Date.parse("2026-09-28T00:00:00+09:00"),
  );
  assert.equal(after.items.length, 1);
  assert.equal(after.items[0].startMinute, 540);
  assert.notEqual(after.items[0].id, before.items[0].id);
});
test("occurrence IDs ignore version and source order, and projection never mutates source", () => {
  const other = Object.freeze({
    ...entry,
    id: "99999999-2a6b-4eef-9139-31ed62f8c746",
    startMinute: 660,
    endMinute: 720,
  });
  const source = Object.freeze({
    ...timetable,
    entries: Object.freeze([other, Object.freeze({ ...entry })]),
  });
  const result = todayClassQuests(source, monday);
  const reordered = todayClassQuests(
    { ...timetable, version: 99, entries: [entry, other] },
    monday,
  );
  assert.deepEqual(result, reordered);
  assert.equal(result.items[0].id, `class:${entry.id}:2026-09-28`);
  assert.equal(source.entries[0], other);
  assert.equal("partyId" in result.items[0], false);
});
test("source applies only matching-session, current-epoch, non-older versions", () => {
  assert.equal(
    canApplyTimetable("owner-token", "owner-token", 2, 2, 7, 6),
    true,
  );
  assert.equal(
    canApplyTimetable("owner-token", "other-token", 2, 2, 7, 6),
    false,
  );
  assert.equal(canApplyTimetable("owner-token", "", 2, 2, 7, 6), false);
  assert.equal(canApplyTimetable("", "", 2, 2, 7, 6), false);
  assert.equal(
    canApplyTimetable("owner-token", "owner-token", 2, 3, 7, 6),
    false,
  );
  assert.equal(
    canApplyTimetable("owner-token", "owner-token", 2, 2, 5, 6),
    false,
  );
  assert.equal(
    canApplyTimetable("owner-token", "owner-token", 3, 3, 6, 6),
    true,
  );
});
