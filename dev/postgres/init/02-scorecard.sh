#!/bin/bash
# Creates the scorecard database + its non-superuser app role. The role runs
# migrations on startup, so it needs CREATE on the schema; it owns the tables it
# creates and thus has DML on them.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    CREATE DATABASE scorecard;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname scorecard <<-EOSQL
    CREATE USER scorecard WITH PASSWORD 'scorecard_password';
    GRANT CONNECT ON DATABASE scorecard TO scorecard;
    GRANT USAGE, CREATE ON SCHEMA public TO scorecard;
EOSQL

echo "scorecard database + role created"
