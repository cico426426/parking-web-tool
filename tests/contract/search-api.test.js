import test from "node:test";
import assert from "node:assert/strict";

import worker from "../../worker/index.js";

const env = {
  OWNER_ACCESS_SECRET: "1234",
  TDX_ID: "id",
  TDX_SECRET: "secret",
  RATE_LIMIT_MAX: "100",
  __fetch: async (url) => {
    const href = String(url);
    if (href.includes("nominatim")) {
      return new Response(
        JSON.stringify([
          {
            place_id: 1,
            name: "中原大學",
            display_name: "中原大學, 中壢區, 桃園市",
            lat: "24.9575",
            lon: "121.2408",
            address: { city: "桃園市" },
          },
        ]),
      );
    }
    return new Response("{}", { status: 404 });
  },
};

test("/api/search rejects missing authorization before provider calls", async () => {
  const response = await worker.fetch(new Request("https://app.test/api/search?q=中原大學"), env);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHORIZED");
});

test("/api/search returns suggestions with valid authorization", async () => {
  const response = await worker.fetch(
    new Request("https://app.test/api/search?q=中原大學", {
      headers: { Authorization: "Bearer 1234" },
    }),
    env,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.results[0].label, "中原大學");
});

test("/api/search rate limits over quota", async () => {
  const limitedEnv = { ...env, RATE_LIMIT_MAX: "0", OWNER_ACCESS_SECRET: "limited-secret" };
  const response = await worker.fetch(
    new Request("https://app.test/api/search?q=中原大學", {
      headers: { Authorization: "Bearer limited-secret" },
    }),
    limitedEnv,
  );
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(body.error.code, "RATE_LIMITED");
});
