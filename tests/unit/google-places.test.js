import test from "node:test";
import assert from "node:assert/strict";

import { searchGoogleParkingNearby, searchGooglePlacesText } from "../../worker/google-places.js";

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

test("searchGoogleParkingNearby calls Nearby Search for parking lots", async () => {
  const lots = await searchGoogleParkingNearby(
    { lat: 25.0319, lng: 121.558 },
    {
      apiKey: "google-key",
      city: "Taipei",
      fetchImpl: async (url, init) => {
        assert.equal(String(url), "https://places.googleapis.com/v1/places:searchNearby");
        assert.equal(init.method, "POST");
        assert.equal(init.headers["X-Goog-Api-Key"], "google-key");
        assert.equal(init.headers["X-Goog-FieldMask"], "places.id,places.displayName,places.formattedAddress,places.location,places.types");

        const body = JSON.parse(init.body);
        assert.deepEqual(body.includedTypes, ["parking"]);
        assert.equal(body.maxResultCount, 5);
        assert.equal(body.locationRestriction.circle.center.latitude, 25.0319);
        assert.equal(body.locationRestriction.circle.radius, 1500);

        return new Response(
          JSON.stringify({
            places: [
              {
                id: "google-place-id",
                displayName: { text: "嘟嘟房停車場-府前廣場站" },
                formattedAddress: "台北市信義區",
                location: { latitude: 25.032, longitude: 121.5581 },
                types: ["parking"],
              },
            ],
          }),
        );
      },
    },
  );

  assert.equal(lots[0].id, "google:google-place-id");
  assert.equal(lots[0].name, "嘟嘟房停車場-府前廣場站");
  assert.equal(lots[0].dataSource, "Google Places");
  assert.equal(lots[0].city, "Taipei");
});
