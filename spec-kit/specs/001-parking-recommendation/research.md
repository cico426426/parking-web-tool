# Research: Parking Recommendation

## Decision: Use TDX as the first parking data source

**Rationale**: The existing project already contains `fetch-parking.mjs` using TDX OAuth credentials and TDX off-street parking endpoints. This is the fastest route to a real Taiwan parking-data MVP and directly matches the feature's requirement for availability-aware recommendations.

**Alternatives considered**:

- Manual/static parking data: useful for UI prototyping, but does not prove the core "available spaces" value.
- Google Places parking search: strong place coverage, but does not provide the same public real-time availability data and introduces billing/key management earlier.

**Notes**: Keep TDX field parsing defensive because city records may differ. Normalize records before ranking.

## Decision: Keep Google Maps as a navigation handoff, not an embedded map dependency

**Rationale**: The feature explicitly says Google Maps does not need to be embedded. Google Maps URLs support a directions action URL pattern and show path, distance, and travel time in Google Maps, which fits the one-tap handoff requirement without building navigation ourselves.

**Alternatives considered**:

- Embed Google Maps JavaScript map: unnecessary for MVP and requires broader Google Maps Platform setup.
- Build turn-by-turn navigation: out of scope and significantly more complex.
- Use only coordinate text: technically simple but poor mobile workflow.

## Decision: Start route time as a labelled estimate; defer exact traffic-aware route time

**Rationale**: The MVP can rank by straight-line distance and show a simple approximate time label while letting Google Maps provide final driving route details after handoff. This avoids paid route calculation and still gives the user enough context to choose among three options.

**Alternatives considered**:

- Google Routes API or Distance Matrix-style route durations: more accurate but introduces billing and quota decisions too early.
- No time display: fails the user's stated desire to see arrival/time context.

## Decision: Use Leaflet for lightweight map display, but keep the recommendation list primary

**Rationale**: Leaflet 1.9.4 is a mobile-friendly open-source interactive map library. It is enough to show destination and recommended parking markers without making the map the main decision surface.

**Alternatives considered**:

- No map in MVP: faster, but less inspectable when validating recommendations.
- Google embedded maps: heavier and billing-dependent.

## Decision: Abstract destination search provider

**Rationale**: The user is unsure between Google Places, free OSM-based geocoding, and share input. Search should be isolated behind a small adapter returning a common `Destination` shape. This keeps early development cheap and keeps Google Places/Routes replaceable.

**Alternatives considered**:

- Hard-code Google Places first: best autocomplete quality, but requires Google billing setup and key restrictions.
- Hard-code Nominatim directly from UI: free for development, but public usage is rate-limited and must respect identification/attribution requirements.
- Manual coordinates only: acceptable for early debug, not acceptable for the mobile user workflow.

## Decision: Treat PWA share target as post-MVP

**Rationale**: The ideal workflow is sharing a place from Google Maps into the parking web tool, but web share target support is limited/experimental and requires the PWA to be installed. It should follow after the basic search-and-recommend workflow works.

**Alternatives considered**:

- Build share target first: high platform risk before the main product value is proven.
- Ignore sharing entirely: misses a strong future UX path, so preserve it in the design and data model.

## Decision: Use Cloudflare Worker as the live-data proxy when moving beyond local snapshots

**Rationale**: Browser code must not expose TDX credentials. A small edge proxy can obtain TDX data using server-side secrets, normalize or forward it, and add CORS headers for the web tool.

**Alternatives considered**:

- Browser calls TDX directly: exposes credentials and may hit CORS issues.
- Traditional server: more deployment/admin work than the side-project MVP needs.
- Continue generated `public/data.json` forever: good for demos but not live enough for mobile use.

## Docs Snapshot

Library: Google Maps URLs
Source: https://developers.google.com/maps/documentation/urls/get-started
Key API signatures confirmed:
- Directions URL base: `https://www.google.com/maps/dir/?api=1&parameters`
- Directions action displays path, distance, and travel time.
Deprecated APIs found: None for Maps URLs in this use.
Migration notes: None.

Library: Nominatim Search API
Source: https://nominatim.org/release-docs/latest/api/Search/
Key API signatures confirmed:
- Search endpoint: `https://nominatim.openstreetmap.org/search?<params>`
- Free-form query parameter: `q`
- Output formats include `json`, `jsonv2`, `geojson`, and `geocodejson`.
Deprecated APIs found:
- `https://nominatim.openstreetmap.org/search.php` is deprecated; use `/search`.
Migration notes: Use `/search` with explicit `format`.

Library: OpenStreetMap Foundation Nominatim Usage Policy
Source: https://operations.osmfoundation.org/policies/nominatim/
Key policy constraints confirmed:
- Public service maximum is 1 request per second.
- A valid HTTP Referer or User-Agent identifying the application is required.
- Attribution is required.
Deprecated APIs found: None.
Migration notes: For heavier/production usage, use a dedicated geocoding provider or self-hosted service.

Library: Leaflet 1.9.4
Source: https://leafletjs.com/reference.html
Key API signatures confirmed:
- `L.map(<String> id, <Map options> options?)`
- `setView(<LatLng> center, <Number> zoom, <Zoom/pan options> options?)`
- `L.marker([lat, lng])`
Deprecated APIs found: None for MVP map use.
Migration notes: Reference page is for Leaflet 1.9.4; check version if upgraded.

Library: Cloudflare Workers Fetch API
Source: https://developers.cloudflare.com/workers/runtime-apis/fetch/
Key API signatures confirmed:
- `fetch(resource, options?) : Promise<Response>`
- Module Worker entry point: `export default { async fetch(request, env, ctx) { ... } }`
Deprecated APIs found:
- Service Worker syntax is deprecated but still supported; use Module Workers.
Migration notes: Keep Worker code in module syntax.

Library: Web Share Target
Source: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target
Key API signatures confirmed:
- Manifest member: `share_target`
- Required object fields include `action` and `params`.
- Installed PWAs can register as system share targets where supported.
Deprecated APIs found: None.
Migration notes: Treat as enhancement because MDN marks it limited availability and experimental.
