#!/usr/bin/env bash
# Seeds the local dev stack: registers scorecard's scopes as heimdall permissions and
# creates a verified dev user (who, as a bootstrapped tenant admin, is granted all
# permissions — including the scorecard scopes). Run once after `docker compose up`.
set -euo pipefail

HEIMDALL="${HEIMDALL_URL:-http://localhost:8080}"
PG="mrc-dev-postgres"
EMAIL="${DEV_EMAIL:-dev@manitobarydercup.com}"
PASS="${DEV_PASSWORD:-DevPassword123!}"

sql() { docker exec -i "$PG" psql -v ON_ERROR_STOP=1 -U superuser -d heimdall "$@"; }

echo "Waiting for heimdall to be ready..."
until curl -sfI "$HEIMDALL/healthz" >/dev/null 2>&1; do sleep 1; done  # heimdall's /healthz is HEAD-only

# Scopes must exist BEFORE registering, so the bootstrapped admin role picks them up.
echo "Registering scorecard scopes as heimdall permissions..."
sql >/dev/null <<'SQL'
INSERT INTO permissions (name, description) VALUES
  ('scorecard:tournaments:write', 'Manage tournaments, teams, rosters, matches, participants'),
  ('scorecard:players:write',     'Create players'),
  ('scorecard:scores:write',      'Submit match scores'),
  ('scorecard:courses:write',     'Manage courses, tee colors, tee sets')
ON CONFLICT (name) DO NOTHING;
SQL

echo "Registering dev user $EMAIL..."
curl -sf -X POST "$HEIMDALL/v1/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"first_name\":\"Dev\",\"last_name\":\"User\"}" >/dev/null \
  || echo "  (register non-2xx — user may already exist)"

TOKEN=$(sql -tAc \
  "SELECT vt.token FROM verification_tokens vt JOIN users u ON u.id = vt.user_id WHERE u.email = '$EMAIL'" \
  | tr -d '[:space:]')

if [ -n "$TOKEN" ]; then
  echo "Verifying email and setting password..."
  curl -sf -X POST "$HEIMDALL/v1/verify-email" -H 'Content-Type: application/json' \
    -d "{\"token\":\"$TOKEN\",\"password\":\"$PASS\"}" >/dev/null
  echo "Dev user verified."
else
  echo "No pending verification token — user is already verified."
fi

cat <<EOF

Local dev stack ready:
  heimdall   http://localhost:8080
  scorecard  http://localhost:5000
  dev login  $EMAIL / $PASS

    curl -s -X POST http://localhost:8080/v1/login \\
      -H 'Content-Type: application/json' \\
      -d '{"email":"$EMAIL","password":"$PASS"}'
EOF
