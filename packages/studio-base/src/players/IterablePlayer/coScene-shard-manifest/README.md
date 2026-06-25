# Shard-manifest playback

Plays a recording directly from object storage using a `manifest.json` that
describes the available shards and profiles. The manifest and its shards are
fetched over plain HTTP range requests — no honeybee server round-trip for the
media itself.

There are two entry points:

- **Data-platform fallback** (`CoSceneDataPlatformDataSourceFactory`): when a
  logged-in `viz` session has a manifest available, playback transparently reads
  from it. Requires login / `consoleApi`.
- **Standalone deep link** (`CoSceneShardManifestDataSourceFactory`): fully
  authless. Point the app at a manifest (and optionally a layout) entirely via
  the URL, with no login.

## Standalone deep link

Params live in the URL **fragment** (`#…`), not the query string. The fragment
is never sent to the server, so every shared link requests the same document
path (`/viz/`) and reuses the cached, content-hashed asset bundle instead of
busting it with a varying query string.

```
https://<host>/viz/#manifestUrl=<encoded manifest URL>&layoutUrl=<encoded layout URL>&profile=<id>&time=<RFC3339>
```

| Param         | Required | Meaning                                           |
| ------------- | -------- | ------------------------------------------------- |
| `manifestUrl` | yes      | URL of the `manifest.json` to play.               |
| `layoutUrl`   | no       | URL of a Foxglove layout JSON, applied in-memory. |
| `profile`     | no       | Preferred manifest profile id.                    |
| `time`        | no       | Playback time to seek to (RFC3339).               |

`manifestUrl`/`layoutUrl` must be URL-encoded. `layoutUrl` accepts either a bare
layout-data document or one wrapped as `{ "name": …, "data": { … } }`. Both URLs
need to be CORS-readable from the app origin.

Parsing lives in `util/standalonePlayback.ts`; the flow is driven by
`components/StandalonePlaybackAdapter.tsx`, which renders instead of the normal
`DeepLinksSyncAdapter` whenever standalone params are present.

## Deploying a temporary build (Cloudflare Pages)

`yarn web:deploy:cf` builds the production web bundle and, only if the build
succeeds, uploads it to Cloudflare Pages as a temporary (preview) deployment via
`wrangler` — preview deployments get a unique `*.pages.dev` URL.

Authenticate first (`npx wrangler login`, or set `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID`). Optional overrides: `CF_PAGES_PROJECT` (default
`honeybee-temp`) and `CF_PAGES_BRANCH` (default `temp`). See `ci/deploy-cf-pages.ts`.
