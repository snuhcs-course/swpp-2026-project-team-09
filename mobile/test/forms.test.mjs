import test from "node:test";
import assert from "node:assert/strict";
import {
  timeRange,
  matchBody,
  localFields,
  dateAfterDays,
} from "../src/forms.ts";
const times = {
  startDate: "2026-09-28",
  startTime: "12:00",
  endDate: "2026-09-28",
  endTime: "13:30",
};
test("local date/time round-trips without assuming UTC", () => {
  const result = timeRange(times);
  assert.deepEqual(localFields(result.startsAt), {
    date: times.startDate,
    time: times.startTime,
  });
  assert.deepEqual(localFields(result.endsAt), {
    date: times.endDate,
    time: times.endTime,
  });
});
test("invalid calendar dates, times, and reversed ranges are rejected", () => {
  for (const patch of [
    { startDate: "2026-02-30" },
    { startDate: "2026-13-01" },
    { startTime: "24:00" },
    { endTime: "11:00" },
    { endTime: "12:00" },
    { startTime: "9:00" },
  ])
    assert.throws(() => timeRange({ ...times, ...patch }));
});
test("day chips roll over months and leap dates correctly", () => {
  assert.equal(dateAfterDays(1, new Date(2028, 1, 28)), "2028-02-29");
  assert.equal(dateAfterDays(1, new Date(2026, 11, 31)), "2027-01-01");
});
test("event-scoped matching preserves event ID and explicit consent", () => {
  const input = {
    activity: "행사 동행",
    size: "4",
    interests: "공연, 산책",
    times,
    consent: true,
    eventId: "event-123",
  };
  const body = matchBody(input);
  assert.equal(body.eventId, "event-123");
  assert.equal(body.autoJoinConsent, true);
  assert.deepEqual(body.interests, ["공연", "산책"]);
  assert.equal("eventId" in matchBody({ ...input, eventId: undefined }), false);
  assert.throws(() => matchBody({ ...input, consent: false }));
  assert.throws(() => matchBody({ ...input, size: "2.5" }));
  assert.throws(() => matchBody({ ...input, size: "7" }));
});
