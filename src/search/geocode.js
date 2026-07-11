import { inferCityFromAddress } from "../parking/city.js";

const DEFAULT_ENDPOINT = "https://nominatim.openstreetmap.org/search";

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
