import test from "node:test";
import assert from "node:assert/strict";

import { recommendationHtml } from "../../public/src/ui/app.js";

test("recommendationHtml includes one-tap navigation and fallback coordinates", () => {
  const html = recommendationHtml({
    rank: 1,
    parkingLot: { name: "中原停車場", lat: 24.9575, lng: 121.2408 },
    availability: { status: "available", availableSpaces: 3 },
    distanceMeters: 120,
    timeEstimateMinutes: 1,
    reasons: ["nearby", "has spaces"],
    navigationUrl: "https://www.google.com/maps/dir/?api=1&destination=24.9575%2C121.2408",
  });

  assert.match(html, /導航過去/);
  assert.match(html, /24\.95750, 121\.24080/);
});
