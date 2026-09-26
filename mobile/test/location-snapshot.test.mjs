import test from "node:test";
import assert from "node:assert/strict";
import {
  canApplyLocations,
  freshLocations,
  LOCATION_TTL_MS,
} from "../src/location-snapshot.ts";
const request = { generation: 4, token: "session-a" };
const current = { ...request, sharing: true, active: true };
test("only the latest authorized, active sharing session may apply a snapshot", () => {
  assert.equal(canApplyLocations(request, current), true);
  for (const change of [
    { generation: 5 },
    { token: "" },
    { token: "session-b" },
    { sharing: false },
    { active: false },
  ]) {
    assert.equal(canApplyLocations(request, { ...current, ...change }), false);
  }
});
test("locations expire at the TTL even with no network response", () => {
  const now = Date.parse("2026-09-27T00:00:00Z");
  const fresh = {
    observedAt: new Date(now - LOCATION_TTL_MS + 1).toISOString(),
  };
  const expired = { observedAt: new Date(now - LOCATION_TTL_MS).toISOString() };
  assert.deepEqual(
    freshLocations(
      [
        fresh,
        expired,
        { observedAt: "invalid" },
        { observedAt: new Date(now + 1).toISOString() },
      ],
      now,
    ),
    [fresh],
  );
  assert.deepEqual(freshLocations([fresh], now + 1), []);
});
