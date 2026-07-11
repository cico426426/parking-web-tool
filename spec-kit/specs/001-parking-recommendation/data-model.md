# Data Model: Parking Recommendation

## Destination

Represents the place the user wants to visit.

Fields:

- `id`: Stable local identifier when available.
- `name`: User-facing place name.
- `lat`: Latitude in WGS84 decimal degrees.
- `lng`: Longitude in WGS84 decimal degrees.
- `address`: Optional display address.
- `source`: `manual`, `search`, `share`, or `preset`.
- `sourceRef`: Optional provider-specific identifier or shared URL.

Validation:

- `name` must be non-empty.
- `lat` must be between -90 and 90.
- `lng` must be between -180 and 180.
- A destination without coordinates cannot be used for recommendation.

## ParkingLot

Represents a candidate parking lot.

Fields:

- `id`: Parking lot identifier from the data source.
- `name`: User-facing parking lot name.
- `lat`: Latitude in WGS84 decimal degrees.
- `lng`: Longitude in WGS84 decimal degrees.
- `city`: Supported city key.
- `address`: Optional display address.
- `totalSpaces`: Optional total capacity.
- `feeSummary`: Optional human-readable fee summary.
- `sourceUpdatedAt`: Optional timestamp from the source data.

Validation:

- `id`, `name`, `lat`, and `lng` are required for recommendation.
- Invalid or missing coordinates exclude the parking lot from ranking.

## ParkingAvailability

Represents current or recent parking status.

Fields:

- `parkingLotId`: References `ParkingLot.id`.
- `availableSpaces`: Number of available spaces, or `null` when unknown.
- `status`: `available`, `full`, `unknown`, or `closed`.
- `updatedAt`: Optional timestamp indicating data freshness.
- `source`: Data source label.

Validation:

- `availableSpaces` must be a non-negative integer when present.
- `status` must not imply certainty when `availableSpaces` is unknown.

## Recommendation

Represents one ranked parking option for a destination.

Fields:

- `rank`: 1-based rank shown to the user.
- `destinationId`: References the selected destination.
- `parkingLot`: Embedded normalized parking lot summary.
- `availability`: Embedded normalized availability summary.
- `distanceMeters`: Straight-line or route distance, labelled by method.
- `timeEstimateMinutes`: Optional time estimate.
- `timeEstimateMethod`: `approximate`, `route`, or `unknown`.
- `score`: Internal numeric score used for sorting.
- `reasons`: User-facing reason chips such as `nearby`, `has spaces`, or `unknown availability`.
- `navigationUrl`: External navigation handoff target.

Validation:

- `rank` must be 1, 2, or 3 for primary recommendations.
- `navigationUrl` must be present for every shown recommendation unless navigation handoff failed and a fallback is shown.
- Recommendations with known zero availability should be demoted or excluded unless no better options exist.

## SearchResult

Represents a destination suggestion before the user confirms it.

Fields:

- `label`: Main text shown in the suggestion list.
- `secondaryLabel`: Optional disambiguating address or city.
- `lat`: Optional latitude.
- `lng`: Optional longitude.
- `provider`: Search provider label.
- `providerRef`: Optional provider-specific reference.
- `confidence`: Optional numeric or categorical confidence.

Validation:

- A selected search result must resolve to coordinates before recommendation.
- Similar names must preserve enough secondary text for disambiguation.

## NavigationHandoff

Represents the user's action to open external navigation.

Fields:

- `parkingLotId`: Chosen recommendation target.
- `destinationLat`: Target latitude.
- `destinationLng`: Target longitude.
- `url`: External map/navigation URL.
- `openedAt`: Optional local timestamp for diagnostics.
- `status`: `ready`, `opened`, or `failed`.

Validation:

- `url` must target the selected parking lot coordinates.
- Failure must leave the user with a visible fallback link or copyable destination.

## State Transitions

```text
Idle
  -> SearchingDestination
  -> DestinationSelected
  -> LoadingParkingData
  -> RankingRecommendations
  -> ShowingRecommendations
  -> NavigationReady
  -> ExternalNavigationOpened
```

Error states:

- `DestinationNotFound`: Search completed without a usable destination.
- `ParkingDataUnavailable`: Parking source failed or returned no usable candidates.
- `NoAvailableParking`: Nearby candidates exist but all known spaces are full.
- `NavigationFailed`: External navigation URL could not be opened.
