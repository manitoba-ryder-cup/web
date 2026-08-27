#!/usr/bin/env bash
# Brings the local stack up from nothing, in the order the pieces actually depend on
# each other, and leaves you logged-in-able.
#
# The ordering is the whole point. A tenant does not exist until heimdall creates one,
# and heimdall only creates one as a side effect of the first registration — there is no
# tenant API. Scorecard needs that tenant id at startup (SCORECARD_PUBLIC_TENANT_ID is
# what anonymous reads resolve to), so it cannot start until heimdall has a user. Hence:
# postgres + heimdall, register, read the tenant back, then scorecard.
#
# Nothing here invents a tenant id. An earlier setup hardcoded one on both sides and they
# agreed only because the environment was never rebuilt; the moment heimdall's data was
# recreated they diverged and the site served an empty tenant while looking healthy.
#
# Note that compose commands (down, logs, ps) need .env to exist, since the tenant is a
# required variable. This script writes it; before the first run, prefix them with
# SCORECARD_PUBLIC_TENANT_ID=x. It is deliberately not defaulted — a wrong or absent
# tenant serves an empty site that looks perfectly healthy, which is how it hid before.
#
# Production runs this same sequence with different hosts. The one part that will not
# survive the trip is reading the verification token out of heimdall's log: that works
# because with no mailer configured heimdall falls back to the console provider, which
# logs the email instead of sending it. Configure a real mailer and the token goes to an
# inbox instead — at which point bootstrap wants a `heimdall bootstrap-tenant` CLI that
# creates the tenant, user and password directly, rather than this script.
set -euo pipefail

cd "$(dirname "$0")/.."

HEIMDALL="${HEIMDALL_URL:-http://localhost:8080}"
PG="${PG_CONTAINER:-mrc-dev-postgres}"
HEIMDALL_CONTAINER="${HEIMDALL_CONTAINER:-mrc-dev-heimdall}"
EMAIL="${DEV_EMAIL:-dev@manitobarydercup.com}"
PASS="${DEV_PASSWORD:-DevPassword123!}"
SCORER_EMAIL="${DEV_SCORER_EMAIL:-scorer@manitobarydercup.com}"
SCORER_PASS="${DEV_SCORER_PASSWORD:-ScorerPassword123!}"
ENV_FILE=".env"

sql() { docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U superuser -d heimdall "$@"; }

# --- phase 1: the services a tenant can be created in ----------------------------------
# compose interpolates every service's environment whatever you ask it to start, and
# scorecard's tenant is required — so phase 1 supplies a throwaway value. Nothing reads
# it: scorecard is not started until phase 4, by which point .env holds the real one.
echo "==> Starting postgres and heimdall..."
SCORECARD_PUBLIC_TENANT_ID=bootstrapping docker compose up -d postgres heimdall

echo "==> Waiting for heimdall..."
until curl -sfI "$HEIMDALL/health" >/dev/null 2>&1; do sleep 1; done  # /health is HEAD-only

# Scopes must exist BEFORE registering: the bootstrapped admin role is granted every
# permission that exists at the moment it is created.
echo "==> Registering scorecard scopes as heimdall permissions..."
sql >/dev/null <<'SQL'
INSERT INTO permissions (name, description) VALUES
  ('scorecard:tournaments:write', 'Manage tournaments, teams, rosters, matches, participants'),
  ('scorecard:players:write',     'Create players'),
  ('scorecard:scores:write',      'Submit match scores'),
  ('scorecard:courses:write',     'Manage courses, tee colors, tee sets')
ON CONFLICT (name) DO NOTHING;
SQL

# --- phase 2: the admin user, and the tenant that comes with them ----------------------
echo "==> Registering $EMAIL..."
curl -sf -X POST "$HEIMDALL/v1/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"first_name\":\"Dev\",\"last_name\":\"User\"}" >/dev/null \
  || echo "    (register non-2xx — the user already exists)"

