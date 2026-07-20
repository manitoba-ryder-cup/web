#!/usr/bin/env bash
# Generates the dev RSA keypair that heimdall signs tokens with and scorecard
# validates them against. Run once before `docker compose up`. Keys are gitignored.
set -euo pipefail
cd "$(dirname "$0")"

if [ -f keys/private-key.pem ]; then
  echo "keys already exist — skipping"
  exit 0
fi

mkdir -p keys
openssl genrsa -out keys/private-key.pem 2048 2>/dev/null
openssl rsa -in keys/private-key.pem -pubout -out keys/public-key.pem 2>/dev/null
chmod 644 keys/*.pem
echo "generated keys/private-key.pem + keys/public-key.pem"
