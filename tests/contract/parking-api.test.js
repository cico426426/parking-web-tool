import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/tdx-taoyuan-sample.json" with { type: "json" };

import { buildAvailabilityMap, normalizeCarParks } from "../../public/src/parking/normalize.js";
import { rankRecommendations } from "../../public/src/parking/rank.js";

test("recommendation contract returns ranked recommendation shape", () => {
  const lots = normalizeCarParks(fixture.carParks, "Taoyuan");
  const availability = buildAvailabilityMap(fixture.availability);
  const [recommendation] = rankRecommendations(fixture.destination, lots, availability);

  assert.equal(recommendation.rank, 1);
  assert.equal(typeof recommendation.parkingLot.name, "string");
  assert.equal(recommendation.availability.status, "available");
  assert.equal(recommendation.distanceMethod, "straight-line");
  assert.equal(recommendation.timeEstimateMethod, "approximate");
  assert.match(recommendation.navigationUrl, /^https:\/\/www\.google\.com\/maps\/dir\//);
});

test("recommendation contract handles no usable parking", () => {
  const recommendations = rankRecommendations(fixture.destination, [], new Map());
  assert.deepEqual(recommendations, []);
});
