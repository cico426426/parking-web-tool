export const ACCESS_STORAGE_KEY = "parking-app.access";

function storageGet(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function storageSet(storage, key, value) {
  try {
    storage?.setItem?.(key, value);
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

function storageRemove(storage, key) {
  try {
    storage?.removeItem?.(key);
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

export function getRememberedAccess(storage = globalThis.localStorage) {
  return storageGet(storage, ACCESS_STORAGE_KEY);
}

export function rememberAccess(token, storage = globalThis.localStorage) {
  if (!token) return;
  storageSet(storage, ACCESS_STORAGE_KEY, token);
}

export function clearRememberedAccess(storage = globalThis.localStorage) {
  storageRemove(storage, ACCESS_STORAGE_KEY);
}

export function buildAuthHeaders(storage = globalThis.localStorage) {
  const token = getRememberedAccess(storage);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function handleUnauthorized(response, storage = globalThis.localStorage) {
  if (response?.status === 401) {
    clearRememberedAccess(storage);
    return true;
  }
  return false;
}

export function tokenFromPin(pin) {
  return String(pin ?? "").trim();
}
