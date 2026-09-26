#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v main_password="$DB_MAIN_PASSWORD" -v match_password="$DB_MATCH_PASSWORD" <<'SQL'
CREATE ROLE main_app LOGIN PASSWORD :'main_password';
CREATE ROLE match_app LOGIN PASSWORD :'match_password';
CREATE DATABASE main_db OWNER main_app;
CREATE DATABASE match_db OWNER match_app;
REVOKE CONNECT ON DATABASE main_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE match_db FROM PUBLIC;
GRANT CONNECT ON DATABASE main_db TO main_app;
GRANT CONNECT ON DATABASE match_db TO match_app;
\connect main_db
CREATE EXTENSION IF NOT EXISTS postgis;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO main_app;
\connect match_db
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO match_app;
SQL
