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
});
