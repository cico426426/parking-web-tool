import test from "node:test";
import assert from "node:assert/strict";

import worker from "../../worker/index.js";

const resolvedUrl =
  "https://www.google.com/maps/place/%E4%B8%89%E9%87%8D%E9%B4%A8%E9%9C%B8%E7%8E%8B/@25.0633753,121.4051068,12017m/data=!3m1!1e3!4m6!3m5!1sabc!8m2!3d25.0779507!4d121.4900227";

test("/api/resolve-map-url rejects missing authorization", async () => {
  const response = await worker.fetch(
    new Request("https://app.test/api/resolve-map-url?url=https%3A%2F%2Fmaps.app.goo.gl%2Fexample"),
    { OWNER_ACCESS_SECRET: "1234" },
  );
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHORIZED");
});

test("/api/resolve-map-url resolves a Google Maps short link", async () => {
  const env = {
    OWNER_ACCESS_SECRET: "1234",
    RATE_LIMIT_MAX: "100",
    __fetch: async () => ({
      url: resolvedUrl,
      text: async () => "",
    }),
  };
  const response = await worker.fetch(
    new Request("https://app.test/api/resolve-map-url?url=https%3A%2F%2Fmaps.app.goo.gl%2Fexample", {
      headers: { Authorization: "Bearer 1234" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.destination.name, "三重鴨霸王");
  assert.equal(body.destination.cityKey, "NewTaipei");
  assert.equal(body.originalMapUrl, "https://maps.app.goo.gl/example");
  assert.equal(body.canonicalMapUrl, "https://www.google.com/maps/search/?api=1&query=25.0779507%2C121.4900227");
  assert.equal(body.destination.canonicalMapUrl, body.canonicalMapUrl);
});

test("/api/resolve-map-url geocodes mobile shared links without coordinates", async () => {
  const env = {
    OWNER_ACCESS_SECRET: "1234",
    RATE_LIMIT_MAX: "100",
    __fetch: async (url) => {
      const href = String(url);
      if (href.includes("nominatim")) {
        return new Response(
          JSON.stringify([
            {
              place_id: 1,
              name: "Sin Ma Express",
              display_name: "Sin Ma Express, 新莊區, 新北市",
              lat: "25.0478",
              lon: "121.444",
              address: { city: "新北市" },
            },
          ]),
        );
      }
      return {
        url: "https://www.google.com/maps?q=242%E6%96%B0%E5%8C%97%E5%B8%82%E6%96%B0%E8%8E%8A%E5%8D%80%E4%B8%AD%E5%B9%B3%E8%B7%AF138%E8%99%9F+Sin+Ma+Express&ftid=example",
        text: async () => "",
      };
    },
  };
  const response = await worker.fetch(
    new Request("https://app.test/api/resolve-map-url?url=https%3A%2F%2Fmaps.app.goo.gl%2Fpreview-example", {
      headers: { Authorization: "Bearer 1234" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.destination.name, "Sin Ma Express");
  assert.equal(body.destination.cityKey, "NewTaipei");
});

test("/api/resolve-map-url uses Google Places for mobile shared query links when configured", async () => {
  const env = {
    OWNER_ACCESS_SECRET: "1234",
    RATE_LIMIT_MAX: "100",
    GOOGLE_MAPS_API_KEY: "google-key",
    __fetch: async (url, init) => {
      const href = String(url);
      if (href.includes("places.googleapis.com")) {
        assert.equal(init.headers["X-Goog-Api-Key"], "google-key");
        return new Response(
          JSON.stringify({
            places: [
              {
                displayName: { text: "文山步道觀景臺" },
                formattedAddress: "新竹縣竹北市文山步道觀景臺",
                location: { latitude: 24.8389, longitude: 121.0372 },
              },
            ],
          }),
        );
      }
      return {
        url: "https://www.google.com/maps?q=302%E6%96%B0%E7%AB%B9%E7%B8%A3%E7%AB%B9%E5%8C%97%E5%B8%82%E6%96%87%E5%B1%B1%E6%AD%A5%E9%81%93%E8%A7%80%E6%99%AF%E8%87%BA&ftid=example",
        text: async () => "",
      };
    },
  };
  const response = await worker.fetch(
    new Request("https://app.test/api/resolve-map-url?url=https%3A%2F%2Fmaps.app.goo.gl%2Fgoogle-places-example", {
      headers: { Authorization: "Bearer 1234" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.destination.name, "文山步道觀景臺");
  assert.equal(body.destination.cityKey, "HsinchuCounty");
  assert.equal(body.destination.lat, 24.8389);
});

test("/api/resolve-map-url reads coordinates from mobile share preview html", async () => {
  const env = {
    OWNER_ACCESS_SECRET: "1234",
    RATE_LIMIT_MAX: "100",
    __fetch: async () => ({
      url: "https://www.google.com/maps?ftid=example",
      text: async () =>
        'href="/maps/preview/place?q=example&amp;pb=%211m15%213m12%211m3%211d28918%212d121.46769920000001%213d25.041305599999994"',
    }),
  };
  const response = await worker.fetch(
    new Request("https://app.test/api/resolve-map-url?url=https%3A%2F%2Fmaps.app.goo.gl%2Fmobile-example", {
      headers: { Authorization: "Bearer 1234" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.destination.lat, 25.041305599999994);
  assert.equal(body.destination.lng, 121.46769920000001);
});

test("/api/resolve-map-url falls back to preview coordinates for text query links", async () => {
  const env = {
    OWNER_ACCESS_SECRET: "1234",
    RATE_LIMIT_MAX: "100",
    __fetch: async (url) => {
      const href = String(url);
      if (href.includes("nominatim")) {
        return new Response(JSON.stringify([]));
      }
      return {
        url: "https://www.google.com/maps?q=302%E6%96%B0%E7%AB%B9%E7%B8%A3%E7%AB%B9%E5%8C%97%E5%B8%82%E6%96%87%E5%B1%B1%E6%AD%A5%E9%81%93%E8%A7%80%E6%99%AF%E8%87%BA&ftid=example",
        text: async () =>
          'href="/maps/preview/place?q=example&amp;pb=%211m15%213m12%211m3%211d28918%212d121.46769920000001%213d25.041305599999994"',
      };
    },
  };
  const response = await worker.fetch(
    new Request("https://app.test/api/resolve-map-url?url=https%3A%2F%2Fmaps.app.goo.gl%2Fstale-preview", {
      headers: { Authorization: "Bearer 1234" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.destination.name, "302新竹縣竹北市文山步道觀景臺");
  assert.equal(body.destination.lat, 25.041305599999994);
  assert.equal(body.destination.lng, 121.46769920000001);
  assert.equal(body.canonicalMapUrl, "https://www.google.com/maps/search/?api=1&query=25.041305599999994%2C121.46769920000001");
});
