#!/usr/bin/env bats
################################################################################
# AI-generated with Claude
#
# 2026-10-17  Opus 5.5   prompted by TaeHyun79
################################################################################

# Each test runs in a subshell of its own, so that its exports reach no other test, as meant.
# shellcheck disable=SC2030,SC2031 source-path=SCRIPTDIR

# The deploy script: its decisions given plain inputs, and whole runs with git, docker and curl faked on PATH. A [[ ]]
# check ends in `|| false` because bash before 4.1, which macOS has, does not fail a test on a [[ ]] that is not its
# last command.

TIP=6b1f0c2a9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a
NEXT_TIP=0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e
THIRD_TIP=9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b
FOURTH_TIP=3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d

setup() {
  DEPLOY="$BATS_TEST_DIRNAME/../deploy.sh"
  export DEPLOY_CHECKOUT="$BATS_TEST_TMPDIR/checkout"
  export DEPLOY_ENV_FILE="$BATS_TEST_TMPDIR/secrets/snu-now.env"
  export DEPLOY_STATUS_DIR="$BATS_TEST_TMPDIR/status"
  export DEPLOY_BACKUP_DIR="$BATS_TEST_TMPDIR/backups"
  mkdir -p "$DEPLOY_CHECKOUT" "$(dirname "$DEPLOY_ENV_FILE")" "$DEPLOY_STATUS_DIR" "$DEPLOY_BACKUP_DIR"
  printf 'POSTGRES_PASSWORD=Zq3v8XbT1\nKAKAO_REST_API_KEY=3f9a1c\n' >"$DEPLOY_ENV_FILE"

  mkdir "$BATS_TEST_TMPDIR/bin"
  for command in git docker curl; do
    ln -s "$BATS_TEST_DIRNAME/deploy-fakes.sh" "$BATS_TEST_TMPDIR/bin/$command"
  done
  export PATH="$BATS_TEST_TMPDIR/bin:$PATH"
  export FAKE_CALLS="$BATS_TEST_TMPDIR/calls"
  : >"$FAKE_CALLS"
  export FAKE_TIP=$TIP
  export FAKE_CHECK_RUNS="$BATS_TEST_DIRNAME/fixtures/check-runs.json"
  export FAKE_HANDSHAKE='0{"sid":"lv_VI97HAXpY6yYWAAAC","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}'
  export FAKE_COMPOSE_OUTPUT="$BATS_TEST_TMPDIR/compose-up.txt"
  cat >"$FAKE_COMPOSE_OUTPUT" <<'EOF'
 Container snu-now-redis-1  Running
 Container snu-now-postgres-1  Running
 Container snu-now-main-server-1  Recreate
 Container snu-now-socket-server-1  Recreate
 Container snu-now-proxy-1  Creating
 Container snu-now-main-server-1  Recreated
 Container snu-now-socket-server-1  Recreated
 Container snu-now-proxy-1  Created
 Container snu-now-match-server-1  Running
 Container snu-now-main-server-1  Starting
 Container snu-now-socket-server-1  Starting
 Container snu-now-proxy-1  Starting
 Container snu-now-main-server-1  Started
 Container snu-now-socket-server-1  Started
 Container snu-now-proxy-1  Started
EOF
  # Under systemd, as the timer starts a run, unless a test says otherwise.
  export INVOCATION_ID=5f0c2b7e9a4d4c1e8b3a6d0f2e7c9a1b
}

field() {
  jq -r "$1" "$DEPLOY_STATUS_DIR/status.json"
}

# The steps the faked commands were called for, one name per call, in the order they were called.
steps() {
  awk '
    /^git fetch /                  { print "fetch" }
    /^curl .*api\.github\.com/     { print "check-runs" }
    /^docker .* exec .*pg_dumpall/ { print "dump" }
    /^git reset .*--hard /         { print "reset" }
    /^git clean /                  { print "clean" }
    /^docker compose .* build$/    { print "compose-build" }
    /^docker compose .* up /       { print "compose-up" }
    /^curl .*\/health\/ready/      { print "ready" }
    /^curl .*\/socket\.io\//       { print "handshake" }
    /^docker image prune /         { print "image-prune" }
    /^docker builder prune /       { print "builder-prune" }
  ' "$FAKE_CALLS"
}

PASSED=('main-server completed success' 'socket-server completed success' 'worker-server completed success'
  'match-server completed success' 'flow-tests completed success')

