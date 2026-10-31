#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-31  Opus 5.5   prompted by TaeHyun79
# 2026-11-01  Opus 5.5   prompted by TaeHyun79
################################################################################

# Logs the shuttle's vehicles on the Dev Server for `pnpm shuttle:derive` (infra/deploy/README.md, "The shuttle log").
# It only reads Dev Redis, and it runs from a copy outside the checkout, under snu-now-shuttle-log.service.
set -euo pipefail

CHECKOUT=/srv/team/snu-now
ENV_FILE=/srv/team/snu-now-secrets/snu-now.env
LOG_DIR=/srv/team/shuttle-log

KEY=shuttle:vehicles
POLL_SECONDS=5
# With the poll, under the 15 s between sets: a slower read would no longer see a new set as a jump.
READ_TIMEOUT_SECONDS=8
# The main server stores each set with this lifetime.
LIFETIME_MS=60000
# One atomic read, so that the lifetime is that of the set read with it.
READ_SCRIPT="return {redis.call('PTTL', KEYS[1]), redis.call('GET', KEYS[1])}"

# Korean time, spelled so that `date` needs no time zone data on the server.
export TZ=KST-9

STOPS=$(jq --compact-output '[.stops[].name]' "$CHECKOUT/main-server/seed/shuttle-stops.json")

last_lifetime=0

# Demo vehicles can appear at night and at weekends.
is_service_time() {
  local weekday hour
  weekday=$(date +%u)
  hour=$(date +%H)
  ((weekday <= 5 && 10#$hour >= 8 && 10#$hour < 21))
}

read_redis() {
  timeout "$READ_TIMEOUT_SECONDS" \
    docker compose --env-file "$ENV_FILE" --file "$CHECKOUT/compose.yaml" --file "$CHECKOUT/compose.deploy.yaml" \
    exec -T redis redis-cli --raw EVAL "$READ_SCRIPT" 1 "$KEY"
}

# Appends a set to the day's CSV and set log. An empty set carries no time of its own.
record() {
  local vehicles=$1 empty_set_ms=$2 received_at stamp csv set_log
  received_at=$(jq --raw-output '.[0].receivedAt // empty' <<<"$vehicles")
  if [[ -n $received_at ]]; then
    stamp=$(date --date="$received_at" +%FT%T%:z)
  else
    stamp=$(date --date="@$((empty_set_ms / 1000))" +%FT%T%:z)
  fi
  csv=$LOG_DIR/${stamp%%T*}.csv
  set_log=$LOG_DIR/${stamp%%T*}.sets.csv
  [[ -e $csv ]] || echo 'received_at,car_id,stop_id,stop_name,loop_order' >"$csv"
  [[ -e $set_log ]] || echo 'received_at,cars' >"$set_log"
  jq --raw-output --arg stamp "$stamp" --argjson stops "$STOPS" \
    '.[] | .stop.name as $name | [$stamp, .carId, .stop.id, $name, ($stops | index($name))] | join(",")' \
    <<<"$vehicles" >>"$csv"
  echo "$stamp,$(jq length <<<"$vehicles")" >>"$set_log"
}

# A new set is a lifetime that jumped back: without one, it only falls. A missing key is an outage, which logs nothing.
# After a failed read any set counts as new, since R2 drops a repeated one.
read_once() {
  local read_ms answer lifetime
  read_ms=$(date +%s%3N)
  if ! answer=$(read_redis); then
    echo 'Could not read Dev Redis' >&2
    last_lifetime=0
    return 0
  fi
  lifetime=${answer%%$'\n'*}
  if [[ ! $lifetime =~ ^[0-9]+$ ]]; then
    last_lifetime=0
    return 0
  fi
  if ((lifetime > last_lifetime)); then
    record "${answer#*$'\n'}" "$((read_ms - LIFETIME_MS + lifetime))"
  fi
  last_lifetime=$lifetime
}

# One read at any hour, written to a scratch folder and printed, so that a fault shows before the first service hour.
# With the key missing, as it can be outside them, a sample set stands in.
check() {
  local answer lifetime vehicles
  answer=$(read_redis)
  lifetime=${answer%%$'\n'*}
  echo "Dev Redis answered, lifetime $lifetime ms"
  if [[ $lifetime =~ ^[0-9]+$ ]]; then
    vehicles=${answer#*$'\n'}
  else
    vehicles=$(jq --null-input --compact-output --argjson stops "$STOPS" --arg at "$(date +%FT%T%:z)" \
      '[{carId: "check", stop: {id: "check", name: $stops[0]}, receivedAt: $at}]')
  fi
  LOG_DIR=$(mktemp --directory)
  record "$vehicles" "$(date +%s%3N)"
  tail --lines=+1 "$LOG_DIR"/*
  rm -r "$LOG_DIR"
}

if [[ ${1:-} == --check ]]; then
  check
  exit
fi

while true; do
  if is_service_time; then
    read_once
  fi
  sleep "$POLL_SECONDS"
done
