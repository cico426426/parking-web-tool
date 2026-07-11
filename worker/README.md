# Worker Deployment Notes

Use Cloudflare Worker secrets for sensitive values. Do not commit `.env`, `.dev.vars`, TDX credentials, Google keys, or the owner PIN/access secret.

Required secrets:

```sh
npx wrangler secret put TDX_ID
npx wrangler secret put TDX_SECRET
npx wrangler secret put OWNER_ACCESS_SECRET
```

Optional variables:

- `DEFAULT_CITY`: defaults to `Taoyuan`
- `RATE_LIMIT_MAX`: defaults to `60`
- `RATE_LIMIT_WINDOW_MS`: defaults to `60000`
- `SEARCH_USER_AGENT`: identifies this app when calling geocoding providers

The Worker rejects requests without `Authorization: Bearer <OWNER_ACCESS_SECRET>` before it calls TDX or a geocoding provider.