# The verdict on a commit's check runs, each given as "name status conclusion".
verdict() {
  printf '%s\n' "$@" | tr ' ' '\t' | summarize_checks | judge_checks
}

# Makes the faked GitHub answer with these check runs, each given as "name status conclusion".
serve_check_runs() {
  local run name state conclusion id=113863074690 separator=''
  {
    printf '{\n  "total_count": %d,\n  "check_runs": [' "$#"
    for run; do
      read -r name state conclusion <<<"$run"
      [ "$conclusion" = null ] || conclusion="\"$conclusion\""
      printf '%s\n    {\n      "id": %d,\n      "name": "%s",\n      "status": "%s",\n      "conclusion": %s,\n' \
        "$separator" $((id++)) "$name" "$state" "$conclusion"
      printf '      "output": { "title": null, "annotations_count": 0 },\n'
      printf '      "app": { "id": 15368, "slug": "github-actions", "name": "GitHub Actions", "events": [] }\n    }'
      separator=,
    done
    printf '\n  ]\n}\n'
  } >"$BATS_TEST_TMPDIR/check-runs.json"
  export FAKE_CHECK_RUNS="$BATS_TEST_TMPDIR/check-runs.json"
}

@test "with the fakes, a successful run calls fetch, the check-runs request, the dump, reset and clean, compose build, compose up, the two smoke requests, the prunes, in that order, and writes a status file with every field of the spec's \"The status file\" and recreatedServices taken from Compose's output" {
  export FAKE_DB_RUNNING=yes

  run "$DEPLOY"

  [ "$status" -eq 0 ]
  [ "$(steps | tr '\n' ' ')" = "fetch check-runs dump reset clean compose-build compose-up ready handshake image-prune builder-prune " ]
  [ "$(field 'keys_unsorted | join(" ")')" = "trackedRef checkedAt result candidateCommit attempt deployedCommit deployedAt checks recreatedServices" ]
  [ "$(field '[.trackedRef, .result, .candidateCommit, .attempt, .deployedCommit] | join(" ")')" = "development deployed $TIP 1 $TIP" ]
  [[ "$(field .checkedAt)" =~ ^20[0-9]{2}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z$ ]] || false
  [[ "$(field .deployedAt)" =~ ^20[0-9]{2}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z$ ]] || false
  [[ ! "$(field .deployedAt)" < "$(field .checkedAt)" ]] || false
  [ "$(field '.checks | map("\(.name)=\(.conclusion)") | join(" ")')" = "main-server=success socket-server=success worker-server=success match-server=success flow-tests=success" ]
  [ "$(field '.recreatedServices | join(" ")')" = "main-server socket-server proxy" ]
}

@test "a run that deploys logs a line for each of the eight steps, the clean among them, in their order" {
  export FAKE_DB_RUNNING=yes

  run "$DEPLOY"

  [ "$status" -eq 0 ]
  [ "$(grep -oE '^[a-z]+:' <<<"$output" | uniq | tr '\n' ' ')" = "run: fetch: ci: deploy: dump: checkout: smoke: clean: status: " ]
}

@test "the tip equal to the last deployed commit gives up-to-date and no other command runs" {
  # shellcheck source=../deploy.sh
  source "$DEPLOY"
  [ "$(plan_run "$TIP" "$TIP" "$TIP" deployed 1 no)" = up-to-date ]

  run "$DEPLOY"
  [ "$(field .result)" = deployed ]
  : >"$FAKE_CALLS"

  run "$DEPLOY"

  [ "$status" -eq 0 ]
  [ "$(field '[.result, .candidateCommit, .deployedCommit] | join(" ")')" = "up-to-date $TIP $TIP" ]
  [ "$(cut -d ' ' -f 1-2 "$FAKE_CALLS" | tr '\n' ' ')" = "git fetch git rev-parse " ]
}

