import test from "node:test";
import assert from "node:assert/strict";

import {
  destinationFromUrl,
  isGoogleMapsUrl,
  parseGoogleMapsCoordinates,
  placeNameFromGoogleMapsUrl,
  resolveGoogleMapsLink,
} from "../../public/src/search/google-maps-link.js";

const PLACE_URL =
  "https://www.google.com/maps/place/%E4%B8%89%E9%87%8D%E9%B4%A8%E9%9C%B8%E7%8E%8B/@25.0633753,121.4051068,12017m/data=!3m1!1e3!4m6!3m5!1sabc!8m2!3d25.0779507!4d121.4900227";

test("parseGoogleMapsCoordinates prefers place coordinates over viewport coordinates", () => {
  assert.deepEqual(parseGoogleMapsCoordinates(PLACE_URL), {
    lat: 25.0779507,
    lng: 121.4900227,
  });
});

test("placeNameFromGoogleMapsUrl reads a place path name", () => {
  assert.equal(placeNameFromGoogleMapsUrl(PLACE_URL), "三重鴨霸王");
});

test("destinationFromUrl includes coordinates and city inference", () => {
  const destination = destinationFromUrl(PLACE_URL);

  assert.equal(destination.name, "三重鴨霸王");
  assert.equal(destination.cityKey, "NewTaipei");
  assert.equal(destination.source, "google-maps-link");
});

test("parseGoogleMapsCoordinates supports Maps URL query coordinates", () => {
  const url = "https://www.google.com/maps/search/?api=1&query=24.9575%2C121.2408";
  assert.deepEqual(parseGoogleMapsCoordinates(url), { lat: 24.9575, lng: 121.2408 });
});

test("resolveGoogleMapsLink follows a short Google Maps redirect", async () => {
  const destination = await resolveGoogleMapsLink("https://maps.app.goo.gl/example", {
    fetchImpl: async () => new Response("", { status: 200, headers: {} }),
  });

  assert.equal(destination, null);

  const resolvedDestination = await resolveGoogleMapsLink("https://maps.app.goo.gl/example", {
    fetchImpl: async () => ({
      url: PLACE_URL,
      text: async () => "",
    }),
  });

  assert.equal(resolvedDestination.name, "三重鴨霸王");
  assert.equal(resolvedDestination.lat, 25.0779507);
});

test("isGoogleMapsUrl rejects non-Google URLs", () => {
  assert.equal(isGoogleMapsUrl("https://maps.app.goo.gl/example"), true);
  assert.equal(isGoogleMapsUrl("https://example.com/maps"), false);
});
