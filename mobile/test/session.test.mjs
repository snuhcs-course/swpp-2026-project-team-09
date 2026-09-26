import test from "node:test";
import assert from "node:assert/strict";
import { isCurrentSession } from "../src/session.ts";
test("responses and 401s belong only to the current authenticated account", () => {
  assert.equal(isCurrentSession("account-a-token", "account-a-token"), true);
  assert.equal(isCurrentSession("account-a-token", "account-b-token"), false);
  assert.equal(isCurrentSession("account-a-token", ""), false);
  assert.equal(isCurrentSession("", ""), false);
});
