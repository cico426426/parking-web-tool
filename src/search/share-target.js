export function parseSharedDestination(params) {
  const searchParams = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  const text = [searchParams.get("title"), searchParams.get("text"), searchParams.get("url")]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!text) return null;

  const coordinates = extractCoordinates(text);
  return {
    query: coordinates ? "" : text,
    coordinates,
    rawText: text,
  };
}

export function extractCoordinates(text) {
  const match = String(text).match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
}
