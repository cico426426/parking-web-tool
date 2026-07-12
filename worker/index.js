import { buildTdxParkingUrls, candidateCitiesFromCoordinates } from "../public/src/parking/city.js";
import { buildAvailabilityMap, normalizeCarParks } from "../public/src/parking/normalize.js";
import { rankRecommendations } from "../public/src/parking/rank.js";
import { reverseGeocodeCity, searchDestinations } from "../public/src/search/geocode.js";
import { resolveGoogleMapsLink } from "../public/src/search/google-maps-link.js";
import { searchGooglePlacesText } from "./google-places.js";
import { computeWalkingRouteMatrix } from "./google-routes.js";
import { errorResponse, jsonResponse, optionsResponse } from "./response.js";

const TOKEN_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const cache = new Map();
const rateLimit = new Map();

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return optionsResponse();
    const url = new URL(request.url);

    if (!isAuthorized(request, env)) {
      return errorResponse("UNAUTHORIZED", "Private access is required.", 401);
    }

    if (isRateLimited(request, env)) {
      return errorResponse("RATE_LIMITED", "Too many requests. Try again later.", 429);
    }

    try {
      if (url.pathname === "/api/search") return handleSearch(url, env);
      if (url.pathname === "/api/resolve-map-url") return handleMapUrl(url, env);
      if (url.pathname === "/api/recommendations") return handleRecommendations(url, env);
      return errorResponse("NOT_FOUND", "Route not found.", 404);
    } catch (error) {
      return errorResponse("PARKING_DATA_UNAVAILABLE", error.message, 502);
    }
  },
};

function isAuthorized(request, env) {
  const expected = env.OWNER_ACCESS_SECRET;
  if (!expected) return false;
  const header = request.headers.get("Authorization") ?? "";
  return header === `Bearer ${expected}`;
}

async function handleMapUrl(url, env) {
  const mapUrl = url.searchParams.get("url") ?? "";
  const key = `map-url:${mapUrl}`;
  const cached = getCached(key);
  if (cached) return jsonResponse(cached);

  const destination = await resolveGoogleMapsLink(mapUrl, {
    fetchImpl: env.__fetch ?? fetch,
    geocodeImpl: (query) => geocodeDestinationQuery(query, env),
  });
  if (!destination) {
    return errorResponse("MAP_URL_UNRESOLVED", "Unable to resolve this Google Maps link.", 400);
  }

  const payload = { destination };
  setCached(key, payload);
  return jsonResponse(payload);
}

async function geocodeDestinationQuery(query, env) {
  const fetchImpl = env.__fetch ?? fetch;

  if (env.GOOGLE_MAPS_API_KEY) {
    try {
      const googlePayload = await searchGooglePlacesText(query, {
        apiKey: env.GOOGLE_MAPS_API_KEY,
        fetchImpl,
        limit: 1,
      });
      if (googlePayload.results.length) return googlePayload;
    } catch {
      // Keep the old free geocoder as a fallback when Google quota or config is unavailable.
    }
  }

  return searchDestinations(query, {
    limit: 1,
    fetchImpl,
    userAgent: env.SEARCH_USER_AGENT ?? "parking-web-tool/1.0",
  });
}

function isRateLimited(request, env) {
  const max = Number(env.RATE_LIMIT_MAX ?? 60);
  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS ?? 60000);
  const token = request.headers.get("Authorization") ?? "anonymous";
  const now = Date.now();
  const current = rateLimit.get(token) ?? { count: 0, resetAt: now + windowMs };

  if (now > current.resetAt) {
    rateLimit.set(token, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  rateLimit.set(token, current);
  return current.count > max;
}

async function handleSearch(url, env) {
  const query = url.searchParams.get("q") ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 5), 10);
  const key = `search:${query}:${limit}`;
  const cached = getCached(key);
  if (cached) return jsonResponse(cached);

  const payload = await searchDestinations(query, {
    limit,
    fetchImpl: env.__fetch ?? fetch,
    userAgent: env.SEARCH_USER_AGENT ?? "parking-app-side-project/1.0",
  });
  setCached(key, payload);
  return jsonResponse(payload);
}

async function handleRecommendations(url, env) {
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return errorResponse("INVALID_DESTINATION", "Valid destination coordinates are required.", 400);
  }

  const requestedCity = url.searchParams.get("city");
  const cities = await candidateCitiesForDestination(lat, lng, requestedCity, env);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 5), 5);
  const destination = { id: "request-destination", name: "Selected destination", lat, lng, source: "search" };
  const key = `recommendations:${cities.join(",")}:${lat.toFixed(5)}:${lng.toFixed(5)}:${limit}`;
  const cached = getCached(key);
  if (cached) return jsonResponse(cached);

  const token = await getTdxToken(env);
  const fetchImpl = env.__fetch ?? fetch;
  const { parkingLots, availabilityById } = await fetchParkingDataForCities(fetchImpl, token, cities, { lat, lng });

  if (!parkingLots.length) {
    return errorResponse("NO_USABLE_PARKING", "No nearby parking lots with usable location data were found.", 404);
  }

  let recommendations = rankRecommendations(destination, parkingLots, availabilityById, { limit });
  recommendations = await enhanceRecommendationsWithWalkingRoutes(destination, recommendations, env);
  const payload = {
    destination,
    cities,
    generatedAt: new Date().toISOString(),
    dataFreshness: "live",
    recommendations,
    warnings: recommendations.some((item) => item.availability.status === "unknown")
      ? ["UNKNOWN_AVAILABILITY"]
      : [],
  };
  setCached(key, payload);
  return jsonResponse(payload);
}

