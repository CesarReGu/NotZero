import assert from "node:assert/strict";
import test from "node:test";
import { bridgeCardContent } from "@/lib/bridge/card";
import { alexBridgeReport } from "@/lib/bridge/prepared-report";
import { softwareBackendPracticePack } from "@/lib/market/current-practice";

test("bridge card content is bounded to share-safe summary fields", () => {
  const content = bridgeCardContent(alexBridgeReport, softwareBackendPracticePack);
  const serialized = JSON.stringify(content);
  assert.equal(content.counts.length, 4);
  assert.match(content.headline, /reviewed requirements/);
  assert.doesNotMatch(serialized, /alex-api\//i);
  assert.doesNotMatch(serialized, /const port/i);
  assert.doesNotMatch(serialized, /Rivera/i);
});
