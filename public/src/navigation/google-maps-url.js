export function buildGoogleMapsDirectionsUrl(lat, lng) {
  const targetLat = Number(lat);
  const targetLng = Number(lng);

  if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) {
    throw new TypeError("Valid latitude and longitude are required");
  }

  const destination = encodeURIComponent(`${targetLat},${targetLng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function buildGoogleMapsSearchUrl(lat, lng) {
  const targetLat = Number(lat);
  const targetLng = Number(lng);

  if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) {
    throw new TypeError("Valid latitude and longitude are required");
  }

  const query = encodeURIComponent(`${targetLat},${targetLng}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
