import test from "node:test";
import assert from "node:assert/strict";

import { distanceMeters, rankRecommendations } from "../../public/src/parking/rank.js";

const destination = { id: "dest", name: "中原大學", lat: 24.9575, lng: 121.2408 };

test("distanceMeters returns finite distance for valid coordinates", () => {
  assert.ok(distanceMeters(destination, { lat: 24.958, lng: 121.241 }) < 100);
});

test("rankRecommendations caps primary results at five", () => {
  const lots = Array.from({ length: 7 }, (_, index) => ({
    id: `P${index}`,
    name: `P${index}`,
    lat: 24.9575 + index * 0.001,
    lng: 121.2408,
  }));

  assert.equal(rankRecommendations(destination, lots, new Map()).length, 5);
});

test("rankRecommendations prefers available spaces over nearby full lots", () => {
  const lots = [
    { id: "full", name: "Full", lat: 24.9576, lng: 121.2408 },
    { id: "open", name: "Open", lat: 24.9585, lng: 121.2408 },
  ];
  const availability = new Map([
    ["full", { parkingLotId: "full", availableSpaces: 0, status: "full" }],
    ["open", { parkingLotId: "open", availableSpaces: 8, status: "available" }],
  ]);

  const [first] = rankRecommendations(destination, lots, availability);
  assert.equal(first.parkingLot.id, "open");
});

test("rankRecommendations keeps unknown availability with clear reason", () => {
  const [first] = rankRecommendations(destination, [
    { id: "unknown", name: "Unknown", lat: 24.9576, lng: 121.2408 },
  ]);

  assert.equal(first.availability.status, "unknown");
  assert.ok(first.reasons.includes("unknown availability"));
});
