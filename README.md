# web-vue3

Manitoba Ryder Cup frontend. Vue 3 (`<script setup>`) + Vite + TypeScript + Pinia +
Tailwind CSS.

The repo also holds `worker/`, the Cloudflare Worker that puts the API on the same origin as
the site in production — the SPA calls `/api/auth/*` and `/api/scorecard/*` relative, and the
Worker forwards them to the Cloud Run services with the shared proxy secret attached. In dev
Vite's proxy stands in for it. See [worker/README.md](worker/README.md); it deploys on its own
and is not part of `npm run build`.

## Local dev

Bring up the backing services (heimdall + scorecard + Postgres), then run the frontend
on the host so it can hot-reload. Node 22 (see `.nvmrc`) and Docker are the only
prerequisites:

```sh
./dev/generate-keys.sh   # once: dev RSA keypair (heimdall signs, scorecard validates)
./dev/bootstrap.sh       # brings the stack up and creates the dev user
npm ci
npm run dev              # starts on http://localhost:5173
```

Keys first — heimdall mounts them at startup. `bootstrap.sh` then starts the services in
the order they actually depend on each other, because the tenant that scorecard serves
anonymous reads from doesn't exist until heimdall mints it along with the first user. It
writes that tenant id to `.env`, which every later `docker compose` command needs.

Vite proxies `/api/auth` → heimdall and `/api/scorecard` → scorecard, so the app,
auth, and API all appear to come from a single origin (no CORS, and cookies work).

Dev login: `dev@manitobarydercup.com` / `DevPassword123!`

See [dev/README.md](dev/README.md) for details on the backend stack (prerequisites,
how the RSA keypair and scopes are wired up, loading golf data, resetting the database,
etc).

## Commands

```sh
npm run dev           # start the Vite dev server (:5173)
npm run build         # type-check (vue-tsc -b) + production build
npm run preview       # preview the production build locally
npm run test          # run the test suite in watch mode
npm run test:run      # run the test suite once
npm run lint          # eslint
npm run typecheck     # vue-tsc over src and tests
npm run format        # prettier, write
npm run format:check  # prettier, check only (what CI gates on)
```

CI runs format, lint, typecheck, test and build on every push and pull request, plus a
separate job type-checking `worker/`, which has its own `package.json` and tsconfig.

## Git hooks

A pre-commit hook rejects unformatted staged files, so formatting is caught here rather
than in CI. Hooks are not cloned, so enable them once per checkout:

```sh
git config core.hooksPath .githooks
```
