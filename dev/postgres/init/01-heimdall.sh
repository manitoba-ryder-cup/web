#!/bin/bash
# Creates the heimdall database + its non-superuser app role (RLS requires a
# non-superuser; superusers bypass row-level security).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    CREATE DATABASE heimdall;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname heimdall <<-EOSQL
    CREATE USER heimdall WITH PASSWORD 'heimdall';
    GRANT CONNECT ON DATABASE heimdall TO heimdall;
    GRANT USAGE, CREATE ON SCHEMA public TO heimdall;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO heimdall;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO heimdall;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO heimdall;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO heimdall;
EOSQL

echo "heimdall database + role created"
