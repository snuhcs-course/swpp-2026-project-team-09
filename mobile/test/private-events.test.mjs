import test from "node:test";
import assert from "node:assert/strict";
import {
  privateEventBody,
  privateEventDeleteBody,
  privateEventRevisionChanged,
} from "../src/private-events.ts";
const draft = {
  title: " 개인 일정 ",
  description: " 내 메모 ",
  locationName: " 도서관 ",
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-01-01T01:00:00.000Z",
};
const event = {
  ...draft,
  id: "own-event",
  latitude: 37.46,
  longitude: 126.95,
  version: 4,
  createdAt: draft.startsAt,
  updatedAt: draft.startsAt,
};
test("private event create body contains editable fields only and permits past dates", () => {
  assert.deepEqual(privateEventBody(draft), {
    ...draft,
    title: "개인 일정",
    description: "내 메모",
    locationName: "도서관",
    latitude: null,
    longitude: null,
  });
  assert.equal("ownerId" in privateEventBody(draft), false);
  assert.equal("expectedVersion" in privateEventBody(draft), false);
});
test("update carries expected version and preserves existing coordinates without copying ownership", () => {
  const body = privateEventBody({ ...draft, title: "새 이름" }, event);
  assert.equal(body.expectedVersion, 4);
  assert.equal(body.latitude, 37.46);
  assert.equal(body.longitude, 126.95);
  assert.equal("id" in body, false);
  assert.equal("createdAt" in body, false);
  assert.equal("updatedAt" in body, false);
  assert.equal(
    privateEventBody(draft, { ...event, latitude: null, longitude: null })
      .latitude,
    null,
  );
});
test("delete carries only the version approved by the user", () =>
  assert.deepEqual(privateEventDeleteBody(event), { expectedVersion: 4 }));
test("optional blank fields clear and required text is bounded", () => {
  const body = privateEventBody({
    ...draft,
    description: " ",
    locationName: "",
  });
  assert.equal(body.description, "");
  assert.equal(body.locationName, "");
  for (const patch of [
    { title: "" },
    { title: "a".repeat(201) },
    { description: "a".repeat(5001) },
    { locationName: "a".repeat(301) },
  ])
    assert.throws(() => privateEventBody({ ...draft, ...patch }));
  assert.doesNotThrow(() =>
    privateEventBody({
      ...draft,
      title: "a".repeat(200),
      description: "a".repeat(5000),
      locationName: "a".repeat(300),
    }),
  );
});
test("private event duration validates order and exact 31-day boundary", () => {
  for (const patch of [
    { startsAt: "invalid" },
    { endsAt: draft.startsAt },
    { endsAt: "2025-12-31T23:59:00Z" },
    { endsAt: "2026-02-01T00:00:01Z" },
  ])
    assert.throws(() => privateEventBody({ ...draft, ...patch }));
  assert.doesNotThrow(() =>
    privateEventBody({ ...draft, endsAt: "2026-02-01T00:00:00Z" }),
  );
});
test("stale or deleted records require reconciliation; new drafts are unaffected by refresh", () => {
  assert.equal(
    privateEventRevisionChanged(event, { ...event, version: 5 }),
    true,
  );
  assert.equal(privateEventRevisionChanged(event, undefined), true);
  assert.equal(privateEventRevisionChanged(event, { ...event }), false);
  assert.equal(privateEventRevisionChanged(null, undefined), false);
  assert.equal(
    privateEventRevisionChanged(
      { ...event, version: 5 },
      { ...event, version: 5 },
    ),
    false,
  );
});
