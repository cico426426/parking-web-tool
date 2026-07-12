import { cityKeyFromText, inferCityFromCoordinates } from "../parking/city.js";

const GOOGLE_MAPS_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl"]);
const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

export function extractUrl(text) {
  const match = String(text ?? "").match(URL_PATTERN);
  if (!match) return null;
  return cleanUrl(match[0]);
}

export function isGoogleMapsUrl(text) {
  const rawUrl = extractUrl(text) ?? text;
  try {
    const url = new URL(rawUrl);
    return GOOGLE_MAPS_HOSTS.has(url.hostname) || url.hostname.endsWith(".google.com");
  } catch {
    return false;
  }
}

export function parseGoogleMapsCoordinates(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const decoded = decodeGoogleMapsText(url?.href ?? rawUrl);

  const placeCoordinates = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (placeCoordinates) {
    return toCoordinates(placeCoordinates[1], placeCoordinates[2]);
  }

  const previewCoordinates = decoded.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (previewCoordinates) {
    return toCoordinates(previewCoordinates[2], previewCoordinates[1]);
  }

  const viewportCoordinates = decoded.match(/\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (viewportCoordinates) {
    return toCoordinates(viewportCoordinates[1], viewportCoordinates[2]);
  }

  if (!url) return null;
  for (const param of ["query", "q", "destination"]) {
    const coordinates = coordinatesFromText(url.searchParams.get(param));
    if (coordinates) return coordinates;
  }

  return null;
}

export function placeNameFromGoogleMapsUrl(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return "";

  const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (!placeMatch) return googleMapsQueryFromUrl(rawUrl);

  return decodeURIComponent(placeMatch[1]).replaceAll("+", " ").trim();
}

export function googleMapsQueryFromUrl(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return "";

  return String(url.searchParams.get("q") ?? url.searchParams.get("query") ?? "")
    .replaceAll("+", " ")
    .trim();
}

export async function resolveGoogleMapsLink(text, options = {}) {
  const rawUrl = extractUrl(text) ?? text;
  if (!isGoogleMapsUrl(rawUrl)) return null;

  const direct = destinationFromUrl(rawUrl);
  if (direct && !isShortGoogleMapsUrl(rawUrl)) return direct;

  if (!isShortGoogleMapsUrl(rawUrl)) return direct;

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(rawUrl, { redirect: "follow" });
  const resolvedUrl = response.url || rawUrl;
  const resolved = destinationFromUrl(resolvedUrl);
  if (resolved) return resolved;

  if (typeof response.text === "function") {
    const body = await response.text();
    const bodyDestination = destinationFromUrl(body);
    if (bodyDestination) return bodyDestination;
  }

  return geocodeGoogleMapsQuery(resolvedUrl, options);
}

export function destinationFromUrl(rawUrl) {
  const coordinates = parseGoogleMapsCoordinates(rawUrl);
  if (!coordinates) return null;

  const name = placeNameFromGoogleMapsUrl(rawUrl) || "Google Maps 分享位置";
  return {
    name,
    lat: coordinates.lat,
    lng: coordinates.lng,
    cityKey: cityKeyFromText(name) ?? inferCityFromCoordinates(coordinates.lat, coordinates.lng, null),
    source: "google-maps-link",
  };
}

function isShortGoogleMapsUrl(rawUrl) {
  const url = normalizeUrl(rawUrl);
  return url?.hostname === "maps.app.goo.gl";
}

async function geocodeGoogleMapsQuery(rawUrl, options) {
  if (typeof options.geocodeImpl !== "function") return null;

  const query = googleMapsQueryFromUrl(rawUrl);
  if (!query) return null;

  const payload = await options.geocodeImpl(query);
  const result = payload?.results?.[0] ?? payload?.[0] ?? null;
  if (!result || !Number.isFinite(result.lat) || !Number.isFinite(result.lng)) return null;

  return {
    name: result.label ?? query,
    lat: result.lat,
    lng: result.lng,
    cityKey: result.cityKey ?? cityKeyFromText(query) ?? inferCityFromCoordinates(result.lat, result.lng, null),
    source: "google-maps-link",
  };
}

function normalizeUrl(rawUrl) {
  try {
    return new URL(cleanUrl(rawUrl));
  } catch {
    return null;
  }
}

function cleanUrl(rawUrl) {
  return String(rawUrl ?? "").trim().replace(/[)\].,，。]+$/, "");
}

function decodeGoogleMapsText(value) {
  const text = String(value ?? "").replaceAll("&amp;", "&");
  try {
    return decodeURIComponent(text);
  } catch {
    return text.replaceAll("%21", "!");
  }
}

function coordinatesFromText(text) {
  const match = String(text ?? "").match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  return toCoordinates(match[1], match[2]);
}

function toCoordinates(lat, lng) {
  const coordinates = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) return null;
  return coordinates;
}