async function enhanceRecommendationsWithWalkingRoutes(destination, recommendations, env) {
  if (!env.GOOGLE_MAPS_API_KEY || !recommendations.length) return recommendations;

  try {
    const routeByLotId = await computeWalkingRouteMatrix(
      destination,
      recommendations.map((recommendation) => recommendation.parkingLot),
      {
        apiKey: env.GOOGLE_MAPS_API_KEY,
        fetchImpl: env.__fetch ?? fetch,
      },
    );
    if (!routeByLotId.size) return recommendations;

    return recommendations
      .map((recommendation) => applyWalkingRoute(recommendation, routeByLotId.get(recommendation.parkingLot.id)))
      .sort((a, b) => routeSortScore(a) - routeSortScore(b))
      .map((recommendation, index) => ({ ...recommendation, rank: index + 1 }));
  } catch {
    return recommendations;
  }
}

function applyWalkingRoute(recommendation, route) {
  if (!route) return recommendation;

  return {
    ...recommendation,
    distanceMeters: route.distanceMeters,
    distanceMethod: "google-routes-walking",
    timeEstimateMinutes: Math.max(1, Math.round(route.durationSeconds / 60)),
    timeEstimateMethod: "google-routes",
    walkingRoute: route,
    reasons: ["walking route", ...recommendation.reasons],
  };
}

function routeSortScore(recommendation) {
  const routeSeconds = recommendation.walkingRoute?.durationSeconds;
  const duration = Number.isFinite(routeSeconds) ? routeSeconds : Number.POSITIVE_INFINITY;
  return duration + routeAvailabilityPenalty(recommendation.availability);
}

function routeAvailabilityPenalty(availability) {
  if (!availability || availability.status === "unknown") return 600;
  if (availability.status === "available") return 0;
  if (availability.status === "full") return 100000;
  if (availability.status === "closed") return 200000;
  return 1000;
}

async function fetchParkingDataForCities(fetchImpl, token, cities, destination) {
  const results = await Promise.allSettled(
    cities.map(async (city) => {
      const [carParkData, availabilityData] = await fetchParkingData(fetchImpl, token, city, destination);
      return {
        city,
        parkingLots: normalizeCarParks(carParkData, city),
        availabilityById: buildAvailabilityMap(availabilityData),
      };
    }),
  );

  const parkingLots = [];
  const availabilityById = new Map();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    parkingLots.push(...result.value.parkingLots);
    for (const [id, availability] of result.value.availabilityById) {
      availabilityById.set(id, availability);
    }
  }

  return { parkingLots, availabilityById };
}

async function candidateCitiesForDestination(lat, lng, preferredCity, env) {
  const cities = [];
  if (preferredCity) cities.push(preferredCity);

  const reverseCity = await reverseCityForCoordinates(lat, lng, env);
  if (reverseCity) cities.push(reverseCity);

  cities.push(...candidateCitiesFromCoordinates(lat, lng, null));

  const fallbackCity = env.DEFAULT_CITY ?? "Taoyuan";
  if (!cities.length && fallbackCity) cities.push(fallbackCity);

  return [...new Set(cities)];
}

async function reverseCityForCoordinates(lat, lng, env) {
  const key = `reverse-city:${Number(lat).toFixed(5)}:${Number(lng).toFixed(5)}`;
  const cached = getCached(key);
  if (cached !== null) return cached;

  try {
    const payload = await reverseGeocodeCity(lat, lng, {
      fetchImpl: env.__fetch ?? fetch,
      userAgent: env.SEARCH_USER_AGENT ?? "parking-web-tool/1.0",
      acceptLanguage: "zh-TW,zh,en",
    });
    setCached(key, payload.cityKey ?? "", 3600000);
    return payload.cityKey;
  } catch {
    setCached(key, "", 300000);
    return null;
  }
}

async function fetchParkingData(fetchImpl, token, city, destination) {
  const nearbyUrls = buildTdxParkingUrls(city, {
    lat: destination.lat,
    lng: destination.lng,
    radiusMeters: 3000,
  });
  const [nearbyCarParkData, availabilityData] = await Promise.all([
    fetchJson(fetchImpl, nearbyUrls.carParks, token),
    fetchJson(fetchImpl, nearbyUrls.availability, token),
  ]);

  if (hasCarParks(nearbyCarParkData)) return [nearbyCarParkData, availabilityData];

  const cityUrls = buildTdxParkingUrls(city);
  const cityCarParkData = await fetchJson(fetchImpl, cityUrls.carParks, token);
  return [cityCarParkData, availabilityData];
}

function hasCarParks(data) {
  const carParks = Array.isArray(data) ? data : data?.CarParks;
  return Array.isArray(carParks) && carParks.length > 0;
}

async function getTdxToken(env) {
  if (!env.TDX_ID || !env.TDX_SECRET) {
    throw new Error("TDX credentials are not configured.");
  }

  const fetchImpl = env.__fetch ?? fetch;
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.TDX_ID,
      client_secret: env.TDX_SECRET,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) throw new Error(`TDX token request failed: ${response.status}`);
  return (await response.json()).access_token;
}

async function fetchJson(fetchImpl, url, token) {
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(`TDX data request failed: ${response.status}`);
  return response.json();
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs = 60000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