@test "all five required checks success gives deploy; one missing or in_progress gives waiting-for-ci; one failure gives ci-failed and the commit is not looked at again; a failed admin or mobile check alone still gives deploy" {
  # shellcheck source=../deploy.sh
  source "$DEPLOY"
  [ "$(verdict "${PASSED[@]}")" = deploy ]
  [ "$(verdict "${PASSED[@]:0:4}")" = waiting-for-ci ]
  [ "$(verdict "${PASSED[@]:0:4}" 'flow-tests in_progress null')" = waiting-for-ci ]
  [ "$(verdict "${PASSED[@]:0:4}" 'flow-tests completed failure')" = ci-failed ]
  [ "$(verdict "${PASSED[@]}" 'admin completed failure' 'mobile completed failure')" = deploy ]

  serve_check_runs "${PASSED[@]:0:4}" 'flow-tests completed failure' 'mobile completed success'
  run "$DEPLOY"
  [ "$status" -eq 0 ]
  [ "$(field '[.result, .candidateCommit, .attempt, .deployedCommit] | map(tostring) | join(" ")')" = "ci-failed $TIP null null" ]
  [ "$(field '.checks | map("\(.name)=\(.conclusion)") | join(" ")')" = "main-server=success socket-server=success worker-server=success match-server=success flow-tests=failure" ]
  : >"$FAKE_CALLS"

  run "$DEPLOY"

  [ "$status" -eq 0 ]
  [ "$(field .result)" = ci-failed ]
  [ "$(field '.checks | map("\(.name)=\(.conclusion)") | join(" ")')" = "main-server=success socket-server=success worker-server=success match-server=success flow-tests=failure" ]
  [ "$(grep -c '^curl ' "$FAKE_CALLS")" -eq 0 ]
}

@test "a required check that passed on one push of the commit counts as passed, though its run on another push failed" {
  # shellcheck source=../deploy.sh
  source "$DEPLOY"
  [ "$(verdict "${PASSED[@]}" 'flow-tests completed failure')" = deploy ]
  [ "$(verdict "${PASSED[@]:0:4}" 'flow-tests completed failure' 'flow-tests in_progress null')" = waiting-for-ci ]
}

@test "a required check whose only run was cancelled, went stale or awaits an action gives waiting-for-ci, also beside a failed run; failure, timed_out, startup_failure, neutral and skipped give ci-failed" {
  # shellcheck source=../deploy.sh
  source "$DEPLOY"
  local conclusion
  for conclusion in cancelled stale action_required; do
    [ "$(verdict "${PASSED[@]:0:4}" "flow-tests completed $conclusion")" = waiting-for-ci ]
    [ "$(verdict "${PASSED[@]:0:4}" 'flow-tests completed failure' "flow-tests completed $conclusion")" = waiting-for-ci ]
  done
  for conclusion in failure timed_out startup_failure neutral skipped; do
    [ "$(verdict "${PASSED[@]:0:4}" "flow-tests completed $conclusion")" = ci-failed ]
  done
}

@test "after a failed build, attempts 1 and 2 retry the same commit, attempt 3 gives held, and a new tip clears the hold" {
  # shellcheck source=../deploy.sh
  source "$DEPLOY"
  [ "$(plan_run "$TIP" '' "$TIP" build-failed 1 no)" = 'retry 2' ]
  [ "$(plan_run "$TIP" '' "$TIP" build-failed 2 no)" = 'retry 3' ]
  [ "$(plan_run "$TIP" '' "$TIP" build-failed 3 no)" = held ]
  [ "$(plan_run "$NEXT_TIP" '' "$TIP" held 3 no)" = gate ]

  export FAKE_BUILD_STATUS=1
  for attempt in 1 2 3; do
    : >"$FAKE_CALLS"
    run "$DEPLOY"
    [ "$status" -ne 0 ]
    [ "$(field '[.result, .candidateCommit, .attempt] | map(tostring) | join(" ")')" = "build-failed $TIP $attempt" ]
    [ "$(steps | grep "^compose-" | tr '\n' ' ')" = "compose-build " ]
    [ "$attempt" -eq 1 ] || [ "$(steps | grep -c check-runs)" -eq 0 ]
  done
  : >"$FAKE_CALLS"
  run "$DEPLOY"
  [ "$status" -eq 0 ]
  [ "$(field '[.result, .candidateCommit, .attempt] | map(tostring) | join(" ")')" = "held $TIP 3" ]
  [ "$(steps | grep -c "^compose-")" -eq 0 ]

  export FAKE_TIP=$NEXT_TIP FAKE_BUILD_STATUS=0
  run "$DEPLOY"

  [ "$status" -eq 0 ]
  [ "$(field '[.result, .candidateCommit, .attempt, .deployedCommit] | map(tostring) | join(" ")')" = "deployed $NEXT_TIP 1 $NEXT_TIP" ]
}

