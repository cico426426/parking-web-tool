import { buildGoogleMapsDirectionsUrl } from "../navigation/google-maps-url.js";

const EARTH_RADIUS_METERS = 6371000;

export function distanceMeters(a, b) {
  const lat1 = Number(a?.lat);
  const lng1 = Number(a?.lng);
  const lat2 = Number(b?.lat);
  const lng2 = Number(b?.lng);

  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }

  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return Math.round(EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(h)));
}

export function approximateTimeMinutes(distance) {
  if (!Number.isFinite(distance)) return null;
  return Math.max(1, Math.round(distance / 250));
}

function availabilityPenalty(availability) {
  if (!availability || availability.status === "unknown") return 600;
  if (availability.status === "available") return 0;
  if (availability.status === "full") return 100000;
  if (availability.status === "closed") return 200000;
  return 1000;
}

function availabilityReasons(availability) {
  if (!availability || availability.status === "unknown") return ["unknown availability"];
  if (availability.status === "available") return ["has spaces"];
  if (availability.status === "full") return ["reported full"];
  if (availability.status === "closed") return ["reported closed"];
  return ["availability uncertain"];
}

export function rankRecommendations(destination, parkingLots, availabilityById = new Map(), options = {}) {
  const limit = Math.min(Number(options.limit ?? 10), 10);
  const candidates = (Array.isArray(parkingLots) ? parkingLots : [])
    .filter((lot) => Number.isFinite(Number(lot.lat)) && Number.isFinite(Number(lot.lng)))
    .map((lot) => {
      const availability = availabilityById.get?.(lot.id) ?? availabilityById[lot.id] ?? null;
      const distance = distanceMeters(destination, lot);
      const score = distance + availabilityPenalty(availability);

      return {
        lot,
        availability: availability ?? {
          parkingLotId: lot.id,
          availableSpaces: null,
          status: "unknown",
          updatedAt: null,
          source: "unknown",
        },
        distance,
        score,
      };
    })
    .sort((a, b) => a.score - b.score || a.distance - b.distance);

  const usable = candidates.filter(({ availability }) => availability.status !== "closed");
  const selected = (usable.length ? usable : candidates).slice(0, limit);

  return selected.map(({ lot, availability, distance, score }, index) => ({
    rank: index + 1,
    destinationId: destination.id ?? "selected-destination",
    parkingLot: lot,
    availability,
    distanceMeters: distance,
    distanceMethod: "straight-line",
    timeEstimateMinutes: approximateTimeMinutes(distance),
    timeEstimateMethod: "approximate",
    score,
    reasons: ["nearby", ...availabilityReasons(availability)],
    navigationUrl: buildGoogleMapsDirectionsUrl(lot.lat, lot.lng),
  }));
}
