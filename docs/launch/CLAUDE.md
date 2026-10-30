# docs/launch: Polish & Launch (Section 9)

Everything needed to take the game from "works on my machine" to a public URL people can share. Some steps need the user (accounts, domain, money). **Stop and ask at each one marked 👤.**

## Files to Produce Here

```
privacy.md        source text for the privacy page (also rendered in-game)
deploy.md         exact deploy steps, written as you do them, so they can be repeated
launch-plan.md    where and when to post, and what to say
checklist.md      the final go/no-go list below, ticked
```

## Deploy Steps (write the real commands into deploy.md as you go)

1. 👤 The user creates or logs into a Cloudflare account. Never handle their password; they run `wrangler login` themselves.
2. Create the production D1 database and apply `worker/migrations/` (`--remote`).
3. Deploy the Worker; note its URL.
4. Build the site with the production API URL and deploy it. Cloudflare Pages now deploys as a Worker with static assets: the root `wrangler.jsonc` serves `dist/` with `npx wrangler deploy`. Never run `wrangler pages project create` again; its auto-setup rewrites the build (see deploy.md).
5. 👤 Pick the final game name and domain; the user buys it. Connect it in Cloudflare.
6. Set `LAUNCH_DATE` and the share URL in `src/core/daily/` and redeploy.
7. Turn on Cloudflare Web Analytics, which is cookie-free: add the site in the dashboard (manual JS snippet, not the automatic injection, so the page has exactly one beacon), then build with `VITE_CF_BEACON_TOKEN=<its 32-hex token>`. `scripts/analytics.ts` adds the beacon only when that token is set, and a malformed token stops the build. The privacy page already says what it sees.

## Privacy Page (must match what the code does)

Plain words, short:
- What we store: the nickname you choose, your equations and scores, and when you submitted them.
- What's on your device: your progress and settings, in your browser's storage.
- What we don't collect: no accounts, no emails, no cookies, no ads tracking (until ads exist; update this then).
- Players must be 13+ to submit to leaderboards.
- Contact: 👤 ask the user for a contact email for the page.

If the code ever stores something new, this page changes **in the same commit**.

## Go / No-Go Checklist

- [ ] All tests, `check-levels`, lint and build pass on `main`
- [ ] Daily pool covers at least 30 days past launch
- [ ] Played start to finish on a real phone and a desktop browser
- [ ] Leaderboard rejects a faked score in production (try it with curl)
- [ ] Privacy page live and accurate
- [ ] Share text works and links to the real domain
- [ ] Sound is muted by default or has an obvious mute
- [ ] Error states are friendly: no API, blocked storage, bad input

## Launch Plan Ideas (draft in launch-plan.md, the user approves)

- Friends and squash club first (a small test), then r/WebGames, r/math, r/puzzles, math teacher communities, Hacker News "Show HN"
- Post a short clip of a cart flying off a hill; it explains the game in 5 seconds
- Launch on a weekday morning (US time), and have 30+ dailies ready
