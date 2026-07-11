# Implementation Plan: Parking Recommendation

**Branch**: `001-parking-recommendation` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-parking-recommendation/spec.md`

## Summary

Build a private, mobile-first parking recommendation web app for Taiwan destinations. The MVP turns a selected destination into up to three ranked parking recommendations with availability, distance/time context, and a one-tap Google Maps navigation handoff. The implementation will reuse the existing Node.js TDX parking-data script for the first data pipeline, then move live data access behind a small Cloudflare Worker proxy so credentials are not exposed to the browser and only the owner can consume quota. Destination search starts as a provider-isolated module so the app can use a free geocoder for development and later switch to Google Places if billing is acceptable.

## Technical Context

**Language/Version**: JavaScript on Node.js 20+ for local scripts and Worker logic; browser JavaScript, HTML, and CSS for the mobile web UI.

**Primary Dependencies**: Existing native `fetch` in Node/browser/Worker; Leaflet 1.9.4 for optional map display; Google Maps URLs for external navigation handoff; TDX parking APIs for parking lot and availability data; provider-isolated geocoding with Nominatim/Photon for development and Google Places as a possible later replacement.

**Storage**: No database for MVP. Local generated `data.js`/JSON snapshot for Phase 1; live responses from Worker for Phase 4; optional browser cache for recent search results only. Store the server-side access secret as a Worker environment variable; store only remembered access state on the owner's device after the first successful PIN/password unlock.

**Testing**: Node built-in test runner for pure ranking/normalization functions; Playwright or equivalent browser smoke tests for the mobile workflow; manual mobile validation for navigation handoff.

**Target Platform**: Mobile web browsers first, desktop browser acceptable for development. Later PWA installation and share target support are enhancements.

**Project Type**: Small web application with a static frontend, local data-fetch script, and optional edge proxy.

**Performance Goals**: Supported destination search to recommendation display in under 15 seconds on normal mobile network; local ranking over city-level parking data completes fast enough to feel immediate after data is loaded.

**Constraints**: Do not expose TDX credentials in browser code; require a simple unlock flow before live API calls; reject invalid requests before calling TDX/geocoding providers; add basic rate limiting and short-lived caching; clearly label unknown or stale availability; keep Google Maps embedded map APIs out of MVP to avoid unnecessary billing and complexity; keep public geocoding usage rate-limited and replaceable.

**Scale/Scope**: Side-project MVP for personal/mobile usage, initially validated around Taoyuan/Zhongli and common Taiwan destinations. Target one primary screen and one optional map view, not a full account-based product.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution file still contains template placeholders and defines no active gates. Planning therefore applies the following local gates derived from the feature spec:

- Privacy/secret gate: PASS. Credentials stay in `.env` locally or Worker environment variables; browser receives only normalized public data; live Worker routes require remembered private access before consuming external API quota.
- Simplicity gate: PASS. No database, user accounts, embedded Google map, or native app for MVP.
- Testability gate: PASS. Ranking, normalization, and contract responses can be tested independently from the UI.
- Mobile workflow gate: PASS. The plan centers the destination-to-three-recommendations workflow.

Post-design re-check: PASS. The selected artifacts preserve the same gates.

## Project Structure

### Documentation (this feature)

```text
specs/001-parking-recommendation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── parking-api.md
└── tasks.md
```

### Source Code (repository root)

```text
fetch-parking.mjs            # existing local TDX fetch/debug entry point
data.js                      # generated MVP data snapshot, ignored or regenerated
index.html                   # mobile web app shell
src/
├── parking/
│   ├── normalize.js         # normalize TDX parking and availability records
│   ├── rank.js              # distance, scoring, top-three recommendation logic
│   └── city.js              # supported city mapping and coverage helpers
├── auth/
│   └── access.js            # PIN unlock, remembered access, and request auth helpers
├── search/
│   └── geocode.js           # provider-isolated destination search adapter
├── navigation/
│   └── google-maps-url.js   # external navigation URL builder
└── ui/
    └── app.js               # browser workflow and rendering
worker/
└── index.js                 # optional private live-data proxy for TDX/geocoding
tests/
├── unit/
│   ├── normalize.test.js
│   ├── rank.test.js
│   └── google-maps-url.test.js
└── contract/
    └── parking-api.test.js
```

**Structure Decision**: Keep a single small JavaScript project in the existing repository root. Shared pure logic lives under `src/` so the local script, browser UI, and Worker can reuse the same decisions where practical. The Worker is isolated under `worker/` because it has deployment-specific concerns and secret access.

## Complexity Tracking

No constitution violations or justified complexity exceptions.
