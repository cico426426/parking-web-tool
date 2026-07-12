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
  if (!url) return null;

  const decoded = decodeURIComponent(url.href);
  const placeCoordinates = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (placeCoordinates) {
    return toCoordinates(placeCoordinates[1], placeCoordinates[2]);
  }

  const viewportCoordinates = decoded.match(/\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (viewportCoordinates) {
    return toCoordinates(viewportCoordinates[1], viewportCoordinates[2]);
  }

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
  if (!placeMatch) return "";

  return decodeURIComponent(placeMatch[1]).replaceAll("+", " ").trim();
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
    return destinationFromUrl(await response.text());
  }

  return null;
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
