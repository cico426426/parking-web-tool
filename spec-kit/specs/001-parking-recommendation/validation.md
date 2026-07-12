# Validation Results

Created: 2026-07-12

## Automated Tests

Command:

```sh
npm test
```

Result:

- PASS: Unit tests for normalization, ranking, navigation URL, remembered access, geocoding, share-target parsing, and UI navigation rendering.
- PASS: Contract tests for recommendation response shape and private search API behavior.

## Quickstart Scenarios

- Scenario 1: PASS. `npm run dev` authenticated with TDX and loaded 154 Taoyuan parking lots.
- Scenario 2: PASS through automated tests.
- Scenario 3: PASS for HTTP load and snapshot data. `public/data.json` contains three recommendations for the Zhongli Station preset destination.
- Scenario 3 update: PASS for local destination switching after regenerating `public/data.json`; the snapshot now includes full normalized parking lots and availability for client-side re-ranking.
- Taiwan address coverage update: PASS for city-key inference tests across Taiwan city/county names. Live search validation for `台北 101` returned `cityKey: "Taipei"`, so deployed Worker mode can request the matching TDX city instead of reusing Taoyuan data.
- Scenario 4: PASS for generated Google Maps navigation URLs and UI link rendering. Manual mobile app handoff remains device-dependent.
- Scenario 5: PASS through contract tests for auth rejection, rate limiting, CORS responses, and Worker route behavior. Deployed Worker validation remains pending.
- Scenario 6: PASS through search adapter and Worker route tests with mocked provider responses. Live Nominatim validation with an identifying server-side User-Agent returned coordinates for `中原大學`; browser-side public geocoder availability remains provider-dependent.
