# Tasks: Parking Recommendation

**Input**: Design documents from `/specs/001-parking-recommendation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/parking-api.md, quickstart.md

**Tests**: Included because the implementation plan requires Node unit tests, contract checks, and mobile workflow validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase when dependencies are met
- **[Story]**: Which user story this task belongs to
- Every task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing JavaScript project for modular browser, script, and Worker code.

- [X] T001 Update `package.json` to use ES modules and add `test`, `dev`, and `serve` scripts
- [X] T002 Create source directory placeholders in `public/src/parking/.gitkeep`, `public/src/auth/.gitkeep`, `public/src/search/.gitkeep`, `public/src/navigation/.gitkeep`, `public/src/ui/.gitkeep`, `worker/.gitkeep`, `tests/unit/.gitkeep`, and `tests/contract/.gitkeep`
- [X] T003 [P] Update `.gitignore` to exclude `.env*`, `.dev.vars*`, `node_modules/`, `public/data.json`, build output, and local logs
- [X] T004 [P] Create `worker/wrangler.toml` with required secret names documented for `TDX_ID`, `TDX_SECRET`, and `OWNER_ACCESS_SECRET`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared modules and private access controls that must exist before user stories use live or snapshot data.

**CRITICAL**: No user story work should begin until this phase is complete.

- [X] T005 [P] Implement supported city metadata and coverage helpers in `public/src/parking/city.js`
- [X] T006 [P] Implement TDX car park and availability normalization in `public/src/parking/normalize.js`
- [X] T007 [P] Implement distance, approximate time, scoring, and top-N ranking helpers in `public/src/parking/rank.js`
- [X] T008 [P] Implement Google Maps directions URL builder in `public/src/navigation/google-maps-url.js`
- [X] T009 [P] Implement PIN unlock, remembered access, request auth header, 401 reset, and lock-device helpers in `public/src/auth/access.js`
- [X] T010 [P] Implement shared API error and JSON response helpers in `worker/response.js`
- [X] T011 Configure Node test runner and module imports in `package.json`
- [X] T012 [P] Add unit tests for normalization edge cases in `tests/unit/normalize.test.js`
- [X] T013 [P] Add unit tests for ranking, distance, zero-space demotion, unknown availability, and top-three cap in `tests/unit/rank.test.js`
- [X] T014 [P] Add unit tests for Google Maps URL encoding in `tests/unit/google-maps-url.test.js`
- [X] T015 [P] Add unit tests for remembered access and auth header behavior in `tests/unit/access.test.js`
- [X] T016 Run `npm test` and keep failing tests documented before implementation fixes in `tests/README.md`

**Checkpoint**: Shared modules, private access helpers, and tests are ready.

---

## Phase 3: User Story 1 - Recommend Nearby Parking For A Destination (Priority: P1) MVP

**Goal**: A mobile user can choose a destination and see up to three ranked parking recommendations with availability and distance/time context.

**Independent Test**: Enter a known Zhongli/Taoyuan destination and verify the page shows up to three ranked recommendations with name, availability status, distance, and approximate time.

### Tests for User Story 1

- [X] T017 [P] [US1] Add recommendation API contract tests for success, no usable parking, and unavailable parking data in `tests/contract/parking-api.test.js`
- [X] T018 [P] [US1] Add snapshot recommendation fixture data for Zhongli in `tests/fixtures/tdx-taoyuan-sample.json`

### Implementation for User Story 1

- [X] T019 [US1] Refactor `fetch-parking.mjs` to use `public/src/parking/city.js`, `public/src/parking/normalize.js`, and `public/src/parking/rank.js`
- [X] T020 [US1] Update `fetch-parking.mjs` to write normalized recommendations and destination metadata to `public/data.json`
- [X] T021 [P] [US1] Create mobile-first app shell and recommendation list markup in `public/index.html`
- [X] T022 [P] [US1] Create mobile-first layout, unlock state, loading state, result state, empty state, and error state styles in `public/src/ui/styles.css`
- [X] T023 [US1] Implement browser app workflow for loading snapshot data and rendering top recommendations in `public/src/ui/app.js`
- [X] T024 [US1] Implement recommendation warnings for unknown availability, stale data, no coverage, and all-full results in `public/src/ui/app.js`
- [X] T025 [US1] Wire `public/index.html` to load `public/data.json`, `public/src/ui/styles.css`, and `public/src/ui/app.js`
- [X] T026 [US1] Validate Scenario 1 and Scenario 3 from `spec-kit/specs/001-parking-recommendation/quickstart.md`

**Checkpoint**: User Story 1 is functional as a local/snapshot MVP.

---

## Phase 4: User Story 2 - Navigate To A Recommended Parking Lot (Priority: P2)

**Goal**: A user can tap a recommended parking lot and open Google Maps navigation to that parking lot.

**Independent Test**: Tap the navigation action for a shown recommendation and confirm Google Maps opens with the parking lot as the route destination.

### Tests for User Story 2

- [X] T027 [P] [US2] Add UI-level navigation link tests using generated recommendation data in `tests/unit/navigation-ui.test.js`

### Implementation for User Story 2

- [X] T028 [US2] Add one-tap navigation actions to recommendation rendering in `public/src/ui/app.js`
- [X] T029 [US2] Add external navigation fallback text and copyable destination coordinates in `public/src/ui/app.js`
- [X] T030 [US2] Add accessible navigation button styles and touch target sizing in `public/src/ui/styles.css`
- [X] T031 [US2] Validate Scenario 4 from `spec-kit/specs/001-parking-recommendation/quickstart.md`

**Checkpoint**: User Story 2 works independently on top of the recommendation list.

---

## Phase 5: User Story 3 - Search Destinations Efficiently On Mobile (Priority: P3)

**Goal**: A user can type a place name such as `中原大學`, select a suggestion, and use that destination for recommendations.

**Independent Test**: Type `中原大學`, select the most relevant suggestion, and verify recommendations are generated for that destination.

### Tests for User Story 3

- [X] T032 [P] [US3] Add search adapter tests for successful results, empty results, and provider failure in `tests/unit/geocode.test.js`
- [X] T033 [P] [US3] Add search API contract tests for `/api/search` success, `SEARCH_UNAVAILABLE`, `UNAUTHORIZED`, and `RATE_LIMITED` in `tests/contract/search-api.test.js`

### Implementation for User Story 3

- [X] T034 [US3] Implement provider-isolated destination search adapter in `public/src/search/geocode.js`
- [X] T035 [US3] Add destination search input, suggestions list, empty state, and selected destination display in `public/index.html`
- [X] T036 [US3] Add debounced search, suggestion selection, and destination-to-recommendation flow in `public/src/ui/app.js`
- [X] T037 [US3] Add search UI styles, attribution area, and mobile keyboard-friendly spacing in `public/src/ui/styles.css`
- [X] T038 [US3] Implement private Worker `/api/search` route with auth check before provider calls in `worker/index.js`
- [X] T039 [US3] Implement private Worker `/api/recommendations` route with auth check, TDX fetch, normalization, ranking, and CORS in `worker/index.js`
- [X] T040 [US3] Add Worker request limiting and short-lived response caching in `worker/index.js`
- [X] T041 [US3] Connect browser API mode, PIN unlock screen, remembered access, automatic auth headers, 401 reset, and lock-device action in `public/src/ui/app.js`
- [X] T042 [US3] Validate Scenario 5 and Scenario 6 from `spec-kit/specs/001-parking-recommendation/quickstart.md`

**Checkpoint**: User Story 3 supports live private search and live private recommendations.

---

## Phase 6: User Story 4 - Use A Shared Place As Input (Priority: P4)

**Goal**: An installed PWA can receive shared place text or URLs where supported and convert them into a destination search flow.

**Independent Test**: Share a place from a supported mobile environment into the web tool and verify the PWA pre-fills or resolves the destination, or falls back to manual search.

### Tests for User Story 4

- [X] T043 [P] [US4] Add shared input parsing tests for text, URL, and unresolved input in `tests/unit/share-target.test.js`

### Implementation for User Story 4

- [X] T044 [US4] Add PWA manifest with `share_target` configuration in `public/manifest.webmanifest`
- [X] T045 [US4] Add service worker shell for installed PWA and share-target handoff in `public/service-worker.js`
- [X] T046 [US4] Implement shared text and URL parsing in `public/src/search/share-target.js`
- [X] T047 [US4] Connect shared input prefill and fallback behavior in `public/src/ui/app.js`
- [X] T048 [US4] Add install/share-target notes to `README.md`

**Checkpoint**: User Story 4 is available as a post-MVP enhancement where browser support allows it.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, documentation, and validation across all implemented stories.

- [X] T049 [P] Update `README.md` with local setup, `.env` keys, snapshot workflow, private PIN workflow, Cloudflare deployment notes, and quickstart commands
- [X] T050 [P] Add Cloudflare secret setup notes and do-not-commit guidance in `worker/README.md`
- [X] T051 [P] Add OpenStreetMap/Nominatim attribution display requirements to `public/src/ui/app.js`
- [X] T052 Harden UI text overflow, mobile viewport behavior, and loading/error transitions in `public/src/ui/styles.css`
- [X] T053 Run `npm test` and fix failures in `public/src/parking/normalize.js`, `public/src/parking/rank.js`, `public/src/search/geocode.js`, `public/src/auth/access.js`, `public/src/navigation/google-maps-url.js`, and `worker/index.js`
- [X] T054 Validate all quickstart scenarios and record results in `spec-kit/specs/001-parking-recommendation/validation.md`
- [X] T055 Review generated `public/data.json`, `.env`, `.dev.vars`, and `.agents/` ignore coverage in `.gitignore`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; creates the snapshot MVP.
- **US2 (Phase 4)**: Depends on US1 recommendation rendering.
- **US3 (Phase 5)**: Depends on Foundational and can reuse US1 rendering; should be implemented after US1 for a clearer MVP path.
- **US4 (Phase 6)**: Depends on US3 search flow; post-MVP enhancement.
- **Polish (Phase 7)**: Depends on implemented stories.

### User Story Dependencies

- **US1 Recommend Nearby Parking**: First MVP slice after foundation.
- **US2 Navigation Handoff**: Requires recommendations from US1.
- **US3 Destination Search**: Can reuse US1 ranking/rendering; live Worker routes require foundation auth helpers.
- **US4 Shared Place Input**: Requires US3 search/destination resolution.

### Parallel Opportunities

- T003 and T004 can run in parallel after T001.
- T005 through T015 can mostly run in parallel after T001-T004, except T016 waits for tests to exist.
- T017 and T018 can run in parallel.
- T021 and T022 can run in parallel while T019-T020 refactor data generation.
- T032 and T033 can run in parallel.
- T034, T035, and T037 can run in parallel before T036.
- T043 can run before T044-T047.
- T049, T050, and T051 can run in parallel during polish.

---

## Parallel Example: User Story 1

```text
Task: "T017 [P] [US1] Add recommendation API contract tests for success, no usable parking, and unavailable parking data in tests/contract/parking-api.test.js"
Task: "T018 [P] [US1] Add snapshot recommendation fixture data for Zhongli in tests/fixtures/tdx-taoyuan-sample.json"
Task: "T021 [P] [US1] Create mobile-first app shell and recommendation list markup in index.html"
Task: "T022 [P] [US1] Create mobile-first layout, unlock state, loading state, result state, empty state, and error state styles in public/src/ui/styles.css"
```

## Parallel Example: User Story 3

```text
Task: "T032 [P] [US3] Add search adapter tests for successful results, empty results, and provider failure in tests/unit/geocode.test.js"
Task: "T033 [P] [US3] Add search API contract tests for /api/search success, SEARCH_UNAVAILABLE, UNAUTHORIZED, and RATE_LIMITED in tests/contract/search-api.test.js"
Task: "T034 [US3] Implement provider-isolated destination search adapter in public/src/search/geocode.js"
Task: "T035 [US3] Add destination search input, suggestions list, empty state, and selected destination display in index.html"
Task: "T037 [US3] Add search UI styles, attribution area, and mobile keyboard-friendly spacing in public/src/ui/styles.css"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) to get a local snapshot-based recommendation tool.
3. Complete Phase 4 (US2) to make the MVP useful while driving.
4. Stop and validate Scenarios 1, 3, and 4 from `quickstart.md`.

### Private Live Version

1. Complete US3 search and Worker tasks.
2. Validate PIN unlock, remembered access, 401 reset, rate limiting, and no exposed TDX credentials.
3. Deploy frontend to Cloudflare Pages and Worker to Cloudflare Workers when ready.

### Post-MVP Enhancement

1. Complete US4 only after the mobile web flow is stable.
2. Treat PWA share target as best-effort because browser/platform support varies.

## Notes

- Keep TDX credentials, Google keys, PIN secrets, `.env`, and `.dev.vars` out of git.
- Do not embed Google Maps or Google Places unless a later task explicitly changes the plan.
- Keep recommendation logic pure and testable so `fetch-parking.mjs`, `public/src/ui/app.js`, and `worker/index.js` can share behavior.
- Mark tasks `[X]` in this file as they are completed during `$speckit-implement`.
