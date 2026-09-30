# PostgreSQL 18 with PostGIS 3, built on the official image so it runs natively on Apple Silicon.
FROM postgres:18

# PostGIS is marked trusted so that a database owner, not only a superuser, can enable it.
# The main server's first migration enables it under the main role. The match database does not use it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends "postgresql-$PG_MAJOR-postgis-3" \
  && rm -rf /var/lib/apt/lists/* \
  && echo "trusted = true" >> "/usr/share/postgresql/$PG_MAJOR/extension/postgis.control"

COPY init-databases.sh /docker-entrypoint-initdb.d/
