# 停哪好

Private mobile web tool/PWA for choosing where to park near a destination.

## Local Setup

Create `.env` in the repository root:

```text
TDX_ID=your-client-id
TDX_SECRET=your-client-secret
```

Generate a local snapshot:

```sh
npm run dev
```

The snapshot is written to `public/data.json` and includes Taoyuan parking lots and availability. After it is generated, the web page can re-rank the same parking data for another searched destination without calling TDX again.

Open the static web tool:

```sh
npm run serve
```

Then visit `http://localhost:8080`.

In local snapshot mode, the destination search uses a public geocoder when available and falls back to built-in common places such as `中原大學`, `中壢火車站`, and `桃園高鐵站`.

You can also paste a Google Maps share link into the search box. Full Google Maps URLs that already contain coordinates can be parsed in the browser. Short links such as `maps.app.goo.gl/...` need the deployed Worker because the server has to follow the redirect first.

For mobile Google Maps share links that expand to a place name or address instead of coordinates, configure `GOOGLE_MAPS_API_KEY` on the Worker. The key should be restricted to Places API (New) and Routes API. The Worker uses Places Text Search for destination coordinates and Routes Compute Route Matrix for walking distance/time on the top parking candidates.

## Taiwan Address Coverage

The intended deployed flow supports Taiwan restaurants, attractions, and addresses by:

1. Searching the destination text or resolving a pasted Google Maps share link.
2. Reverse geocoding the destination coordinates to determine the current city/county.
3. Converting it to a TDX city key such as `Taipei`, `NewTaipei`, or `Taoyuan`.
4. Asking the Worker to fetch nearby TDX car parks with the destination coordinates.
5. Falling back to city-wide parking data if a nearby TDX query returns no usable lots.

TDX parking availability is still matched by parking lot ID after the candidate lots are loaded.

Local snapshot mode is different: `public/data.json` contains only one city's parking data at a time. To test another city locally, regenerate the snapshot:

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

## CLI Deployment

Copy the example frontend config and set your Worker URL after the Worker is deployed:

```sh
cp public/config.example.js public/config.js
```

Deploy the Worker first:

```sh
cd worker
npx wrangler login
cd ..
npm run deploy:worker
```

Configure Worker secrets:

```sh
cd worker
npx wrangler secret put TDX_ID
npx wrangler secret put TDX_SECRET
npx wrangler secret put OWNER_ACCESS_SECRET
npx wrangler secret put GOOGLE_MAPS_API_KEY
cd ..
```

Use the Worker URL from the deploy output in `public/config.js`:

```js
globalThis.PARKING_API_BASE_URL = "https://your-worker.workers.dev";
```

Then deploy `public/` to Cloudflare Pages:

```sh
npm run deploy:pages
```

After the first setup, normal deploys can use:

```sh
npm run deploy
```

For dashboard Direct Upload, upload the `public/` folder only. Do not upload the repository root.

Oracle Cloud can stay unused until the project needs a long-running server or database.
