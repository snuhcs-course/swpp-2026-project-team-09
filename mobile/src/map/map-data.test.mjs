import test from "node:test";
import assert from "node:assert/strict";
import { validCoordinate, mapEvents } from "./map-data.ts";

test("only published events with real finite coordinates become map pins", () => {
  const valid = { id: "actual-event", status: "published", latitude: 37.46, longitude: 126.95 };
  assert.deepEqual(mapEvents([valid, { ...valid, id: "draft", status: "draft" }, { ...valid, latitude: null }, { ...valid, longitude: Infinity }, { ...valid, latitude: 91 }]), [valid]);
  assert.equal(validCoordinate(null), false);
  assert.equal(validCoordinate({ latitude: NaN, longitude: 126.95 }), false);
});
