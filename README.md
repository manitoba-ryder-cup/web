# web-vue3

Manitoba Ryder Cup frontend. Vue 3 (`<script setup>`) + Vite + TypeScript + Pinia +
Tailwind CSS.

## Local dev

Bring up the backing services (heimdall + scorecard + Postgres), then run the frontend
on the host so it can hot-reload:

```sh
docker compose up -d               # postgres, heimdall, scorecard
./dev/generate-keys.sh             # once: dev RSA keypair (heimdall signs, scorecard validates)
./dev/seed.sh                      # once: register scorecard scopes + create the dev user
npm run dev                        # starts on http://localhost:5173
```

Vite proxies `/api/auth` → heimdall and `/api/scorecard` → scorecard, so the app,
auth, and API all appear to come from a single origin (no CORS, and cookies work).

Dev login: `dev@manitobarydercup.com` / `DevPassword123!`

See [dev/README.md](dev/README.md) for details on the backend stack (prerequisites,
how the RSA keypair and scopes are wired up, resetting the database, etc).

## Commands

```sh
npm run dev        # start the Vite dev server (:5173)
npm run build      # type-check (vue-tsc -b) + production build
npm run preview    # preview the production build locally
npx vitest run      # run the test suite
```
