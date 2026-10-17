#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-17  Opus 5.5   prompted by TaeHyun79
################################################################################

# One run of the Dev Server's deployment, started by snu-now-deploy.timer: brings the stack up to the tip of
# development once its server checks have passed, and writes status.json, which the proxy serves at /deploy-status.
# The functions under Deciding take plain inputs and print a verdict. Those under Doing act, calling git, docker and
# curl through $GIT, $DOCKER and $CURL so that the tests replace them.

readonly TRACKED_REF=development
readonly REPOSITORY=snuhcs-course/swpp-2026-project-team-09
readonly REQUIRED_CHECKS='main-server socket-server worker-server match-server flow-tests'
readonly MAX_ATTEMPTS=3
readonly KEPT_DUMPS=7
readonly COMPOSE_PROJECT=snu-now
readonly PROXY=http://127.0.0.1

DEPLOY_CHECKOUT=${DEPLOY_CHECKOUT:-/srv/team/snu-now}
DEPLOY_ENV_FILE=${DEPLOY_ENV_FILE:-/srv/team/snu-now-secrets/snu-now.env}
DEPLOY_STATUS_DIR=${DEPLOY_STATUS_DIR:-/srv/team/snu-now-status}
DEPLOY_BACKUP_DIR=${DEPLOY_BACKUP_DIR:-/srv/team/snu-now-backups}
GIT=${GIT:-git}
DOCKER=${DOCKER:-docker}
CURL=${CURL:-curl}

# --- Deciding -------------------------------------------------------------------------------------------------------

# Prints what a run does with the tip, given the tip, the deployed commit, the previous run's candidate, result and
# attempt, and whether a person started the run (yes or no): up-to-date, ci-failed or held to stop there, gate to ask
# GitHub about the tip's checks, or `retry N` to build the tip again as attempt N.
plan_run() {
  local tip=$1 deployed=$2 candidate=$3 result=$4 attempt=$5 by_hand=$6
  if [[ "$tip" == "$deployed" ]]; then
    echo up-to-date
  elif [[ "$by_hand" == yes || "$tip" != "$candidate" ]]; then
    echo gate
  else
    case $result in
      ci-failed | held) echo "$result" ;;
      build-failed | unhealthy)
        if ((attempt >= MAX_ATTEMPTS)); then echo held; else echo "retry $((attempt + 1))"; fi
        ;;
      *) echo gate ;;
    esac
  fi
}

