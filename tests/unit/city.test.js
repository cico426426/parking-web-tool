import test from "node:test";
import assert from "node:assert/strict";

import { buildTdxParkingUrls, cityKeyFromText, inferCityFromAddress } from "../../public/src/parking/city.js";

test("cityKeyFromText maps common Taiwan city names to TDX keys", () => {
  assert.equal(cityKeyFromText("臺北市"), "Taipei");
  assert.equal(cityKeyFromText("台北市"), "Taipei");
  assert.equal(cityKeyFromText("新北市"), "NewTaipei");
  assert.equal(cityKeyFromText("桃園市"), "Taoyuan");
  assert.equal(cityKeyFromText("宜蘭縣"), "YilanCounty");
});

test("inferCityFromAddress uses geocoder address fields", () => {
  assert.equal(inferCityFromAddress({ city: "臺北市" }), "Taipei");
  assert.equal(inferCityFromAddress({ county: "花蓮縣" }), "HualienCounty");
  assert.equal(inferCityFromAddress({ state: "桃園市" }), "Taoyuan");
});

test("buildTdxParkingUrls can request nearby car parks by destination coordinates", () => {
  const urls = buildTdxParkingUrls("NewTaipei", {
    lat: 25.0779507,
    lng: 121.4900227,
    radiusMeters: 3000,
  });
  const carParks = new URL(urls.carParks);

  assert.equal(carParks.pathname, "/api/basic/v1/Parking/OffStreet/CarPark/City/NewTaipei");
  assert.equal(carParks.searchParams.get("$format"), "JSON");
  assert.equal(
    carParks.searchParams.get("$spatialFilter"),
    "nearby(CarParkPosition,25.0779507,121.4900227,3000)",
  );
});
