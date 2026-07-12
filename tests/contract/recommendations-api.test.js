import test from "node:test";
import assert from "node:assert/strict";

import worker from "../../worker/index.js";

test("/api/recommendations merges candidate cities and ranks by destination distance", async () => {
  const requestedUrls = [];
  const env = {
    OWNER_ACCESS_SECRET: "1234",
    TDX_ID: "id",
    TDX_SECRET: "secret",
    RATE_LIMIT_MAX: "100",
    __fetch: async (url) => {
      const href = String(url);
      requestedUrls.push(href);

      if (href.includes("openid-connect/token")) {
        return new Response(JSON.stringify({ access_token: "token" }));
      }

      if (href.includes("/CarPark/City/NewTaipei")) {
        return new Response(
          JSON.stringify({
            CarParks: [
              {
                CarParkID: "NTP-1",
                CarParkName: { Zh_tw: "新莊近停車場" },
                CarParkPosition: { PositionLat: 25.0414, PositionLon: 121.4678 },
              },
            ],
          }),
        );
      }

      if (href.includes("/ParkingAvailability/City/NewTaipei")) {
        return new Response(JSON.stringify({ ParkingAvailabilities: [{ CarParkID: "NTP-1", AvailableSpaces: 5 }] }));
      }

      if (href.includes("/CarPark/City/Taoyuan")) {
        return new Response(
          JSON.stringify({
            CarParks: [
              {
                CarParkID: "TY-1",
                CarParkName: { Zh_tw: "桃園遠停車場" },
                CarParkPosition: { PositionLat: 24.9536, PositionLon: 121.2251 },
              },
            ],
          }),
        );
      }

      if (href.includes("/ParkingAvailability/City/Taoyuan")) {
        return new Response(JSON.stringify({ ParkingAvailabilities: [{ CarParkID: "TY-1", AvailableSpaces: 50 }] }));
      }

      if (href.includes("/CarPark/City/Taipei")) {
        return new Response(
          JSON.stringify({
            CarParks: [
              {
                CarParkID: "TPE-1",
                CarParkName: { Zh_tw: "台北側停車場" },
                CarParkPosition: { PositionLat: 25.05, PositionLon: 121.5 },
              },
            ],
          }),
        );
      }

      if (href.includes("/ParkingAvailability/City/Taipei")) {
        return new Response(JSON.stringify({ ParkingAvailabilities: [{ CarParkID: "TPE-1", AvailableSpaces: 20 }] }));
      }

      return new Response("{}", { status: 404 });
    },
  };

  const response = await worker.fetch(
    new Request("https://app.test/api/recommendations?lat=25.0413056&lng=121.4676992&city=NewTaipei", {
      headers: { Authorization: "Bearer 1234" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.cities, ["NewTaipei", "Taoyuan", "Taipei"]);
  assert.equal(body.recommendations[0].parkingLot.id, "NTP-1");
  assert.ok(requestedUrls.some((url) => url.includes("/CarPark/City/NewTaipei")));
  assert.ok(requestedUrls.some((url) => url.includes("/CarPark/City/Taoyuan")));
  assert.ok(requestedUrls.some((url) => url.includes("/CarPark/City/Taipei")));
});

test("/api/recommendations reverse geocodes destination city when city is omitted", async () => {
  const requestedUrls = [];
  const env = {
    OWNER_ACCESS_SECRET: "reverse-secret",
    TDX_ID: "id",
    TDX_SECRET: "secret",
    RATE_LIMIT_MAX: "100",
    __fetch: async (url) => {
      const href = String(url);
      requestedUrls.push(href);

      if (href.includes("openid-connect/token")) {
        return new Response(JSON.stringify({ access_token: "token" }));
      }

      if (href.includes("nominatim") && href.includes("/reverse")) {
        return new Response(JSON.stringify({ address: { city: "臺中市" } }));
      }

      if (href.includes("/CarPark/City/Taichung")) {
        return new Response(
          JSON.stringify({
            CarParks: [
              {
                CarParkID: "TC-1",
                CarParkName: { Zh_tw: "台中近停車場" },
                CarParkPosition: { PositionLat: 24.1478, PositionLon: 120.6737 },
              },
            ],
          }),
        );
      }

      if (href.includes("/ParkingAvailability/City/Taichung")) {
        return new Response(JSON.stringify({ ParkingAvailabilities: [{ CarParkID: "TC-1", AvailableSpaces: 8 }] }));
      }

      if (href.includes("/CarPark/City/Taoyuan") || href.includes("/ParkingAvailability/City/Taoyuan")) {
        throw new Error("Taoyuan should not be queried when reverse geocoding finds Taichung");
      }

      return new Response("{}", { status: 404 });
    },
  };

  const response = await worker.fetch(
    new Request("https://app.test/api/recommendations?lat=24.1477&lng=120.6736", {
      headers: { Authorization: "Bearer reverse-secret" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.cities, ["Taichung"]);
  assert.equal(body.recommendations[0].parkingLot.id, "TC-1");
  assert.ok(requestedUrls.some((url) => url.includes("/reverse")));
  assert.ok(requestedUrls.some((url) => url.includes("/CarPark/City/Taichung")));
});

test("/api/recommendations enriches top candidates with Google walking routes", async () => {
  const requestedUrls = [];
  const env = {
    OWNER_ACCESS_SECRET: "route-secret",
    TDX_ID: "id",
    TDX_SECRET: "secret",
    RATE_LIMIT_MAX: "100",
    GOOGLE_MAPS_API_KEY: "google-key",
    __fetch: async (url, init) => {
      const href = String(url);
      requestedUrls.push(href);

      if (href.includes("openid-connect/token")) {
        return new Response(JSON.stringify({ access_token: "token" }));
      }

      if (href.includes("routes.googleapis.com")) {
        assert.equal(init.headers["X-Goog-Api-Key"], "google-key");
        const body = JSON.parse(init.body);
        assert.equal(body.travelMode, "WALK");
        assert.equal(body.origins.length, 2);
        return new Response(
          JSON.stringify([
            { originIndex: 0, destinationIndex: 0, duration: "1200s", distanceMeters: 1300, condition: "ROUTE_EXISTS" },
            { originIndex: 1, destinationIndex: 0, duration: "300s", distanceMeters: 400, condition: "ROUTE_EXISTS" },
          ]),
        );
      }

      if (href.includes("/CarPark/City/NewTaipei")) {
        return new Response(
          JSON.stringify({
            CarParks: [
              {
                CarParkID: "near-straight",
                CarParkName: { Zh_tw: "直線近但繞路" },
                CarParkPosition: { PositionLat: 25.0414, PositionLon: 121.4678 },
              },
              {
                CarParkID: "far-straight",
                CarParkName: { Zh_tw: "直線遠但好走" },
                CarParkPosition: { PositionLat: 25.044, PositionLon: 121.4685 },
              },
            ],
          }),
        );
      }

      if (href.includes("/ParkingAvailability/City/NewTaipei")) {
        return new Response(
          JSON.stringify({
            ParkingAvailabilities: [
              { CarParkID: "near-straight", AvailableSpaces: 5 },
              { CarParkID: "far-straight", AvailableSpaces: 5 },
            ],
          }),
        );
      }

      return new Response("{}", { status: 404 });
    },
  };

  const response = await worker.fetch(
    new Request("https://app.test/api/recommendations?lat=25.0423056&lng=121.4686992&city=NewTaipei&limit=5", {
      headers: { Authorization: "Bearer route-secret" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.recommendations[0].parkingLot.id, "far-straight");
  assert.equal(body.recommendations[0].distanceMethod, "google-routes-walking");
  assert.equal(body.recommendations[0].timeEstimateMethod, "google-routes");
  assert.equal(body.recommendations[0].timeEstimateMinutes, 5);
  assert.ok(requestedUrls.some((url) => url.includes("routes.googleapis.com")));
});

test("/api/recommendations merges Google parking lots with TDX candidates", async () => {
  const requestedUrls = [];
  const env = {
    OWNER_ACCESS_SECRET: "google-parking-secret",
    TDX_ID: "id",
    TDX_SECRET: "secret",
    RATE_LIMIT_MAX: "100",
    GOOGLE_MAPS_API_KEY: "google-key",
    __fetch: async (url, init) => {
      const href = String(url);
      requestedUrls.push(href);

      if (href.includes("openid-connect/token")) {
        return new Response(JSON.stringify({ access_token: "token" }));
      }

      if (href.includes("places.googleapis.com/v1/places:searchNearby")) {
        assert.equal(init.headers["X-Goog-Api-Key"], "google-key");
        const body = JSON.parse(init.body);
        assert.deepEqual(body.includedTypes, ["parking"]);
        return new Response(
          JSON.stringify({
            places: [
              {
                id: "private-parking",
                displayName: { text: "嘟嘟房停車場-府前廣場站" },
                formattedAddress: "台北市信義區",
                location: { latitude: 25.032, longitude: 121.558 },
                types: ["parking"],
              },
            ],
          }),
        );
      }

      if (href.includes("routes.googleapis.com")) {
        return new Response(
          JSON.stringify([
            { originIndex: 0, destinationIndex: 0, duration: "600s", distanceMeters: 700, condition: "ROUTE_EXISTS" },
            { originIndex: 1, destinationIndex: 0, duration: "300s", distanceMeters: 250, condition: "ROUTE_EXISTS" },
          ]),
        );
      }

      if (href.includes("/CarPark/City/Taipei")) {
        return new Response(
          JSON.stringify({
            CarParks: [
              {
                CarParkID: "tdx-parking",
                CarParkName: { Zh_tw: "公有停車場" },
                CarParkPosition: { PositionLat: 25.034, PositionLon: 121.559 },
              },
            ],
          }),
        );
      }

      if (href.includes("/ParkingAvailability/City/Taipei")) {
        return new Response(JSON.stringify({ ParkingAvailabilities: [{ CarParkID: "tdx-parking", AvailableSpaces: 3 }] }));
      }

      return new Response("{}", { status: 404 });
    },
  };

  const response = await worker.fetch(
    new Request("https://app.test/api/recommendations?lat=25.0319&lng=121.558&city=Taipei&limit=5", {
      headers: { Authorization: "Bearer google-parking-secret" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.recommendations.some((item) => item.parkingLot.id === "google:private-parking"));
  const googleRecommendation = body.recommendations.find((item) => item.parkingLot.id === "google:private-parking");
  assert.equal(googleRecommendation.parkingLot.dataSource, "Google Places");
  assert.equal(googleRecommendation.availability.status, "unknown");
  assert.ok(requestedUrls.some((url) => url.includes("places.googleapis.com/v1/places:searchNearby")));
});
