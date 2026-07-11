import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuthHeaders,
  clearRememberedAccess,
  getRememberedAccess,
  handleUnauthorized,
  rememberAccess,
  tokenFromPin,
} from "../../src/auth/access.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test("rememberAccess stores access on the device", () => {
  const storage = memoryStorage();
  rememberAccess("1234", storage);
  assert.equal(getRememberedAccess(storage), "1234");
});

test("buildAuthHeaders attaches bearer token when remembered", () => {
  const storage = memoryStorage();
  rememberAccess("1234", storage);
  assert.deepEqual(buildAuthHeaders(storage), { Authorization: "Bearer 1234" });
});

test("handleUnauthorized clears remembered access", () => {
  const storage = memoryStorage();
  rememberAccess("1234", storage);
  assert.equal(handleUnauthorized({ status: 401 }, storage), true);
  assert.equal(getRememberedAccess(storage), null);
});

test("clearRememberedAccess removes device access", () => {
  const storage = memoryStorage();
  rememberAccess("1234", storage);
  clearRememberedAccess(storage);
  assert.equal(getRememberedAccess(storage), null);
});

test("tokenFromPin trims the unlock PIN", () => {
  assert.equal(tokenFromPin(" 1234 "), "1234");
});
