import test from "node:test";
import assert from "node:assert/strict";

import {
  destinationFromUrl,
  googleMapsQueryFromUrl,
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

test("parseGoogleMapsCoordinates supports preview pb longitude-latitude pairs", () => {
  const html = 'href="/maps/preview/place?q=example&amp;pb=%211m15%213m12%211m3%211d28918%212d121.46769920000001%213d25.041305599999994"';

  assert.deepEqual(parseGoogleMapsCoordinates(html), {
    lat: 25.041305599999994,
    lng: 121.46769920000001,
  });
});

test("parseGoogleMapsCoordinates supports Maps Lite state coordinates", () => {
  const html =
    'window.APP_INITIALIZATION_STATE=[[[57821.12571022015,121.4742528,25.0740736],[0,0,0],[1024,768],13.1],"token"];';

  assert.deepEqual(parseGoogleMapsCoordinates(html), {
    lat: 25.0740736,
    lng: 121.4742528,
  });
});

test("googleMapsQueryFromUrl reads address query links from mobile sharing", () => {
  const url =
    "https://www.google.com/maps?q=242%E6%96%B0%E5%8C%97%E5%B8%82%E6%96%B0%E8%8E%8A%E5%8D%80%E4%B8%AD%E5%B9%B3%E8%B7%AF138%E8%99%9F+Sin+Ma+Express&ftid=example";

  assert.equal(googleMapsQueryFromUrl(url), "242新北市新莊區中平路138號 Sin Ma Express");
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

test("resolveGoogleMapsLink retries a short link without tracking parameters", async () => {
  const requestedUrls = [];
  const resolvedDestination = await resolveGoogleMapsLink("https://maps.app.goo.gl/example?g_st=ic", {
    fetchImpl: async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes("g_st=ic")) {
        return {
          url: String(url),
          text: async () => "",
        };
      }

      return {
        url: PLACE_URL,
        text: async () => "",
      };
    },
  });

  assert.deepEqual(requestedUrls, ["https://maps.app.goo.gl/example?g_st=ic", "https://maps.app.goo.gl/example"]);
  assert.equal(resolvedDestination.name, "三重鴨霸王");
});

test("resolveGoogleMapsLink geocodes mobile shared query links when no coordinates are present", async () => {
  const resolvedDestination = await resolveGoogleMapsLink("https://maps.app.goo.gl/example", {
    fetchImpl: async () => ({
      url: "https://www.google.com/maps?q=242%E6%96%B0%E5%8C%97%E5%B8%82%E6%96%B0%E8%8E%8A%E5%8D%80%E4%B8%AD%E5%B9%B3%E8%B7%AF138%E8%99%9F+Sin+Ma+Express&ftid=example",
      text: async () => "",
    }),
    geocodeImpl: async (query) => ({
      results: [
        {
          label: query,
          lat: 25.0478,
          lng: 121.444,
          cityKey: "NewTaipei",
        },
      ],
    }),
  });

  assert.equal(resolvedDestination.name, "242新北市新莊區中平路138號 Sin Ma Express");
  assert.equal(resolvedDestination.cityKey, "NewTaipei");
});

test("resolveGoogleMapsLink reads coordinates from mobile share preview html", async () => {
  const resolvedDestination = await resolveGoogleMapsLink("https://maps.app.goo.gl/example", {
    fetchImpl: async () => ({
      url: "https://www.google.com/maps?ftid=example",
      text: async () =>
        'href="/maps/preview/place?q=example&amp;pb=%211m15%213m12%211m3%211d28918%212d121.46769920000001%213d25.041305599999994"',
    }),
  });

  assert.equal(resolvedDestination.name, "Google Maps 分享位置");
  assert.equal(resolvedDestination.lat, 25.041305599999994);
  assert.equal(resolvedDestination.lng, 121.46769920000001);
});

test("resolveGoogleMapsLink falls back to preview coordinates when a shared query cannot be geocoded", async () => {
  const resolvedDestination = await resolveGoogleMapsLink("https://maps.app.goo.gl/example", {
    fetchImpl: async () => ({
      url: "https://www.google.com/maps?q=302%E6%96%B0%E7%AB%B9%E7%B8%A3%E7%AB%B9%E5%8C%97%E5%B8%82%E6%96%87%E5%B1%B1%E6%AD%A5%E9%81%93%E8%A7%80%E6%99%AF%E8%87%BA&ftid=example",
      text: async () =>
        'href="/maps/preview/place?q=example&amp;pb=%211m15%213m12%211m3%211d28918%212d121.46769920000001%213d25.041305599999994"',
    }),
    geocodeImpl: async () => ({ results: [] }),
  });

  assert.equal(resolvedDestination.name, "302新竹縣竹北市文山步道觀景臺");
  assert.equal(resolvedDestination.lat, 25.041305599999994);
  assert.equal(resolvedDestination.lng, 121.46769920000001);
});

test("isGoogleMapsUrl rejects non-Google URLs", () => {
  assert.equal(isGoogleMapsUrl("https://maps.app.goo.gl/example"), true);
  assert.equal(isGoogleMapsUrl("https://example.com/maps"), false);
});
