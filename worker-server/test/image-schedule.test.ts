import test from "node:test";
import assert from "node:assert/strict";
import { parseImageSchedule as parse } from "../src/modules/image-schedule";
const unknown = { startsAt: null, endsAt: null };
const iso = (time: string) => `2026-10-06T${time}:00+09:00`;
test("literal explicit dates support conservative Korean and numeric same-day ranges", () => {
  for (const date of ["2026년 10월 6일", "2026.10.6.", "2026-10-06"])
    assert.deepEqual(parse(`${date} 18:00~19:30`), {
      startsAt: iso("18:00"),
      endsAt: iso("19:30"),
    });
  assert.deepEqual(
    parse("일시: 2026년 10월 6일(화)\n오후 6시 30분 ~ 7시 30분"),
    { startsAt: iso("18:30"), endsAt: iso("19:30") },
  );
  assert.deepEqual(parse("2026년 10월 6일 오전 12시~오후 12시"), {
    startsAt: iso("00:00"),
    endsAt: iso("12:00"),
  });
  assert.deepEqual(parse("2026-10-06 오전 11:00~오후 1:00"), {
    startsAt: iso("11:00"),
    endsAt: iso("13:00"),
  });
  assert.deepEqual(parse("2026-10-06 오후 12:00~1:00"), {
    startsAt: iso("12:00"),
    endsAt: iso("13:00"),
  });
});
test("missing years, unsupported dates, multiple sessions and malformed clocks stay unknown", () => {
  for (const raw of [
    null,
    "10월 6일 오후 6시",
    "26.10.6 18:00",
    "2026-02-29 18:00",
    "2026-13-01 18:00",
    "0000-10-06 18:00",
    "2026년 10월 6일~7일 18:00",
    "2026-10-06 18:00 ~ 2026-10-07 19:00",
    "2026-10-06 18:00 / 19:00",
    "2026-10-06 24:00",
    "2026-10-06 18:60",
    "2026-10-06 오후 18시",
    "2026-10-06 18:00, 20:00",
    "2026-10-06 18:00 UTC",
    "2026-10-06 오후 여섯시",
  ])
    assert.deepEqual(parse(raw), unknown, raw || "null");
});
test("known start is retained without inventing an unknown or rolling end", () => {
  for (const raw of [
    "2026-10-06 18:00",
    "2026-10-06 18:00~미정",
    "2026-10-06 18:00~",
    "2026-10-06 18:00~17:00",
    "2026-10-06 오후 6:00~오전 7:00",
  ])
    assert.deepEqual(parse(raw), { startsAt: iso("18:00"), endsAt: null });
  assert.deepEqual(parse("2026-10-06 오후 11:30~12:30"), {
    startsAt: iso("23:30"),
    endsAt: null,
  });
  assert.deepEqual(parse("2026-10-06 오전 11시~1시"), {
    startsAt: iso("11:00"),
    endsAt: null,
  });
});
