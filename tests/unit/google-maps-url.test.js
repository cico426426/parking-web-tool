import test from "node:test";
import assert from "node:assert/strict";

import { buildGoogleMapsDirectionsUrl } from "../../public/src/navigation/google-maps-url.js";

test("buildGoogleMapsDirectionsUrl creates a directions URL", () => {
  assert.equal(
    buildGoogleMapsDirectionsUrl(24.958, 121.241),
    "https://www.google.com/maps/dir/?api=1&destination=24.958%2C121.241",
  );
});

test("buildGoogleMapsDirectionsUrl rejects invalid coordinates", () => {
  assert.throws(() => buildGoogleMapsDirectionsUrl("bad", 121.241), /Valid latitude/);
});