@test "a build that fails runs no compose up, so the containers that ran before keep running; a compose up that fails after the build gives unhealthy, deployedCommit stays the commit deployed before, recreatedServices comes from that compose up, and the commit is retried and held as after a failed build" {
  run "$DEPLOY"
  export FAKE_TIP=$NEXT_TIP FAKE_BUILD_STATUS=1
  : >"$FAKE_CALLS"
  run "$DEPLOY"
  [ "$(field '[.result, .deployedCommit] | join(" ")')" = "build-failed $TIP" ]
  [ "$(steps | grep -c compose-up)" -eq 0 ]

  # As when the main server's migration fails and its health check keeps it from starting.
  cat >"$FAKE_COMPOSE_OUTPUT" <<'EOF'
 Container snu-now-main-server-1  Recreate
 Container snu-now-main-server-1  Recreated
 Container snu-now-main-server-1  Starting
 Container snu-now-main-server-1  Started
 Container snu-now-main-server-1  Waiting
 Container snu-now-main-server-1  Error
dependency failed to start: container snu-now-main-server-1 is unhealthy
EOF
  export FAKE_BUILD_STATUS=0 FAKE_UP_STATUS=1
  for attempt in 2 3; do
    : >"$FAKE_CALLS"
    run "$DEPLOY"
    [ "$status" -ne 0 ]
    [ "$(field '[.result, .candidateCommit, .attempt, .deployedCommit] | map(tostring) | join(" ")')" = "unhealthy $NEXT_TIP $attempt $TIP" ]
    [ "$(steps | grep -E '^(compose-|ready|handshake)' | tr '\n' ' ')" = "compose-build compose-up " ]
  done
  [ "$(field '.recreatedServices | join(" ")')" = "main-server" ]
  run "$DEPLOY"
  [ "$(field '[.result, .attempt] | map(tostring) | join(" ")')" = "held 3" ]
}

@test "nine dumps give the two oldest for deletion; no running database gives no dump" {
  # shellcheck source=../deploy.sh
  source "$DEPLOY"
  run dumps_to_delete snu-now-20261014T091502Z.sql.gz snu-now-20261009T230011Z.sql.gz snu-now-20261016T120000Z.sql.gz \
    snu-now-20261011T080000Z.sql.gz snu-now-20261010T101500Z.sql.gz snu-now-20261017T030405Z.sql.gz \
    snu-now-20261013T175959Z.sql.gz snu-now-20261009T120000Z.sql.gz snu-now-20261015T000001Z.sql.gz
  [ "$output" = "$(printf '%s\n' snu-now-20261009T120000Z.sql.gz snu-now-20261009T230011Z.sql.gz)" ]

  run "$DEPLOY"

  [ "$status" -eq 0 ]
  [ "$(field .result)" = deployed ]
  [ "$(steps | grep -c dump)" -eq 0 ]
  [ -z "$(ls -A "$DEPLOY_BACKUP_DIR")" ]
}

@test "a run with a running database leaves the newest seven dumps, its own among them" {
  export FAKE_DB_RUNNING=yes
  for day in 03 04 05 06 07 08 09 10; do
    echo old >"$DEPLOY_BACKUP_DIR/snu-now-202610${day}T120000Z.sql.gz"
  done

  run "$DEPLOY"

  [ "$status" -eq 0 ]
  ls "$DEPLOY_BACKUP_DIR" >"$BATS_TEST_TMPDIR/dumps"
  [ "$(head -n 6 "$BATS_TEST_TMPDIR/dumps" | tr '\n' ' ')" = "$(printf 'snu-now-202610%sT120000Z.sql.gz ' 05 06 07 08 09 10)" ]
  [ "$(wc -l <"$BATS_TEST_TMPDIR/dumps")" -eq 7 ]
  [ "$(gzip -dc "$DEPLOY_BACKUP_DIR/$(tail -n 1 "$BATS_TEST_TMPDIR/dumps")")" = '-- PostgreSQL database cluster dump' ]
}

@test "CHANGE_ME in the settings file gives secrets-missing and no docker call" {
  printf 'POSTGRES_PASSWORD=Zq3v8XbT1\nKAKAO_REST_API_KEY=CHANGE_ME\n' >"$DEPLOY_ENV_FILE"

  run "$DEPLOY"

  [ "$(field .result)" = secrets-missing ]
  [ "$(grep -c '^docker ' "$FAKE_CALLS")" -eq 0 ]
}

