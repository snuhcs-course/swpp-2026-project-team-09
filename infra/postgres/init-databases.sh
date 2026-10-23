#!/bin/bash
################################################################################
# AI-generated with Claude
#
# 2026-09-28  Opus 5.5   prompted by TaeHyun79
# 2026-10-23  Opus 5.5   prompted by AhnJinYoung
################################################################################

# Runs once, when the data volume is empty. Creates the main server's database and its role, which owns only that
# database.
# CREATEDB lets Prisma create its temporary shadow database while it records a migration.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v main_password="$MAIN_DB_PASSWORD" <<'SQL'
CREATE ROLE main LOGIN CREATEDB PASSWORD :'main_password';
CREATE DATABASE main OWNER main;
REVOKE ALL ON DATABASE main FROM PUBLIC;
SQL
