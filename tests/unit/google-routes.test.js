import test from "node:test";
import assert from "node:assert/strict";

import { computeWalkingRouteMatrix } from "../../worker/google-routes.js";

test("computeWalkingRouteMatrix calls Routes API with walking origins and one destination", async () => {
  const destination = { lat: 25.047, lng: 121.445 };
  const lots = [
    { id: "A", lat: 25.046, lng: 121.444 },
    { id: "B", lat: 25.045, lng: 121.443 },
  ];

  const routes = await computeWalkingRouteMatrix(destination, lots, {
    apiKey: "google-key",
    fetchImpl: async (url, init) => {
      assert.equal(String(url), "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix");
      assert.equal(init.method, "POST");
      assert.equal(init.headers["X-Goog-Api-Key"], "google-key");
      assert.equal(init.headers["X-Goog-FieldMask"], "originIndex,destinationIndex,duration,distanceMeters,status,condition");

      const body = JSON.parse(init.body);
      assert.equal(body.travelMode, "WALK");
      assert.equal(body.origins.length, 2);
      assert.equal(body.destinations.length, 1);
      assert.equal(body.origins[0].waypoint.location.latLng.latitude, 25.046);
      assert.equal(body.destinations[0].waypoint.location.latLng.longitude, 121.445);

      return new Response(
        JSON.stringify([
          { originIndex: 0, destinationIndex: 0, duration: "1020s", distanceMeters: 1200, condition: "ROUTE_EXISTS" },
          { originIndex: 1, destinationIndex: 0, duration: "480s", distanceMeters: 500, condition: "ROUTE_EXISTS" },
        ]),
      );
    },
  });

  assert.equal(routes.get("A").durationSeconds, 1020);
  assert.equal(routes.get("B").distanceMeters, 500);
});

test("computeWalkingRouteMatrix returns no routes when no key is configured", async () => {
  const routes = await computeWalkingRouteMatrix({ lat: 1, lng: 1 }, [{ id: "A", lat: 1, lng: 1 }], {
    fetchImpl: async () => {
      throw new Error("fetch should not be called without an API key");
    },
  });

  assert.equal(routes.size, 0);
});
