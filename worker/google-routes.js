const ROUTE_MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
const FIELD_MASK = "originIndex,destinationIndex,duration,distanceMeters,status,condition";

export async function computeWalkingRouteMatrix(destination, parkingLots, options = {}) {
  if (!options.apiKey) return new Map();

  const origins = (Array.isArray(parkingLots) ? parkingLots : []).map((lot) => waypointFor(lot));
  if (!origins.length || !isPoint(destination)) return new Map();

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(ROUTE_MATRIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": options.apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      origins,
      destinations: [waypointFor(destination)],
      travelMode: "WALK",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Routes Compute Route Matrix failed: ${response.status}`);
  }

  const data = await response.json();
  const routesByOrigin = new Map();

  for (const element of Array.isArray(data) ? data : []) {
    if (element.destinationIndex !== 0 || element.condition !== "ROUTE_EXISTS") continue;
    const originIndex = Number(element.originIndex);
    const lot = parkingLots[originIndex];
    const durationSeconds = parseDurationSeconds(element.duration);
    const distanceMeters = Number(element.distanceMeters);
    if (!lot?.id || !Number.isFinite(durationSeconds) || !Number.isFinite(distanceMeters)) continue;

    routesByOrigin.set(lot.id, {
      provider: "google-routes",
      durationSeconds,
      distanceMeters,
      condition: element.condition,
    });
  }

  return routesByOrigin;
}

function waypointFor(point) {
  return {
    waypoint: {
      location: {
        latLng: {
          latitude: Number(point.lat),
          longitude: Number(point.lng),
        },
      },
    },
  };
}

function isPoint(point) {
  return Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng));
}

function parseDurationSeconds(value) {
  const match = String(value ?? "").match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return null;
  return Number(match[1]);
}
