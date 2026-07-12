# Quickstart: Parking Recommendation

This guide validates the planned feature end to end. It assumes commands are run from the repository root, not from `spec-kit/`.

## Prerequisites

- Node.js 20 or newer.
- TDX credentials available in `.env`:

```text
TDX_ID=...
TDX_SECRET=...
```

## Scenario 1: Validate Existing TDX Access

Run:

```sh
node --env-file=.env fetch-parking.mjs
```

Expected result:

- Script authenticates successfully.
- Script prints whether car park and availability responses are arrays.
- Script prints a short preview of both raw responses.

If this fails:

- Check `.env` names match `TDX_ID` and `TDX_SECRET`.
- Check whether the selected city is supported.
- Check whether the TDX endpoint path has changed.

## Scenario 2: Validate Recommendation Logic

After implementation tasks add normalization/ranking modules, run:

```sh
npm test
```

Expected result:

- Ranking tests pass for a destination near Zhongli.
- Parking lots without coordinates are excluded.
- Lots with available spaces rank above full lots when distance is comparable.
- Returned recommendation count is capped at three for the primary workflow.

## Scenario 3: Validate Mobile Web MVP With Snapshot Data

After implementation tasks add `public/index.html` and snapshot generation:

```sh
node --env-file=.env fetch-parking.mjs
```

Then open `public/index.html` in a browser or serve the folder locally if browser fetch behavior requires it.

Expected result:

- Page is usable at mobile width.
- User can select or enter a destination.
- Page shows up to three recommendations.
- Each recommendation shows name, availability status, distance/time context, and a navigation action.

## Scenario 4: Validate Navigation Handoff

From the recommendation result:

1. Tap the navigation action for the first parking lot.
2. Confirm the device/browser opens Google Maps or a Google Maps web route.

Expected result:

- Route target is the selected parking lot, not the original destination.
- If the external app cannot open, a usable browser link remains available.

## Scenario 5: Validate Live Proxy

After Worker implementation tasks:

1. Configure TDX credentials as Worker environment variables.
2. Configure the private owner PIN/password or derived access secret as a Worker environment variable.
3. Deploy or run the Worker locally.
4. Point the frontend API base URL to the Worker.
5. Open the web tool on the owner's device and enter the PIN/password once.
6. Search a supported destination and request recommendations.

Expected result:

- Browser does not contain TDX credentials.
- Later page opens on the same device do not require manually adding tokens or headers.
- Requests without remembered private access return `401` and do not call external APIs.
- A `401` response clears remembered access and shows the unlock screen.
- Repeated requests are limited or served from cache according to the MVP quota-protection rules.
- Worker returns normalized parking data or recommendation data.
- CORS allows the frontend to read the response.
- Missing availability is shown as unknown, not as zero.

## Scenario 6: Validate Destination Search

After search adapter tasks:

1. Type `中原大學` in the search box.
2. Select the most relevant suggestion.

Expected result:

- The selected suggestion resolves to coordinates.
- Recommendations are generated for that selected destination.
- If no reliable result is available, the UI shows an empty state and allows another query.
