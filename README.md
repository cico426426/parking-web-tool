# 停哪好

Private mobile web tool/PWA for choosing where to park near a destination.

## Local Setup

Create `.env` in the repository root:

```text
TDX_ID=your-client-id
TDX_SECRET=your-client-secret
```

Generate a snapshot:

```sh
npm run dev
```

The snapshot includes Taoyuan parking lots and availability. After it is generated, the web page can re-rank the same parking data for another searched destination without calling TDX again.

Open the static web tool:

```sh
npm run serve
```

Then visit `http://localhost:8080`.

In local snapshot mode, the destination search uses a public geocoder when available and falls back to built-in common places such as `中原大學`, `中壢火車站`, and `桃園高鐵站`.

You can also paste a Google Maps share link into the search box. Full Google Maps URLs that already contain coordinates can be parsed in the browser. Short links such as `maps.app.goo.gl/...` need the deployed Worker because the server has to follow the redirect first.

## Taiwan Address Coverage

The intended deployed flow supports Taiwan restaurants, attractions, and addresses by:

1. Searching the destination text or resolving a pasted Google Maps share link.
2. Reading the returned city/county from the geocoder result.
3. Converting it to a TDX city key such as `Taipei`, `NewTaipei`, or `Taoyuan`.
4. Asking the Worker to fetch nearby TDX car parks with the destination coordinates.
5. Falling back to city-wide parking data if a nearby TDX query returns no usable lots.

TDX parking availability is still matched by parking lot ID after the candidate lots are loaded.

Local snapshot mode is different: `data.js` contains only one city's parking data at a time. To test another city locally, regenerate the snapshot:

```sh
PARKING_CITY=Taipei npm run dev
```

Then refresh the page.

## Private Web Flow

The deployed version is intended for personal use. The browser shows a PIN/password unlock screen on a new device, remembers access locally, and automatically authorizes API requests. The Worker rejects unauthenticated requests before calling TDX or geocoding providers.

## Validation

Run tests:

```sh
npm test
```

Relevant spec-kit docs live in `spec-kit/specs/001-parking-recommendation/`.

## Deployment Direction

MVP deployment target:

- Static frontend: Cloudflare Pages
- Private API proxy: Cloudflare Workers
- Secrets: Cloudflare Worker secrets

Oracle Cloud can stay unused until the project needs a long-running server or database.
