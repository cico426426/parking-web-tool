import { cityKeyFromText, inferCityFromCoordinates } from "../public/src/parking/city.js";

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = "places.displayName,places.formattedAddress,places.location";

export async function searchGooglePlacesText(query, options = {}) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) return { query: trimmed, results: [], attribution: "" };
  if (!options.apiKey) return { query: trimmed, results: [], attribution: "" };

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": options.apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: trimmed,
      regionCode: "TW",
      languageCode: "zh-TW",
      maxResultCount: Number(options.limit ?? 1),
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places Text Search failed: ${response.status}`);
  }

  const data = await response.json();
  const results = (Array.isArray(data.places) ? data.places : [])
    .map(normalizeGooglePlace)
    .filter((result) => Number.isFinite(result.lat) && Number.isFinite(result.lng));

  return {
    query: trimmed,
    results,
    attribution: "Place data © Google",
  };
}

function normalizeGooglePlace(place) {
  const lat = Number(place.location?.latitude);
  const lng = Number(place.location?.longitude);
  const label = place.displayName?.text || place.formattedAddress || "Google Maps 地點";
  const cityKey = cityKeyFromText(place.formattedAddress) ?? inferCityFromCoordinates(lat, lng, null);

  return {
    label,
    secondaryLabel: place.formattedAddress ?? "",
    lat,
    lng,
    provider: "google-places",
    providerRef: "",
    confidence: "high",
    cityKey,
  };
}
