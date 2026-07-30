# Local development stack

Brings up the backing services the frontend develops against — **heimdall** (auth) and
**scorecard** (API) — plus a shared Postgres, all built from the sibling source repos
(`../../travisbale/heimdall`, `../scorecard`). The frontend itself runs on the host
(`npm run dev`) and proxies `/api/auth` → heimdall and `/api/scorecard` → scorecard, so
everything is a single origin (no CORS).

## Prerequisites
Docker, `python3`, `openssl` and `curl` (the scripts use them), and the sibling repos
checked out at:
```
github/
  travisbale/heimdall
  manitoba-ryder-cup/scorecard
  manitoba-ryder-cup/web        <- you are here (or a worktree of it)
```

## Usage
```sh
./dev/generate-keys.sh   # once: dev RSA keypair (heimdall signs, scorecard validates)
./dev/bootstrap.sh       # start the stack, create the dev user, write .env
```

Keys have to exist first, since heimdall mounts them at startup. `bootstrap.sh` is
idempotent — re-running it on an already-provisioned stack just brings the services back
up — and it does the rest in dependency order: postgres + heimdall, register the admin
user, read the tenant heimdall minted for them, then scorecard.

Then:
- heimdall  → http://localhost:8080
- scorecard → http://localhost:5000
- postgres  → localhost:5442 (user `superuser` / `superuser`)
- dev login → `dev@manitobarydercup.com` / `DevPassword123!`

```sh
docker compose down           # stop (keeps data)
docker compose down -v        # stop + wipe the database volume
docker compose up -d --build  # rebuild the services from the sibling repos
```

## The tenant, and .env
`bootstrap.sh` writes `SCORECARD_PUBLIC_TENANT_ID` to `.env` (gitignored). Scorecard
resolves anonymous reads to that tenant — the dashboard, leaderboard and players pages
all read without a token — and compose treats it as required rather than defaulting it,
because a wrong tenant serves an empty site that looks perfectly healthy. Two
consequences:

- Every `docker compose` command needs `.env` to exist. Before the first bootstrap run,
  prefix them with `SCORECARD_PUBLIC_TENANT_ID=x`.
- `docker compose down -v` destroys the tenant along with the database, leaving `.env`
  pointing at one that no longer exists. Re-run `./dev/bootstrap.sh` after wiping.

## Loading golf data
A freshly bootstrapped stack has accounts but no golf data. Load it against the tenant in
`.env`:

```sh
TENANT_ID=$(grep SCORECARD_PUBLIC_TENANT_ID .env | cut -d= -f2)

~/mrc-migration/venv/bin/python ~/mrc-migration/migrate_legacy.py --tenant-id "$TENANT_ID"
docker compose exec -T scorecard ./scorecard seed-tournament --tenant-id "$TENANT_ID" \
  < ~/mrc-tournaments/2026-manitoba-ryder-cup.json
```

## How auth is wired
- One RSA keypair (`dev/keys/`, gitignored): heimdall signs with the private key,
  scorecard validates with the public key. Audience is a shared knowhere constant, so
  no issuer/audience config is needed.
- `bootstrap.sh` inserts scorecard's four scopes as heimdall **permissions**
  (`scorecard:tournaments:write`, `:players:write`, `:scores:write`, `:courses:write`)
  *before* registering the dev user — who, as a bootstrapped tenant admin, is granted
  every permission that exists at that moment, so their access token carries the
  scorecard scopes. Registering first would mint an admin with none of them.
- Registration is also what creates the tenant; heimdall has no tenant API. Bootstrap
  logs in and decodes `tenant_id` out of the access token, so the id is heimdall's own
  answer rather than an inference from its schema.

Verify the whole chain:
```sh
TOKEN=$(curl -s -X POST http://localhost:8080/v1/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@manitobarydercup.com","password":"DevPassword123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -s -X POST http://localhost:5000/v1/tournaments \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Dev Cup","start_date":"2026-08-01","end_date":"2026-08-03","location":"Winnipeg"}'
```