# heimdall stores sha256(token), so the row is useless for verifying: posting it back
# gets "Invalid or expired verification token". The plaintext exists only in the email,
# which the console provider writes to the log instead of sending.
PENDING=$(sql -tAc \
  "SELECT count(*) FROM verification_tokens vt JOIN users u ON u.id = vt.user_id WHERE u.email = '$EMAIL'" \
  | tr -d '[:space:]')

if [ "$PENDING" = "0" ]; then
  echo "    Already verified."
else
  TOKEN=$(docker logs "$HEIMDALL_CONTAINER" 2>&1 | grep email-verification | grep -F "$EMAIL" \
    | tail -1 | grep -o 'token=[A-Za-z0-9_-]*' | cut -d= -f2)
  if [ -z "$TOKEN" ]; then
    echo "ERROR: a verification is pending but no token is in heimdall's log." >&2
    echo "       Either the log has rotated, or a mailer is configured and the token was" >&2
    echo "       emailed instead. Delete the user and re-run, or verify by hand." >&2
    exit 1
  fi
  echo "==> Verifying and setting the password..."
  curl -sf -X POST "$HEIMDALL/v1/verify-email" -H 'Content-Type: application/json' \
    -d "{\"token\":\"$TOKEN\",\"password\":\"$PASS\"}" >/dev/null
fi

