import { cityKeyFromText, inferCityFromCoordinates } from "../public/src/parking/city.js";

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const NEARBY_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby";
const FIELD_MASK = "places.displayName,places.formattedAddress,places.location";
const NEARBY_FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location,places.types";

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

export async function searchGoogleParkingNearby(destination, options = {}) {
  if (!options.apiKey) return [];

  const lat = Number(destination?.lat);
  const lng = Number(destination?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(NEARBY_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": options.apiKey,
      "X-Goog-FieldMask": NEARBY_FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ["parking"],
      maxResultCount: Number(options.limit ?? 5),
      languageCode: "zh-TW",
      regionCode: "TW",
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Number(options.radiusMeters ?? 1500),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places Nearby Search failed: ${response.status}`);
  }

  const data = await response.json();
  return (Array.isArray(data.places) ? data.places : [])
    .map((place) => normalizeGoogleParkingLot(place, options.city))
    .filter(Boolean);
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

function normalizeGoogleParkingLot(place, city = "GooglePlaces") {
  const lat = Number(place.location?.latitude);
  const lng = Number(place.location?.longitude);
  const id = place.id ? `google:${place.id}` : "";
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const name = place.displayName?.text || place.formattedAddress || "Google Maps 停車場";
  return {
    id,
    name,
    lat,
    lng,
    city,
    address: place.formattedAddress ?? "",
    totalSpaces: null,
    feeSummary: "",
    sourceUpdatedAt: null,
    dataSource: "Google Places",
    providerRef: place.id,
    types: Array.isArray(place.types) ? place.types : [],
  };
}
