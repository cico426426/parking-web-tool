import { inferCityFromAddress } from "../parking/city.js";

const DEFAULT_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const DEFAULT_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

export async function searchDestinations(query, options = {}) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) return { query: trimmed, results: [], attribution: "" };

  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const url = new URL(endpoint);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(options.limit ?? 5));
  url.searchParams.set("countrycodes", options.countryCodes ?? "tw");

  const response = await fetchImpl(url, {
    headers: buildHeaders(options),
  });

  if (!response.ok) {
    throw new Error(`Search provider failed: ${response.status}`);
  }

  const data = await response.json();
  const results = (Array.isArray(data) ? data : [])
    .map(normalizeSearchResult)
    .filter((result) => Number.isFinite(result.lat) && Number.isFinite(result.lng));

  return {
    query: trimmed,
    results,
    attribution: "Search data © OpenStreetMap contributors",
  };
}

export async function reverseGeocodeCity(lat, lng, options = {}) {
  const pointLat = Number(lat);
  const pointLng = Number(lng);
  if (!Number.isFinite(pointLat) || !Number.isFinite(pointLng)) {
    return { cityKey: null, address: {}, attribution: "" };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? DEFAULT_REVERSE_ENDPOINT;
  const url = new URL(endpoint);
  url.searchParams.set("lat", String(pointLat));
  url.searchParams.set("lon", String(pointLng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", String(options.zoom ?? 10));
  url.searchParams.set("layer", "address");
  if (options.acceptLanguage) url.searchParams.set("accept-language", options.acceptLanguage);

  const response = await fetchImpl(url, {
    headers: buildHeaders(options),
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoder failed: ${response.status}`);
  }

  const data = await response.json();
  const address = data.address ?? {};

  return {
    cityKey: inferCityFromAddress(address),
    address,
    displayName: data.display_name ?? "",
    attribution: "Search data © OpenStreetMap contributors",
  };
}

function buildHeaders(options) {
  const headers = { Accept: "application/json" };
  if (options.userAgent) headers["User-Agent"] = options.userAgent;
  return headers;
}

function normalizeSearchResult(item) {
  const address = item.address ?? {};
  const city = address.city ?? address.town ?? address.county ?? address.state ?? "";
  const road = address.road ?? address.suburb ?? address.neighbourhood ?? "";

  return {
    label: item.name || firstNamePart(item.display_name) || item.display_name || "未命名地點",
    secondaryLabel: [city, road].filter(Boolean).join(" · ") || item.display_name || "",
    lat: Number(item.lat),
    lng: Number(item.lon),
    provider: "nominatim",
    providerRef: String(item.place_id ?? item.osm_id ?? ""),
    confidence: Number(item.importance ?? 0) > 0.5 ? "high" : "medium",
    cityKey: inferCityFromAddress(address),
  };
}

function firstNamePart(displayName) {
  return String(displayName ?? "").split(",")[0]?.trim();
}
