import test from "node:test";
import assert from "node:assert/strict";

import { searchDestinations } from "../../public/src/search/geocode.js";

test("searchDestinations returns normalized provider results", async () => {
  const result = await searchDestinations("中原大學", {
    fetchImpl: async () =>
      new Response(
        JSON.stringify([
          {
            place_id: 1,
            name: "中原大學",
            display_name: "中原大學, 中壢區, 桃園市",
            lat: "24.9575",
            lon: "121.2408",
            importance: 0.8,
            address: { city: "桃園市", road: "中北路" },
          },
        ]),
      ),
  });

  assert.equal(result.results[0].label, "中原大學");
  assert.equal(result.results[0].lat, 24.9575);
  assert.equal(result.results[0].confidence, "high");
  assert.equal(result.results[0].cityKey, "Taoyuan");
});

test("searchDestinations returns empty results for empty query", async () => {
  const result = await searchDestinations(" ");
  assert.deepEqual(result.results, []);
});

test("searchDestinations throws on provider failure", async () => {
  await assert.rejects(
    () =>
      searchDestinations("中原大學", {
        fetchImpl: async () => new Response("fail", { status: 503 }),
      }),
    /Search provider failed/,
  );
});
