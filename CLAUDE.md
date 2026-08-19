# CLAUDE.md

Manitoba Ryder Cup frontend. Vue 3 (`<script setup>`) + Vite + TypeScript + Pinia +
Tailwind CSS v4. A Ryder-Cup-format golf tournament site: leaderboard, match scorecards,
hole-by-hole score entry, player profiles, and a small admin area for teams and lineups.

See [README.md](README.md) for setup and [dev/README.md](dev/README.md) for the local
backend stack.

## Commands

```sh
npm run dev           # Vite dev server (:5173)
npm run test:run      # vitest, once
npm run lint          # eslint
npm run typecheck     # vue-tsc -b (src, tests, and the node-side config)
npm run format        # prettier, write
```

CI gates on format, lint, typecheck, test and build — all five, and `fail-fast: false`, so
one push surfaces everything. Run at least typecheck and test before claiming done.

## Architecture

Three processes, one origin. The frontend runs on the host; Vite proxies `/api/auth` →
**heimdall** (auth, sibling repo `travisbale/heimdall`) and `/api/scorecard` →
**scorecard** (the Go API, sibling repo `manitoba-ryder-cup/scorecard`). Same-origin is
what makes the refresh cookie work — see the `cookiePathRewrite` in `vite.config.ts`
before touching the proxy.

Most of the site reads without a token. Scorecard resolves anonymous reads to the tenant
in `SCORECARD_PUBLIC_TENANT_ID`, which `dev/bootstrap.sh` writes to `.env`. A wrong tenant
serves an empty site that looks perfectly healthy — if pages render but every list is
empty, suspect the tenant before the code.

| Directory | Holds |
| --- | --- |
| `src/api/` | `client.ts` (fetch wrapper), `auth.ts`, `scorecard.ts`, and `types.ts` — the server's shapes |
| `src/lib/` | Pure domain functions. No Vue imports, heavily unit-tested — domain rules belong here, not in components |
| `src/composables/` | Reusable stateful behaviour (`useAsync`, `useToast`, `useMatchContext`, …) |
| `src/components/base/` | `Base*` primitives + `AsyncState`; the rest of `components/` is grouped by feature |
| `src/components/skeleton/` | Loading placeholders. `SkeletonBlock` is the atom; the rest compose it. Goes in `AsyncState`'s `#loading` slot |
| `src/views/` | Route components, all lazy-loaded via dynamic import |
| `src/stores/` | Pinia. Only `auth.ts` — server state is fetched per view, not centrally cached |

**Data views follow one pattern:** `useAsync(fetcher)` for `{ data, error, loading, retry }`,
rendered through `<AsyncState>`. Pass `retry` wherever there's something to re-run — this
gets used on a phone in a field, and a dropped request should be one tap from recovering.
`useAsync`'s `intervalMs` polls live views and deliberately keeps stale data on a failed
poll rather than blanking the page.

Pass a skeleton through `AsyncState`'s `#loading` slot rather than letting a view collapse
to a line of text — and check whether the view renders anything *outside* `AsyncState`
that's gated on the same data, because that chrome stays blank no matter what the slot
contains. Empty-state copy is the related trap: "No tournaments yet.", "Match not found."
and the dashboard's "to be announced" are all claims about *loaded* data that an unloaded
page satisfies just as well. Every view test asserts that copy can't leak into the load.

**Auth.** `ApiClient` refreshes and retries exactly once on a 401; `authApi` bypasses
`ApiClient` because that retry is wrong for every call it makes — a refused login has no
session to refresh, and refresh would recurse into itself. `main.ts` awaits
`auth.restore()` before mounting so route guards see a resolved state. `scorecardApi`
builds its client lazily because Pinia has to be active first — the same reason the router
guard calls `useAuthStore()` inside the guard.

**`isAuthenticated` is only ever the right test for the session itself** — the Logout
button, and nothing else. Everything else gates on *capability*, so it names the scope it
needs: `auth.hasScope(SCOPE_TOURNAMENTS_WRITE)` for the admin area, `SCOPE_SCORES_WRITE`
for the score wheel. The scopes are read off the access token (`lib/token.ts`), which
decides what to *offer*; the services decide what is *allowed*, and an unreadable token
yields none. Gating a route is `requiresScope` in its meta. A read stays public even where
the write beside it does not — the hole page shows a spectator every score and no wheel.