# Prints each value of a JSON document read from stdin as `path<TAB>value`, the path's parts joined by dots, so that
# the script reads GitHub's answer and its own status file without jq, which the server does not have.
json_flatten() {
  { LC_ALL=C grep -oE '"([^"\\]|\\.)*"|[][{}:,]|-?[0-9][0-9.eE+-]*|true|false|null' || true; } | awk '
    function emit(value,   path, i) {
      for (i = 1; i <= depth; i++) path = path (i > 1 ? "." : "") key[i]
      print path "\t" value
    }
    $0 == "{" { depth++; in_array[depth] = 0; want_key = 1; next }
    $0 == "[" { depth++; in_array[depth] = 1; key[depth] = 0; want_key = 0; next }
    $0 == "}" || $0 == "]" { depth--; want_key = 0; next }
    $0 == ":" { next }
    $0 == "," { if (in_array[depth]) key[depth]++; else want_key = 1; next }
    {
      value = $0
      if (value ~ /^"/) value = substr(value, 2, length(value) - 2)
      if (want_key) { key[depth] = value; want_key = 0 } else emit(value)
    }'
}

# Prints the value at a path of json_flatten's output on stdin, or nothing when it is absent or null.
json_value() {
  awk -F '\t' -v path="$1" '$1 == path && $2 != "null" { print $2 }'
}

# Prints one line per element of the array at a path of json_flatten's output on stdin: the named fields of the
# element, tab-separated, or the element itself when no field is named.
json_array() {
  awk -F '\t' -v path="$1" -v names="${*:2}" '
    BEGIN { fields = split(names, field, " ") }
    index($1, path ".") == 1 {
      rest = substr($1, length(path) + 2)
      element = rest; sub(/\..*/, "", element)
      name = (rest ~ /\./) ? substr(rest, length(element) + 2) : ""
      if (!(element in seen)) { seen[element] = 1; order[++count] = element }
      value[element, name] = $2
    }
    END {
      for (c = 1; c <= count; c++) {
        line = ""
        if (fields == 0) line = value[order[c], ""]
        for (f = 1; f <= fields; f++) line = line (f > 1 ? "\t" : "") value[order[c], field[f]]
        print line
      }
    }'
}

# Prints `name<TAB>status<TAB>conclusion` for each check run of GitHub's check-runs answer on stdin.
check_runs_from_json() {
  json_flatten | json_array check_runs name status conclusion
}

# Prints `name<TAB>outcome` for each required check, given the check runs as check_runs_from_json prints them.
# A commit pushed to several branches has a run of each check per push; one success among them is enough. A run
# cancelled by a newer push (ci.yml's concurrency) may still be run again, so it is waited for, not failed.
summarize_checks() {
  awk -F '\t' -v required="$REQUIRED_CHECKS" '
    BEGIN { count = split(required, name, " ") }
    $3 == "success" { success[$1] = 1 }
    $2 != "completed" && !($1 in unsettled) { unsettled[$1] = $2 }
    $3 ~ /^(cancelled|stale|action_required)$/ && !($1 in unsettled) { unsettled[$1] = $3 }
    $2 == "completed" && $3 != "success" && !($1 in failed) { failed[$1] = $3 }
    END {
      for (i = 1; i <= count; i++) {
        n = name[i]
        if (n in success) outcome = "success"
        else if (n in unsettled) outcome = unsettled[n]
        else if (n in failed) outcome = failed[n]
        else outcome = "missing"
        print n "\t" outcome
      }
    }'
}

# Prints deploy, waiting-for-ci or ci-failed, given the required checks as summarize_checks prints them.
judge_checks() {
  awk -F '\t' '
    $2 == "success" { next }
    $2 ~ /^(missing|queued|in_progress|requested|waiting|pending|cancelled|stale|action_required)$/ { waiting = 1; next }
    { failed = 1 }
    END { print failed ? "ci-failed" : waiting ? "waiting-for-ci" : "deploy" }'
}

# Succeeds when the settings file is absent or a value in it is still the bootstrap's placeholder.
secrets_missing() {
  [[ ! -r "$1" ]] || grep -q CHANGE_ME "$1"
}

# Prints the dumps to delete, oldest first, given the dumps' names, which sort by the time they were taken.
dumps_to_delete() {
  printf '%s\n' "$@" | LC_ALL=C sort | awk -v excess=$(($# - KEPT_DUMPS)) 'NR <= excess'
}

# Prints the services that Compose created or recreated, one per line, given the output of `compose up` on stdin.
recreated_services() {
  sed -n -E "s/.*Container +${COMPOSE_PROJECT}-(.+)-[0-9]+ +(Recreated|Created) *\$/\1/p" | awk '!seen[$0]++'
}

# Succeeds when a body is an engine.io open packet, which the socket server sends first on the polling transport.
is_engineio_handshake() {
  [[ "$1" == '0{'*'"sid"'* ]]
}

json_string() {
  if [[ -z "$1" ]]; then
    printf null
  else
    local escaped=${1//\\/\\\\}
    printf '"%s"' "${escaped//\"/\\\"}"
  fi
}

# Prints the status file. The checks are `name<TAB>outcome` lines and the services one per line; an empty value is
# written as null.
status_json() {
  local checked_at=$1 result=$2 candidate=$3 attempt=$4 deployed=$5 deployed_at=$6 checks=$7 services=$8
  local name outcome separator=''
  printf '{\n'
  printf '  "trackedRef": %s,\n' "$(json_string "$TRACKED_REF")"
  printf '  "checkedAt": %s,\n' "$(json_string "$checked_at")"
  printf '  "result": %s,\n' "$(json_string "$result")"
  printf '  "candidateCommit": %s,\n' "$(json_string "$candidate")"
  printf '  "attempt": %s,\n' "${attempt:-null}"
  printf '  "deployedCommit": %s,\n' "$(json_string "$deployed")"
  printf '  "deployedAt": %s,\n' "$(json_string "$deployed_at")"
  printf '  "checks": ['
  while IFS=$'\t' read -r name outcome; do
    [[ -n "$name" ]] || continue
    printf '%s\n    { "name": %s, "conclusion": %s }' "$separator" "$(json_string "$name")" "$(json_string "$outcome")"
    separator=,
  done <<<"$checks"
  [[ -z "$separator" ]] || printf '\n  '
  printf '],\n'
  printf '  "recreatedServices": ['
  separator=''
  while read -r name; do
    [[ -n "$name" ]] || continue
    printf '%s%s' "$separator" "$(json_string "$name")"
    separator=', '
  done <<<"$services"
  printf ']\n'
  printf '}\n'
}

# --- Doing ----------------------------------------------------------------------------------------------------------

log() {
  printf '%s\n' "$*"
}

compose() {
  "$DOCKER" compose --ansi never --progress plain --env-file "$DEPLOY_ENV_FILE" \
    --file compose.yaml --file compose.deploy.yaml "$@"
}

# Sets checks and verdict from the check runs of the tip on GitHub. Without a token, GitHub answers 60 requests an
# hour from one address; a refused request is asked again next run.
gate_on_ci() {
  local answer
  if ! answer=$("$CURL" --fail --silent --show-error --location --max-time 30 \
    --header 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/$REPOSITORY/commits/$tip/check-runs?per_page=100"); then
    log "ci: GitHub did not answer"
    verdict=waiting-for-ci
    return
  fi
  checks=$(check_runs_from_json <<<"$answer" | summarize_checks)
  verdict=$(judge_checks <<<"$checks")
  log "ci: $(tr '\t\n' '= ' <<<"$checks")"
}

dump_database() {
  local running name old
  running=$(compose ps --status running --quiet postgres) || return 1
  if [[ -z "$running" ]]; then
    log "dump: no database runs yet; skipped"
    return 0
  fi
  name=snu-now-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
  # Written aside first, so that a dump cut short is never taken for the newest one. The dumps hold Users' data.
  (umask 007 && compose exec -T postgres pg_dumpall --username postgres | gzip >"$DEPLOY_BACKUP_DIR/.$name.partial") &&
    mv "$DEPLOY_BACKUP_DIR/.$name.partial" "$DEPLOY_BACKUP_DIR/$name" || return 1
  log "dump: $name"
  dumps_to_delete "$DEPLOY_BACKUP_DIR"/snu-now-*.sql.gz | while read -r old; do
    rm -f "$old"
    log "dump: removed $(basename "$old")"
  done || log "dump: removing the old dumps failed"
}

smoke_check() {
  local retry=(--retry 60 --retry-delay 2 --retry-max-time 120 --retry-all-errors --max-time 10)
  local body
  "$CURL" --fail --silent --show-error --output /dev/null "${retry[@]}" "$PROXY/health/ready" || return 1
  body=$("$CURL" --fail --silent --show-error "${retry[@]}" "$PROXY/socket.io/?EIO=4&transport=polling") || return 1
  is_engineio_handshake "$body"
}

clean_docker() {
  "$DOCKER" image prune --force || log "clean: removing dangling images failed"
  "$DOCKER" builder prune --force --filter until=168h || log "clean: removing old build cache failed"
}

# Builds and starts the tip, then sets result, and services, deployed and deployed_at as far as the run got.
deploy_tip() {
  local output built=yes
  log "deploy: $tip, attempt $attempt of $MAX_ATTEMPTS"
  result=build-failed
  # The services list gathers what the attempts at one commit recreated, so a retry that recreates nothing keeps it.
  ((attempt > 1)) || services=''
  if ! dump_database; then
    log "dump: failed; not deploying"
    return
  fi
  if ! { "$GIT" reset --quiet --hard "$tip" && "$GIT" clean --quiet -fdx; }; then
    log "checkout: failed"
    return
  fi
  log "checkout: $tip"

  output=$(mktemp "${TMPDIR:-/tmp}/snu-now-deploy.XXXXXX")
  compose up --detach --build 2>&1 | tee "$output" || built=no
  services=$({ printf '%s\n' "$services" && recreated_services <"$output"; } | awk 'NF && !seen[$0]++')
  rm -f "$output"
  if [[ "$built" == no ]]; then
    log "build: compose up failed; the containers that ran before keep running"
  elif smoke_check; then
    log "smoke: healthy"
    result=deployed
    deployed=$tip
    deployed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  else
    log "smoke: unhealthy"
    result=unhealthy
  fi
  clean_docker
}

write_status() {
  status_json "$checked_at" "$result" "$tip" "$attempt" "$deployed" "$deployed_at" "$checks" "$services" \
    >"$DEPLOY_STATUS_DIR/status.json.partial"
  mv "$DEPLOY_STATUS_DIR/status.json.partial" "$DEPLOY_STATUS_DIR/status.json"
  log "status: $result"
}

# Fetches the tip and does what plan_run says with it, setting result and what the status file reports.
take_tip() {
  local plan
  cd "$DEPLOY_CHECKOUT"
  if ! "$GIT" fetch --quiet origin "$TRACKED_REF"; then
    log "fetch: failed; the status file is left as it was"
    exit 1
  fi
  tip=$("$GIT" rev-parse FETCH_HEAD)
  log "fetch: $TRACKED_REF is at $tip"
  [[ "$tip" != "$last_candidate" ]] || checks=$(json_array checks name conclusion <<<"$previous")

  plan=$(plan_run "$tip" "$deployed" "$last_candidate" "$last_result" "$last_attempt" "$by_hand")
  case $plan in
    gate)
      gate_on_ci
      if [[ "$verdict" == deploy ]]; then
        attempt=1
        deploy_tip
      else
        result=$verdict
      fi
      ;;
    retry*)
      attempt=${plan#retry }
      deploy_tip
      ;;
    held)
      result=held
      attempt=$last_attempt
      ;;
    *) result=$plan ;;
  esac
}

main() {
  local checked_at by_hand=no previous tip='' verdict checks='' attempt='' result
  local last_candidate last_result last_attempt deployed deployed_at services
  checked_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  # systemd names the timer in TRIGGER_UNIT; a person's `systemctl start` sets none.
  if [[ -n "${TRIGGER_UNIT:-}" ]]; then
    log "run: started by $TRIGGER_UNIT"
  else
    by_hand=yes
    log "run: started by hand"
  fi

  # The previous status file is the memory between runs.
  previous=''
  [[ ! -f "$DEPLOY_STATUS_DIR/status.json" ]] || previous=$(json_flatten <"$DEPLOY_STATUS_DIR/status.json")
  last_candidate=$(json_value candidateCommit <<<"$previous")
  last_result=$(json_value result <<<"$previous")
  last_attempt=$(json_value attempt <<<"$previous")
  deployed=$(json_value deployedCommit <<<"$previous")
  deployed_at=$(json_value deployedAt <<<"$previous")
  services=$(json_array recreatedServices <<<"$previous")

  if secrets_missing "$DEPLOY_ENV_FILE"; then
    log "settings: $DEPLOY_ENV_FILE is missing or still holds CHANGE_ME; stopping before Docker"
    result=secrets-missing
  else
    take_tip
  fi
  write_status
  case $result in
    build-failed | unhealthy | secrets-missing) return 1 ;;
  esac
}

# Parsed whole before it runs, so that resetting the checkout, which holds this file, cannot change it mid-run.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  set -euo pipefail
  main "$@"
  exit
fi
