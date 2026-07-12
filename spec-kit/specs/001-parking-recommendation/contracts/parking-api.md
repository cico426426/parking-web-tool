# Contract: Parking Recommendation API

This contract describes the browser-facing interfaces for the mobile parking recommendation web tool/PWA. It applies whether the data comes from a local generated snapshot or a live Worker proxy.

Live Worker endpoints are private by default. The user should not manually add request headers. Instead, the web tool shows a one-time PIN/password unlock screen on a new device, remembers successful access locally, and automatically authorizes later live API requests before the Worker calls TDX, geocoding, or any other quota-limited provider.

## Authentication

For MVP, use a simple PIN/password unlock flow backed by a bearer token or equivalent private header rather than a full account system.

Internal request header for live endpoints:

```http
Authorization: Bearer <owner-access-token>
```

Rules:

- The user enters the PIN/password in the web tool UI, not in developer tools or request headers.
- The web tool stores remembered access locally on that device after successful unlock.
- The web tool automatically attaches the internal authorization header for live requests.
- The web tool provides a "lock this device" action that clears remembered access.
- A `401 Unauthorized` response clears remembered access and returns the UI to the unlock screen.
- Reject missing or invalid tokens with `401 Unauthorized`.
- Reject requests before calling external quota-limited APIs.
- Do not log the token.
- Do not embed TDX credentials or paid provider keys in frontend code.
- Apply basic per-token or per-client request limiting.

## GET /api/recommendations

Returns ranked parking recommendations for a destination.

### Query Parameters

- `lat` (required): Destination latitude.
- `lng` (required): Destination longitude.
- `city` (required): Supported city key such as `Taoyuan`.
- `limit` (optional): Number of recommendations to return. Default `3`, maximum `5`.

### Required Headers

- `Authorization`: Required for live Worker mode. Not required for local static snapshot mode.

### Success Response

```json
{
  "destination": {
    "name": "中原大學",
    "lat": 24.9575,
    "lng": 121.2408
  },
  "generatedAt": "2026-07-12T00:00:00.000Z",
  "dataFreshness": "live",
  "recommendations": [
    {
      "rank": 1,
      "parkingLot": {
        "id": "TYC-P-001",
        "name": "Example Parking",
        "lat": 24.958,
        "lng": 121.241,
        "address": "桃園市中壢區..."
      },
      "availability": {
        "status": "available",
        "availableSpaces": 12,
        "updatedAt": "2026-07-12T00:00:00.000Z"
      },
      "distanceMeters": 320,
      "distanceMethod": "straight-line",
      "timeEstimateMinutes": 5,
      "timeEstimateMethod": "approximate",
      "reasons": ["nearby", "has spaces"],
      "navigationUrl": "https://www.google.com/maps/dir/?api=1&destination=24.958,121.241"
    }
  ],
  "warnings": []
}
```

### Error Responses

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Private access is required."
  }
}
```

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again later."
  }
}
```

```json
{
  "error": {
    "code": "DESTINATION_OUT_OF_COVERAGE",
    "message": "This destination is outside the currently supported parking data area."
  }
}
```

```json
{
  "error": {
    "code": "PARKING_DATA_UNAVAILABLE",
    "message": "Parking data could not be loaded. Try again later."
  }
}
```

```json
{
  "error": {
    "code": "NO_USABLE_PARKING",
    "message": "No nearby parking lots with usable location data were found."
  }
}
```

## GET /api/search

Returns destination search suggestions.

### Query Parameters

- `q` (required): User-entered destination text.
- `nearLat` (optional): Current or map-center latitude for biasing results.
- `nearLng` (optional): Current or map-center longitude for biasing results.
- `limit` (optional): Number of suggestions. Default `5`, maximum `10`.

### Required Headers

- `Authorization`: Required for live Worker mode. Not required for local static snapshot mode.

### Success Response

```json
{
  "query": "中原大學",
  "results": [
    {
      "label": "中原大學",
      "secondaryLabel": "桃園市中壢區",
      "lat": 24.9575,
      "lng": 121.2408,
      "provider": "configured-geocoder",
      "providerRef": "provider-specific-id",
      "confidence": "high"
    }
  ],
  "attribution": "Search data attribution shown here when required by provider."
}
```

### Error Response

```json
{
  "error": {
    "code": "SEARCH_UNAVAILABLE",
    "message": "Destination search is temporarily unavailable."
  }
}
```

## Browser Module Contract

Pure functions should be importable by tests and by UI/Worker code.

### `rankRecommendations(destination, parkingLots, availabilityById, options)`

Input:

- `destination`: `Destination`
- `parkingLots`: `ParkingLot[]`
- `availabilityById`: `Map<string, ParkingAvailability>` or equivalent object
- `options.limit`: Default `3`

Output:

- `Recommendation[]` sorted by ascending rank.

Rules:

- Exclude parking lots without valid coordinates.
- Prefer lots with known available spaces.
- Keep lots with unknown availability only when needed or when they are very near.
- Include navigation URL in every returned recommendation.

### `buildGoogleMapsDirectionsUrl(lat, lng)`

Input:

- `lat`: target latitude
- `lng`: target longitude

Output:

- Google Maps directions URL suitable for opening in a browser or map/navigation app.
