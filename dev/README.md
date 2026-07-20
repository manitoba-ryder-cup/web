# Local development stack

Brings up the backing services the frontend develops against — **heimdall** (auth) and
**scorecard** (API) — plus a shared Postgres, all built from the sibling source repos
(`../../travisbale/heimdall`, `../scorecard`). The frontend itself runs on the host
(`npm run dev`) and proxies `/api/auth` → heimdall and `/api/scorecard` → scorecard, so
everything is a single origin (no CORS).

## Prerequisites
Docker, and the sibling repos checked out at:
```
github/
  travisbale/heimdall
  manitoba-ryder-cup/scorecard
  manitoba-ryder-cup/web        <- you are here (or a worktree of it)
```

## Usage
```sh
./dev/generate-keys.sh        # once: dev RSA keypair (heimdall signs, scorecard validates)
docker compose up -d --build  # build + start postgres, heimdall, scorecard
./dev/seed.sh                 # once: register scorecard scopes + create the dev user
```

Then:
- heimdall  → http://localhost:8080
- scorecard → http://localhost:5000
- postgres  → localhost:5442 (user `superuser` / `superuser`)
- dev login → `dev@manitobarydercup.com` / `DevPassword123!`

```sh
docker compose down       # stop (keeps data)
docker compose down -v    # stop + wipe the database volume
```

## How auth is wired
- One RSA keypair (`dev/keys/`, gitignored): heimdall signs with the private key,
  scorecard validates with the public key. Audience is a shared knowhere constant, so
  no issuer/audience config is needed.
- `seed.sh` inserts scorecard's four scopes as heimdall **permissions**
  (`scorecard:tournaments:write`, `:players:write`, `:scores:write`, `:courses:write`),
  then registers the dev user — who, as a bootstrapped tenant admin, is granted all
  permissions, so their access token carries the scorecard scopes.

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