# Runs the deploy script and prints its result and whether it exited zero.
outcome() {
  run "$DEPLOY"
  if [ "$status" -eq 0 ]; then echo "$(field .result) zero"; else echo "$(field .result) non-zero"; fi
}

@test "the exit status is non-zero for build-failed, unhealthy and secrets-missing, zero otherwise" {
  [ "$(outcome)" = "deployed zero" ]
  [ "$(outcome)" = "up-to-date zero" ]

  export FAKE_TIP=$NEXT_TIP
  serve_check_runs "${PASSED[@]:0:4}" 'flow-tests in_progress null'
  [ "$(outcome)" = "waiting-for-ci zero" ]
  serve_check_runs "${PASSED[@]:0:4}" 'flow-tests completed failure'
  [ "$(outcome)" = "ci-failed zero" ]

  export FAKE_TIP=$THIRD_TIP FAKE_BUILD_STATUS=1
  serve_check_runs "${PASSED[@]}"
  [ "$(outcome)" = "build-failed non-zero" ]
  [ "$(outcome)" = "build-failed non-zero" ]
  [ "$(outcome)" = "build-failed non-zero" ]
  [ "$(outcome)" = "held zero" ]

  export FAKE_TIP=$FOURTH_TIP FAKE_BUILD_STATUS=0 FAKE_READY_STATUS=22
  [ "$(outcome)" = "unhealthy non-zero" ]

  printf 'KAKAO_REST_API_KEY=CHANGE_ME\n' >"$DEPLOY_ENV_FILE"
  [ "$(outcome)" = "secrets-missing non-zero" ]
}

@test "a check-runs request that GitHub refuses, as it does past the hourly limit, gives waiting-for-ci" {
  export FAKE_GITHUB_STATUS=22

  run "$DEPLOY"

  [ "$status" -eq 0 ]
  [ "$(field '[.result, .candidateCommit] | join(" ")')" = "waiting-for-ci $TIP" ]
  [ "$(steps | grep -c compose-up)" -eq 0 ]
}

@test "a failed fetch exits non-zero and leaves the status file as it was" {
  run "$DEPLOY"
  cp "$DEPLOY_STATUS_DIR/status.json" "$BATS_TEST_TMPDIR/before.json"
  export FAKE_FETCH_STATUS=128

  run "$DEPLOY"

  [ "$status" -ne 0 ]
  cmp "$BATS_TEST_TMPDIR/before.json" "$DEPLOY_STATUS_DIR/status.json"
}

@test "a socket server answer that is not an engine.io handshake gives unhealthy" {
  export FAKE_HANDSHAKE='{"statusCode":404,"message":"Cannot GET /socket.io/"}'

  run "$DEPLOY"

  [ "$status" -ne 0 ]
  [ "$(field '[.result, .deployedCommit] | map(tostring) | join(" ")')" = "unhealthy null" ]
}

@test "a held commit is tried again from attempt 1 by a run that finds the request file, which the run removes; without the file, a run under systemd, as systemctl start snu-now-deploy starts one, leaves it held" {
  export FAKE_BUILD_STATUS=1
  for _ in 1 2 3 4; do run "$DEPLOY"; done
  [ "$(field .result)" = held ]
  export FAKE_BUILD_STATUS=0
  run "$DEPLOY"
  [ "$(field '[.result, .attempt] | map(tostring) | join(" ")')" = "held 3" ]
  : >"$FAKE_CALLS"

  touch "$DEPLOY_STATUS_DIR/redeploy"
  run "$DEPLOY"

  [ "$status" -eq 0 ]
  [ "$(field '[.result, .attempt] | map(tostring) | join(" ")')" = "deployed 1" ]
  [ "$(steps | grep -c check-runs)" -eq 1 ]
  [ ! -e "$DEPLOY_STATUS_DIR/redeploy" ]
}

@test "a run outside systemd, as sudo bash deploy.sh starts one, asks GitHub again about a ci-failed commit" {
  serve_check_runs "${PASSED[@]:0:4}" 'flow-tests completed failure'
  run "$DEPLOY"
  [ "$(field .result)" = ci-failed ]

  unset INVOCATION_ID
  serve_check_runs "${PASSED[@]}"
  run "$DEPLOY"

  [ "$status" -eq 0 ]
  [ "$(field '[.result, .deployedCommit] | join(" ")')" = "deployed $TIP" ]
}
