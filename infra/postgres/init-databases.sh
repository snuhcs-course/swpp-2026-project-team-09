#!/bin/bash
# Runs once, when the data volume is empty. Creates one database and one role for each server that keeps data.
# A role owns only its own database and cannot connect to the other one.
# CREATEDB lets Prisma create its temporary shadow database while it records a migration.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v main_password="$MAIN_DB_PASSWORD" \
  -v match_password="$MATCH_DB_PASSWORD" <<'SQL'
CREATE ROLE main LOGIN CREATEDB PASSWORD :'main_password';
CREATE DATABASE main OWNER main;
REVOKE ALL ON DATABASE main FROM PUBLIC;

CREATE ROLE match LOGIN CREATEDB PASSWORD :'match_password';
CREATE DATABASE match OWNER match;
REVOKE ALL ON DATABASE match FROM PUBLIC;
SQL
