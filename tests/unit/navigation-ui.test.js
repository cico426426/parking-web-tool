import test from "node:test";
import assert from "node:assert/strict";

import { recommendationHtml } from "../../public/src/ui/app.js";

test("recommendationHtml includes one-tap navigation and fallback coordinates", () => {
  const html = recommendationHtml({
    rank: 1,
    parkingLot: {
      name: "中原停車場",
      lat: 24.9575,
      lng: 121.2408,
      address: "桃園市中壢區中北路",
      totalSpaces: 40,
      feeSummary: "每小時 30 元",
      sourceUpdatedAt: "2026-07-12T10:20:00+08:00",
    },
    availability: { status: "available", availableSpaces: 3, updatedAt: "2026-07-12T10:30:00+08:00" },
    distanceMeters: 120,
    timeEstimateMinutes: 1,
    reasons: ["nearby", "has spaces"],
    navigationUrl: "https://www.google.com/maps/dir/?api=1&destination=24.9575%2C121.2408",
  });

  assert.match(html, /導航過去/);
  assert.match(html, /步行約 1 分鐘/);
  assert.match(html, /離目的地近/);
  assert.match(html, /有即時空位/);
  assert.match(html, /桃園市中壢區中北路/);
  assert.match(html, /每小時 30 元/);
  assert.match(html, /總車位/);
  assert.match(html, /24\.95750, 121\.24080/);
});