## Domain invariants

These are load-bearing and easy to break by accident:

- **Blue renders left, Red renders right. Always.** Never order sides by team id, which is
  arbitrary. Use `lib/teamOrder.ts` (`orderTeams`, `orderSides`); a Cup has exactly two
  sides and the schema enforces it, so `lib/teamColor.ts` is a lookup, not an extension point.
- **Points come in halves.** A halved match is ½ a point per side; render via `lib/points.ts`.
- **A tier is a tee-box colour** (gold, blue, white) — the colour *is* the name. Don't append a noun.
- **Tee times are UTC instants**, displayed in the viewer's own zone and locale. Going the
  other way (entering one) needs the course's timezone: `eventInputToUtc` in `lib/teeTime.ts`.
- **`lib/scoringWindow.ts` reads the window off the match** (`scoring_opens_at` /
  `scoring_closes_at`), which the API both computes and enforces. It used to restate the
  rule as its own constants; that put one rule in two repos with nothing keeping them
  equal. Don't reintroduce a local copy — a bound the API omits is read as *open*, because
  permissive costs a clean 409 while strict silently offers no way to record a legitimate
  score.
- **Match margins render through `resultText`**, so "9 & 7" is the same string everywhere.
  That's why the API sends `lead` + `holes_remaining` rather than a rendered margin.

## Styling

Heading sizes come from the `h1`–`h6` scale in `src/assets/main.css`. A per-heading
`text-*` class forks that scale, so **an eslint rule rejects it** — pick the right level
instead. A responsive bump (`md:text-5xl`) is allowed, and a genuine one-off can
`eslint-disable` with a reason, which is what keeps the exception reviewable.

Colours come from the `mrc-*` tokens in the `@theme` block of `main.css`, not raw Tailwind
palette classes. The base font-size lives on `html` (14px mobile, 16px from `md`) so the
rem unit itself scales — don't move it to a wrapper.

## TypeScript

`erasableSyntaxOnly` is on: no enums, no namespaces, and **no constructor parameter
properties** — declare the fields and assign them (see `ApiClient`). `noUnusedLocals` and
`noUnusedParameters` are errors; prefix a deliberately unused arg with `_`.

## Tests

Vitest + jsdom + `@vue/test-utils`, globals enabled. `tests/` mirrors `src/`. `lib/` gets
direct unit tests; components get mounted and asserted on rendered output. Injectable
clocks and optional `locale` arguments are the test seams for time and formatting — use
them rather than mocking `Intl` or `Date`.

## Conventions

Comments explain **why**, not what — the tradeoff, the failure mode it prevents, the
alternative rejected. Look at `dev/bootstrap.sh` or `lib/scoringWindow.ts` for the house
style. Don't add narration that restates the code, and write for someone who never saw the
change: "used to" earns its place only where it warns off a path they might take again, as
`scoringWindow.ts` does with the constants it once held. Anything else about how the code
got this way is a commit message.

Prose and infra are **prettier-ignored** (`*.md`, `docker-compose.yml`) because its quote
and wrapping rules churn them and un-align hand-spaced lists. Hand-format those; run
`npm run format` on everything else. A pre-commit hook checks staged files — enable it
once per clone with `git config core.hooksPath .githooks`.

Commits are `type(scope): subject` — types `feat`/`fix`/`style`/`refactor`/`build`/`chore`,
scope `web` for the app and `dev` for the local stack. `style` is a visual change that adds
no capability: sizing, colour, spacing. Branch names take the same type as the commit. The
subject is lowercase and describes the change in the product's terms ("show how a player's
matches end", not "add stats rows"). Bodies explain the reasoning, and say what was
considered and dropped. No `Co-Authored-By` trailer and no generated-with footer, in
commits or PR descriptions — the repo squash-merges with the PR body as the message, so
anything in it lands in the log.

PR descriptions are read as commit messages, so write them as prose. A table has to beat a
sentence to earn its place.

Not committed: `.env`, `dev/keys/`, and `docs/superpowers` (design and spec docs are kept
local by choice).
