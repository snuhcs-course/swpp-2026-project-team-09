import test from "node:test";
import assert from "node:assert/strict";
import {
  eventImageTimes,
  eventImageSaveSource,
  isLocalExtractionApi,
  MAX_IMAGE_BYTES,
  imageByteLength,
  readExtraction,
  resizedImage,
  timetableImageDraft,
} from "../src/image-extraction.ts";
const entry = {
  title: "수업",
  weekday: 1,
  startMinute: 540,
  endMinute: 600,
  locationName: null,
};
const table = {
  semesterStartsOn: null,
  semesterEndsOn: null,
  entries: [entry],
};
const event = {
  title: "행사",
  description: "",
  startsAt: null,
  endsAt: null,
  locationName: null,
};
test("image dimensions cap the longest edge at 1600 without upscaling", () => {
  assert.deepEqual(resizedImage(3200, 1800), { width: 1600, height: 900 });
  assert.deepEqual(resizedImage(1000, 2000), { width: 800, height: 1600 });
  assert.deepEqual(resizedImage(100, 200), { width: 100, height: 200 });
  assert.throws(() => resizedImage(0, 200));
});
test("base64 decoded byte count respects padding", () => {
  assert.equal(imageByteLength("TQ=="), 1);
  assert.equal(imageByteLength("TWE="), 2);
  assert.equal(imageByteLength("TWFu"), 3);
});
test("timetable import keeps CAS version but never reuses stale dates or extracted IDs", () => {
  const current = {
    ...table,
    version: 7,
    timezone: "Asia/Seoul",
    semesterStartsOn: "2026-09-01",
    semesterEndsOn: "2026-12-20",
    entries: [],
  };
  const result = readExtraction(
    {
      kind: "timetable",
      draft: {
        ...table,
        version: 99,
        entries: [{ ...entry, id: "untrusted", ownerId: "other" }],
      },
      warnings: [],
    },
    "timetable",
  );
  const next = timetableImageDraft(current, result.draft, () => "new-id");
  assert.equal(next.version, 7);
  assert.equal(next.semesterStartsOn, null);
  assert.equal(next.semesterEndsOn, null);
  assert.equal(next.entries[0].id, "new-id");
  assert.equal("ownerId" in next.entries[0], false);
  assert.deepEqual(current.entries, []);
});
test("event missing dates remain blank without guessing a date or year", () => {
  assert.deepEqual(eventImageTimes(event), {
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });
  const result = readExtraction(
    {
      kind: "event",
      draft: { ...event, latitude: 37, longitude: 127, id: "other" },
      warnings: ["날짜 확인"],
    },
    "event",
  );
  assert.equal("latitude" in result.draft, false);
  assert.equal("id" in result.draft, false);
  assert.deepEqual(result.warnings, ["날짜 확인"]);
});
test("wrong kind, out-of-range periods and malformed dates cannot enter previews", () => {
  assert.throws(() =>
    readExtraction({ kind: "event", draft: event, warnings: [] }, "timetable"),
  );
  assert.throws(() =>
    readExtraction(
      {
        kind: "timetable",
        draft: { ...table, entries: [{ ...entry, endMinute: 2000 }] },
        warnings: [],
      },
      "timetable",
    ),
  );
  assert.throws(() =>
    readExtraction(
      {
        kind: "timetable",
        draft: { ...table, semesterStartsOn: "2026-02-30" },
        warnings: [],
      },
      "timetable",
    ),
  );
  assert.throws(() =>
    readExtraction(
      { kind: "event", draft: { ...event, startsAt: "10:00" }, warnings: [] },
      "event",
    ),
  );
});

test("local extraction destination rejects external, misleading and credentialed URLs", () => {
  for (const url of [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://10.0.2.2:3000",
    "http://[::1]:3000",
  ])
    assert.equal(isLocalExtractionApi(url), true);
  for (const url of [
    "",
    "https://example.com",
    "http://localhost.example.com",
    "http://localhost@evil.example",
    "http://user:password@localhost:3000",
    "file:///tmp/image",
    "http://192.168.1.5:3000",
  ])
    assert.equal(isLocalExtractionApi(url), false);
});
test("image import clears old coordinates but retains the existing event CAS version", () => {
  const original = {
    id: "existing",
    version: 9,
    latitude: 37.4,
    longitude: 127.1,
  };
  assert.deepEqual(eventImageSaveSource(original), {
    id: "existing",
    version: 9,
    latitude: null,
    longitude: null,
  });
  assert.equal(original.latitude, 37.4);
  assert.equal(eventImageSaveSource(null), null);
});
test("image byte and warning boundaries are bounded without swallowing canonical twelve warnings", () => {
  const encoded = Buffer.alloc(MAX_IMAGE_BYTES).toString("base64");
  assert.equal(imageByteLength(encoded), MAX_IMAGE_BYTES);
  assert.equal(
    imageByteLength(Buffer.alloc(MAX_IMAGE_BYTES + 1).toString("base64")),
    MAX_IMAGE_BYTES + 1,
  );
  assert.equal(
    readExtraction(
      { kind: "event", draft: event, warnings: Array(12).fill("확인 필요") },
      "event",
    ).warnings.length,
    12,
  );
  assert.throws(() =>
    readExtraction(
      { kind: "event", draft: event, warnings: Array(13).fill("확인 필요") },
      "event",
    ),
  );
  assert.throws(() =>
    readExtraction(
      { kind: "event", draft: event, warnings: ["a".repeat(501)] },
      "event",
    ),
  );
  assert.throws(() =>
    readExtraction(
      {
        kind: "event",
        draft: { ...event, startsAt: "2026-02-30T10:00:00+09:00" },
        warnings: [],
      },
      "event",
    ),
  );
});
