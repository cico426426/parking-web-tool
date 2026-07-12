# Worker Deployment Notes

Use Cloudflare Worker secrets for sensitive values. Do not commit `.env`, `.dev.vars`, TDX credentials, Google keys, or the owner PIN/access secret.

Required secrets:

```sh
npx wrangler secret put TDX_ID
npx wrangler secret put TDX_SECRET
npx wrangler secret put OWNER_ACCESS_SECRET
```

Optional Google Maps link resolver:

```sh
npx wrangler secret put GOOGLE_MAPS_API_KEY
```

Set this to a Google Maps Platform key restricted to Places API (New) and Routes API. When present, mobile Google Maps share links that expand to a text query are resolved with Google Places Text Search before falling back to the public geocoder. Recommendations also use Routes Compute Route Matrix to replace straight-line estimates with Google walking distance and time for the top candidates.

Optional variables:

- `DEFAULT_CITY`: defaults to `Taoyuan`
- `RATE_LIMIT_MAX`: defaults to `60`
- `RATE_LIMIT_WINDOW_MS`: defaults to `60000`
- `SEARCH_USER_AGENT`: identifies this web tool when calling geocoding providers

The Worker rejects requests without `Authorization: Bearer <OWNER_ACCESS_SECRET>` before it calls TDX or a geocoding provider.
