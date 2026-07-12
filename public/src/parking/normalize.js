function localizedText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.Zh_tw ?? value.ZhTw ?? value.En ?? value.en ?? "";
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

export function extractPosition(record) {
  const position = record?.CarParkPosition ?? record?.ParkPosition ?? record?.Position ?? record ?? {};
  const lat = firstFiniteNumber(position.PositionLat, position.Lat, position.lat, record?.PositionLat);
  const lng = firstFiniteNumber(
    position.PositionLon,
    position.PositionLng,
    position.Lon,
    position.Lng,
    position.lng,
    record?.PositionLon,
  );

  if (lat === null || lng === null) return null;
  return { lat, lng };
}

export function normalizeCarPark(record, city = "Taoyuan") {
  const id = record?.CarParkID ?? record?.ID ?? record?.CarParkNo ?? "";
  const position = extractPosition(record);

  if (!id || !position) return null;

  return {
    id: String(id),
    name: localizedText(record.CarParkName) || localizedText(record.Name) || "(未命名停車場)",
    lat: position.lat,
    lng: position.lng,
    city,
    address: localizedText(record.Address) || localizedText(record.Description),
    totalSpaces: firstFiniteNumber(record.TotalSpaces, record.Capacity, record.TotalSpace),
    feeSummary: localizedText(record.FareDescription) || localizedText(record.FareInfo),
    sourceUpdatedAt: record.UpdateTime ?? record.SrcUpdateTime ?? null,
  };
}

export function normalizeAvailability(record) {
  const parkingLotId = record?.CarParkID ?? record?.ID ?? record?.CarParkNo ?? "";
  if (!parkingLotId) return null;

  const nested = record.Availabilities ?? record.availabilities;
  const nestedAvailability = Array.isArray(nested) ? nested[0] : null;
  const availableSpaces = firstFiniteNumber(
    record.AvailableSpaces,
    record.AvailableSpace,
    record.AvailableCar,
    nestedAvailability?.AvailableSpaces,
  );

  const status = normalizeAvailabilityStatus(record, availableSpaces);

  return {
    parkingLotId: String(parkingLotId),
    availableSpaces,
    status,
    updatedAt: record.UpdateTime ?? record.SrcUpdateTime ?? null,
    source: "TDX",
  };
}

function normalizeAvailabilityStatus(record, availableSpaces) {
  const rawStatus = String(record?.ServiceStatus ?? record?.Status ?? "").toLowerCase();
  if (rawStatus.includes("closed") || rawStatus === "0") return "closed";
  if (availableSpaces === null) return "unknown";
  return availableSpaces > 0 ? "available" : "full";
}

export function normalizeCarParks(records, city) {
  return unwrapRecords(records, "CarParks")
    .map((record) => normalizeCarPark(record, city))
    .filter(Boolean);
}

export function buildAvailabilityMap(records) {
  const map = new Map();

  for (const record of unwrapRecords(records, "ParkingAvailabilities")) {
    const availability = normalizeAvailability(record);
    if (availability) map.set(availability.parkingLotId, availability);
  }

  return map;
}

function unwrapRecords(records, wrappedKey) {
  if (Array.isArray(records)) return records;
  if (Array.isArray(records?.[wrappedKey])) return records[wrappedKey];
  return [];
}
