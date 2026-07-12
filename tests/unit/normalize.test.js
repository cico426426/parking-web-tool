import test from "node:test";
import assert from "node:assert/strict";

import { buildAvailabilityMap, extractPosition, normalizeCarPark } from "../../public/src/parking/normalize.js";

test("extractPosition reads TDX PositionLat and PositionLon", () => {
  assert.deepEqual(
    extractPosition({ CarParkPosition: { PositionLat: 24.1, PositionLon: 121.2 } }),
    { lat: 24.1, lng: 121.2 },
  );
});

test("normalizeCarPark excludes records without coordinates", () => {
  assert.equal(normalizeCarPark({ CarParkID: "A1", CarParkName: { Zh_tw: "No Position" } }), null);
});

test("normalizeCarPark maps localized fields", () => {
  const lot = normalizeCarPark(
    {
      CarParkID: "A1",
      CarParkName: { Zh_tw: "中壢停車場" },
      CarParkPosition: { PositionLat: "24.95", PositionLon: "121.22" },
      TotalSpaces: 42,
    },
    "Taoyuan",
  );

  assert.equal(lot.id, "A1");
  assert.equal(lot.name, "中壢停車場");
  assert.equal(lot.city, "Taoyuan");
  assert.equal(lot.totalSpaces, 42);
});

test("buildAvailabilityMap tracks available and full states", () => {
  const map = buildAvailabilityMap([
    { CarParkID: "A1", AvailableSpaces: 3 },
    { CarParkID: "A2", AvailableSpaces: 0 },
    { CarParkID: "A3" },
  ]);

  assert.equal(map.get("A1").status, "available");
  assert.equal(map.get("A2").status, "full");
  assert.equal(map.get("A3").status, "unknown");
});

test("normalizers support TDX wrapper objects", async () => {
  const module = await import("../../public/src/parking/normalize.js");
  const lots = module.normalizeCarParks({
    CarParks: [
      {
        CarParkID: "A1",
        CarParkName: { Zh_tw: "Wrapper Lot" },
        CarParkPosition: { PositionLat: 24.1, PositionLon: 121.2 },
      },
    ],
  });
  const availability = module.buildAvailabilityMap({
    ParkingAvailabilities: [{ CarParkID: "A1", Availabilities: [{ AvailableSpaces: 5 }] }],
  });

  assert.equal(lots.length, 1);
  assert.equal(availability.get("A1").availableSpaces, 5);
});
