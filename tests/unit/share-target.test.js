import test from "node:test";
import assert from "node:assert/strict";

import { extractCoordinates, parseSharedDestination } from "../../public/src/search/share-target.js";

test("extractCoordinates reads latitude and longitude from shared text", () => {
  assert.deepEqual(extractCoordinates("24.9575, 121.2408"), { lat: 24.9575, lng: 121.2408 });
});

test("parseSharedDestination returns query for place text", () => {
  const result = parseSharedDestination("title=中原大學");
  assert.equal(result.query, "中原大學");
});

test("parseSharedDestination returns null for empty input", () => {
  assert.equal(parseSharedDestination(""), null);
});
