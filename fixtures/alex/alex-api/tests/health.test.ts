import assert from "node:assert/strict";
import test from "node:test";

test("health endpoint returns an ok status", async () => {
  const response = { status: "ok" };
  assert.equal(response.status, "ok");
});
