import test from "node:test";
import assert from "node:assert/strict";

import { searchGooglePlacesText } from "../../worker/google-places.js";

test("searchGooglePlacesText calls Places Text Search with the minimal field mask", async () => {
  const payload = await searchGooglePlacesText("三重鴨霸王", {
    apiKey: "google-key",
    fetchImpl: async (url, init) => {
      assert.equal(String(url), "https://places.googleapis.com/v1/places:searchText");
      assert.equal(init.method, "POST");
      assert.equal(init.headers["X-Goog-Api-Key"], "google-key");
      assert.equal(init.headers["X-Goog-FieldMask"], "places.displayName,places.formattedAddress,places.location");

      const body = JSON.parse(init.body);
      assert.equal(body.textQuery, "三重鴨霸王");
      assert.equal(body.regionCode, "TW");
      assert.equal(body.languageCode, "zh-TW");
      assert.equal(body.maxResultCount, 1);

      return new Response(
        JSON.stringify({
          places: [
            {
              displayName: { text: "三重鴨霸王" },
              formattedAddress: "新北市三重區中央北路",
              location: { latitude: 25.0779507, longitude: 121.4900227 },
            },
          ],
        }),
      );
    },
  });

  assert.equal(payload.results[0].label, "三重鴨霸王");
  assert.equal(payload.results[0].cityKey, "NewTaipei");
  assert.equal(payload.results[0].provider, "google-places");
});

test("searchGooglePlacesText returns no results when no key is configured", async () => {
  const payload = await searchGooglePlacesText("三重鴨霸王", {
    fetchImpl: async () => {
      throw new Error("fetch should not be called without an API key");
    },
  });

  assert.deepEqual(payload.results, []);
});
