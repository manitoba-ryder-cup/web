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
| `src/stores/` | Pinia, for `auth.ts` alone. Everything the server owns lives in the query cache, including which cup is current — `useCurrentCup` reads it like any other resource |

**Data views follow one pattern:** `useAsync(key, fetcher)` for
`{ data, error, loading, retry }`, rendered through `<AsyncState>`. Pass `retry` wherever
there's something to re-run — this gets used on a phone in a field, and a dropped request
should be one tap from recovering. `useAsync`'s `intervalMs` polls live views and
deliberately keeps stale data on a failed poll rather than blanking the page. It takes a
getter, and the live views drop from twenty seconds to a five-minute heartbeat unless
`cupInPlay` says the cup is being played — that cadence is right on the two days a year it
means something and pure cost on the other 363. Not silence, though: a schedule that has
yet to be published reads as not in play, and only a request turns that empty list full.

**Cache keys name resources, not pages.** `src/api/queries.ts` is the only place a key is
written: `q.teams(id)`, `q.results(id)`, `q.matchScores(matchId)`. A view names the ones it
needs with `useResource` and merges their states with `combine`, so two views asking for the
same thing share one answer and one write invalidates it for both. `useResources` is the same
for N of one resource — every cup's teams — and keys each answer as that resource is keyed
rather than joining them under a key of its own. Keying by page is what this
replaced, and it cost two full copies of every match — the card and the entry page differed
only on whether a missing tee set was fatal, and carrying that in the key meant every write had
to reach both and kept not doing so.

**A key that depends on a prop is a getter**; an array is captured once. **Optimistic updates
go through `patch`** — `data` is a readonly view of the cache, so assigning into it is dropped
rather than refused: the write lands and the row never moves. `useAfterWrite` invalidates
everything, with no exception to keep in step; `useAfterMatchWrite` additionally refetches the
two resources a match write changes, awaited, so the page it returns to shows what was written,
and `useAfterHoleWrite` writes those two from the answer instead. That one holds back the tee
set — **a score cannot move a tee set**, so marking `q.matchHoles` stale spends a request per
hole on par and yardage that are the course's. `useAfterMatchWrite` must not: it settles the
lineup page's save, which sends `course_id` and `tee_color_id`, and the wheel would open on the
old par. An action that has settled the cache passes `settled` to `useBusy.run`, or run's own
pass asks again for what just arrived.
A resource whose id is not known yet takes `enabled` and reads as loading, not as empty.

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
for the stroke picker. The scopes are read off the access token (`lib/token.ts`), which
decides what to *offer*; the services decide what is *allowed*, and an unreadable token
yields none. Gating a route is `requiresScope` in its meta, which implies a session: an
anonymous visitor reaches login, a signed-in one without the scope reaches the dashboard.
The hole page is the exception, and not by scope: it is the wheel, and a hole that cannot
be recorded sends you to the scorecard rather than rendering the wheel with its controls
off. `holeOpen` in `lib/scoringWindow.ts` is that rule and both the card and the page use
it — stated twice, rows start offering a tap the page turns straight back. It is per hole,
not per match: a decided match still takes corrections to the holes it was played over.

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
palette classes. The base font-size lives on `html` and scales with the viewport — 12px up
to 400px wide, 16px from 560px — so the rem unit itself tracks the screen. Don't move it to
a wrapper, and don't flatten it back to one value: the phones this is read on differ by 23%
in width, and a size that suits one reads wrong on the other.

**A UI change starts with the `frontend-design` skill** and is measured in a browser before
it's called done — `getBoundingClientRect`, computed colour, focus an element and look.
None of what goes wrong here shows up in a screenshot or a class list: **tap targets are
sized for a finger**, **state never rests on colour alone**, keyboard focus stays visible,
and motion respects `prefers-reduced-motion`.

**A tap target is a physical size, not a type size.** A fingertip is 7-9mm however the page
is scaled, so a target must not shrink when the root does: **write it in px** (`min-h-[44px]`),
never in Tailwind's rem scale, where `min-h-11` reads as 44 and renders 33 on a phone.
**Anything that records a score holds the full 44px** — that tap is outdoors, one-handed,
sometimes gloved, and a miss writes a wrong score. **Nothing sits under 24px**, the WCAG 2.2
AA floor. 44 is the AAA figure and is worth its cost where a mistake writes a score, not on
chrome: the header's home link sits between the two, as low as 36px on the narrowest phone.

The app installs to home screens, and `md` is the line between the tab bar and the header's
inline nav — so a narrow browser window is a faithful preview of the installed app.

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

**The default is no comment.** Code says what it does; a comment is for why it was done
this way, and only when that reason isn't evident from reading it. Nothing else earns a
line — not a summary of the code below, not what it used to do, not a fact about how some
other part of the app behaves. That last one is the worst of them: it is true when written,
goes stale silently, and then misleads whoever came to check exactly that question. Where
something has to stay true, a test says it and fails when it stops.

One line, or two — eslint rejects a longer block, the same bargain the heading scale makes:
keep the length by saying so with an `eslint-disable-next-line` that names the reason, which
is what puts the exception in front of a reviewer. Needing a paragraph usually means the code
under it is what wants changing. Anything about how the code got this way is a commit
message.

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
