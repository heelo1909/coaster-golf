# Deploy

The exact steps that put Coaster Golf online, written as they were done (first on 2026-10-30) so they can be repeated. Run every command from the repo root.

| What | Where |
|---|---|
| Site (the game) | https://coaster-golf.coaster-golf.workers.dev, Worker `coaster-golf`, config `wrangler.jsonc` |
| Leaderboard API | https://coaster-golf-api.coaster-golf.workers.dev, Worker `coaster-golf-api`, config `worker/wrangler.toml` |
| Database | D1 `coaster-golf`, id `37aee9ea-1e0d-48d9-b7b2-b597e6622547` |

Cloudflare Pages now deploys as a Worker with static assets, so the site is a Worker that only serves `dist/` (no code of its own). Both Workers have request logs off (`observability` disabled), so no visitor IPs are kept, as the privacy page says.

## 1. Sign in to Cloudflare (the owner does this)

```bash
npx wrangler login
```

It opens a browser to approve access. Check it worked:

```bash
npx wrangler whoami
```

## 2. Production database (once)

```bash
npx wrangler d1 create coaster-golf
```

Put the `database_id` it prints into `worker/wrangler.toml`, then create the tables. Run the second command again whenever a new file lands in `worker/migrations/`:

```bash
npx wrangler d1 migrations apply coaster-golf --remote --config worker/wrangler.toml
```

## 3. Leaderboard API

`ALLOWED_ORIGIN` in `worker/wrangler.toml` must be the site's address (change it when the domain changes).

```bash
npx wrangler deploy --config worker/wrangler.toml
```

## 4. Site

Build with the API's address baked in, then upload `dist/`:

```bash
VITE_API_URL=https://coaster-golf-api.coaster-golf.workers.dev npm run build
```

```bash
npx wrangler deploy
```

Gotchas from the first deploy:
- `npx wrangler pages project create` ran Wrangler's auto-setup: it added `@cloudflare/vite-plugin`, rewrote `vite.config.ts`, `package.json` and `.gitignore`, and wrote `.wrangler/deploy/config.json`. All of that was reverted (the site is static and needs none of it); don't run it again. If `wrangler deploy` complains about `.wrangler/deploy/config.json`, delete that one file (leave `.wrangler/state`, the local test database).
- A new `*.workers.dev` subdomain can fail TLS (`SEC_E_ILLEGAL_MESSAGE` in curl) for a few minutes while its certificate is issued.

## 5. Check it

```bash
curl -s "https://coaster-golf-api.coaster-golf.workers.dev/leaderboard?level=c01"
```

A faked score must be refused (`run_failed`, nothing saved):

```bash
curl -s -X POST -H "Content-Type: application/json" -d '{"levelId":"c01","equation":"x^3","nickname":"deploycheck","score":1,"success":true}' https://coaster-golf-api.coaster-golf.workers.dev/submit
```

## 6. Domain

None for now (the owner's call, 2026-10-30): the game stays on the workers.dev address. To add one later, connect it to the `coaster-golf` Worker as a custom domain, change `ALLOWED_ORIGIN` in `worker/wrangler.toml` and `SHARE_URL` in `src/core/daily/share.ts`, then redeploy both (steps 3 and 4).

## 7. Launch date and share URL

`LAUNCH_DATE` in `src/core/daily/schedule.ts` is 2026-10-30 (daily #1). `SHARE_URL` in `src/core/daily/share.ts` is the live address. After changing either, rebuild and redeploy (step 4). Never move `LAUNCH_DATE` after launch: it renumbers every daily and its leaderboard.

## 8. Web Analytics

_(after the site is live: add the site in the dashboard with the manual JS snippet, then build with `VITE_CF_BEACON_TOKEN=<token>` as well and redeploy)_
