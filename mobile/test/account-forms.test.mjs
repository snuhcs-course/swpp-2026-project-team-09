import test from "node:test";
import assert from "node:assert/strict";
import {
  minuteOfDay,
  clockText,
  profileBody,
  validateTimetable,
  classId,
} from "../src/account-forms.ts";
const profile = {
  displayName: " 학생 ",
  department: "",
  admissionYear: "",
  interests: "산책, 공연",
  statusMessage: "",
};
const entry = {
  id: classId(),
  title: "수업",
  weekday: 1,
  startMinute: 540,
  endMinute: 600,
  locationName: null,
};
const timetable = {
  semesterStartsOn: "2026-09-01",
  semesterEndsOn: "2026-12-21",
  entries: [entry],
};
test("profile trims values and clears optional fields explicitly", () => {
  assert.deepEqual(profileBody(profile), {
    displayName: "학생",
    department: null,
    admissionYear: null,
    interests: ["산책", "공연"],
    statusMessage: null,
  });
});
test("profile rejects malformed year, repeated interests and excessive values", () => {
  for (const value of ["2e03", "1899", "2101", "2026.5"])
    assert.throws(() => profileBody({ ...profile, admissionYear: value }));
  for (const interests of [
    "산책, 산책",
    "가".repeat(41),
    Array.from({ length: 21 }, (_, i) => `${i}`).join(","),
  ])
    assert.throws(() => profileBody({ ...profile, interests }));
  assert.throws(() => profileBody({ ...profile, displayName: " " }));
});
test("clock input supports midnight end only and rejects invalid clock times", () => {
  assert.equal(minuteOfDay("24:00", true), 1440);
  assert.equal(clockText(1440), "24:00");
  assert.equal(minuteOfDay("00:00"), 0);
  for (const value of ["24:00", "12:60", "9:00", "23:99"])
    assert.throws(() => minuteOfDay(value));
});
test("semester dates reject overflow, missing dates and reversed bounds", () => {
  for (const semesterStartsOn of [
    "2026-02-30",
    "2026-9-01",
    null,
    "2027-01-01",
  ])
    assert.throws(() => validateTimetable({ ...timetable, semesterStartsOn }));
  assert.doesNotThrow(() =>
    validateTimetable({
      semesterStartsOn: "2028-02-29",
      semesterEndsOn: "2028-03-01",
      entries: [],
    }),
  );
});
test("same weekday overlap is rejected while adjacency and different weekdays work", () => {
  assert.throws(() =>
    validateTimetable({
      ...timetable,
      entries: [
        entry,
        { ...entry, id: classId(), startMinute: 599, endMinute: 620 },
      ],
    }),
  );
  assert.doesNotThrow(() =>
    validateTimetable({
      ...timetable,
      entries: [
        entry,
        { ...entry, id: classId(), startMinute: 600, endMinute: 620 },
      ],
    }),
  );
  assert.doesNotThrow(() =>
    validateTimetable({
      ...timetable,
      entries: [entry, { ...entry, id: classId(), weekday: 2 }],
    }),
  );
  assert.throws(() =>
    validateTimetable({
      ...timetable,
      entries: [{ ...entry, startMinute: 600 }],
    }),
  );
});
test("generated entry identifiers have UUID v4 shape", () =>
  assert.match(
    classId(),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  ));

test("duplicate entry IDs cannot be submitted", () => {
  assert.throws(() =>
    validateTimetable({
      ...timetable,
      entries: [entry, { ...entry, weekday: 2 }],
    }),
  );
});