# --- phase 3: read the tenant back, from the token rather than the database ------------
# The access token carries tenant_id, so this is heimdall's own answer rather than an
# inference from its schema.
echo "==> Reading the tenant id..."
ACCESS_TOKEN=$(curl -sf -X POST "$HEIMDALL/v1/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

TENANT_ID=$(printf '%s' "$ACCESS_TOKEN" | cut -d. -f2 | python3 -c '
import sys, base64, json
p = sys.stdin.read().strip(); p += "=" * (-len(p) % 4)
print(json.loads(base64.urlsafe_b64decode(p))["tenant_id"])')

if [ -z "$TENANT_ID" ]; then
  echo "ERROR: no tenant_id in the access token." >&2
  exit 1
fi
echo "    tenant $TENANT_ID"

# docker compose reads .env from the project directory, so writing it here is enough for
# the scorecard service to pick it up on the next up.
if grep -q '^SCORECARD_PUBLIC_TENANT_ID=' "$ENV_FILE" 2>/dev/null; then
  sed -i "s|^SCORECARD_PUBLIC_TENANT_ID=.*|SCORECARD_PUBLIC_TENANT_ID=$TENANT_ID|" "$ENV_FILE"
else
  echo "SCORECARD_PUBLIC_TENANT_ID=$TENANT_ID" >> "$ENV_FILE"
fi

# --- phase 3b: an account that only scores --------------------------------------------
# The admin holds every permission, so it is the one account that cannot show what a scorer
# sees. On the course nobody signs in as an administrator, and the two differ in what the UI
# offers: the admin area, and Reset Match.
#
# Registration is the only way to create a user, and it bootstraps a tenant of its own — an
# account in the wrong tenant reads as a site with no golf in it. So the user is registered
# for a real password hash, then moved, and the tenant that came with them is dropped.
echo "==> Creating the scorer account..."
if sql -t -A -c "SELECT 1 FROM users WHERE email = '$SCORER_EMAIL'" | grep -q 1; then
  echo "    (already exists)"
else
  curl -sf -X POST "$HEIMDALL/v1/register" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$SCORER_EMAIL\",\"first_name\":\"Course\",\"last_name\":\"Scorer\"}" >/dev/null

  SCORER_TOKEN=$(docker logs "$HEIMDALL_CONTAINER" 2>&1 | grep email-verification | grep -F "$SCORER_EMAIL" \
    | tail -1 | grep -oE '[A-Za-z0-9_-]{40,}' | tail -1)
  if [ -z "$SCORER_TOKEN" ]; then
    echo "ERROR: no verification token in the log for $SCORER_EMAIL." >&2
    exit 1
  fi

  curl -sf -X POST "$HEIMDALL/v1/verify-email" -H 'Content-Type: application/json' \
    -d "{\"token\":\"$SCORER_TOKEN\",\"password\":\"$SCORER_PASS\"}" >/dev/null

  # Reused if it is already there. Re-creating it answers 500, not a conflict, so a rerun
  # after a half-finished one would fail here with nothing saying why.
  ROLE_ID=$(curl -sf "$HEIMDALL/v1/roles" -H "Authorization: Bearer $ACCESS_TOKEN" \
    | python3 -c 'import json,sys; print(next((r["id"] for r in json.load(sys.stdin)["roles"] if r["name"] == "Scorer"), ""))')
  if [ -z "$ROLE_ID" ]; then
    ROLE_ID=$(curl -sf -X POST "$HEIMDALL/v1/roles" -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"name":"Scorer","description":"Enters hole scores on the course. No admin area, no match reset."}' \
      | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
  fi
  if [ -z "$ROLE_ID" ]; then
    echo "ERROR: could not create or find the Scorer role." >&2
    exit 1
  fi

  PERM_ID=$(sql -t -A -c "SELECT id FROM permissions WHERE name = 'scorecard:scores:write'")
  curl -sf -X PUT "$HEIMDALL/v1/roles/$ROLE_ID/permissions" -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H 'Content-Type: application/json' -d "{\"permission_ids\":[\"$PERM_ID\"]}" >/dev/null

  # Read as a literal before anything moves. Every one of these deletes is scoped by it, and
  # a subquery over users.tenant_id would name the shared tenant the moment the move lands.
  OLD_TENANT=$(sql -t -A -c "SELECT tenant_id FROM users WHERE email = '$SCORER_EMAIL'")
  if [ -z "$OLD_TENANT" ] || [ "$OLD_TENANT" = "$TENANT_ID" ]; then
    echo "ERROR: refusing to clean up tenant '$OLD_TENANT' for $SCORER_EMAIL." >&2
    exit 1
  fi

  # The move comes first: tenants has the user as a dependant, so it cannot be dropped while
  # they are still in it. The admin role registration granted them goes with it.
  sql >/dev/null <<SQL
BEGIN;
DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = '$SCORER_EMAIL');
UPDATE users SET tenant_id = '$TENANT_ID' WHERE email = '$SCORER_EMAIL';
DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE tenant_id = '$OLD_TENANT');
DELETE FROM roles WHERE tenant_id = '$OLD_TENANT';
DELETE FROM tenants WHERE id = '$OLD_TENANT';
COMMIT;
SQL

  SCORER_ID=$(sql -t -A -c "SELECT id FROM users WHERE email = '$SCORER_EMAIL'")
  curl -sf -X PUT "$HEIMDALL/v1/users/$SCORER_ID/roles" -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H 'Content-Type: application/json' -d "{\"role_ids\":[\"$ROLE_ID\"]}" >/dev/null
fi

# --- phase 4: scorecard, now that there is a tenant for it to serve --------------------
echo "==> Starting scorecard..."
docker compose up -d scorecard
until curl -sf http://localhost:5000/health >/dev/null 2>&1; do sleep 1; done

cat <<EOF

Stack ready.
  heimdall   $HEIMDALL
  scorecard  http://localhost:5000
  login      $EMAIL / $PASS
  scorer     $SCORER_EMAIL / $SCORER_PASS  (scores only — no admin area, no reset)
  tenant     $TENANT_ID  (written to $ENV_FILE)

The database has no golf data yet. Load it with the same tenant:

  ~/mrc-migration/venv/bin/python ~/mrc-migration/migrate_legacy.py --tenant-id $TENANT_ID
  docker compose exec -T scorecard ./scorecard seed-tournament --tenant-id $TENANT_ID \\
    < ~/mrc-tournaments/2026-manitoba-ryder-cup.json
EOF
