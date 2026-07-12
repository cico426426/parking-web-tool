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
