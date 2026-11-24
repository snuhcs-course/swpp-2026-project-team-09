#!/usr/bin/env bats
################################################################################
# AI-generated with Claude
#
# 2026-11-23  Opus 5.5   prompted by TaeHyun79
# 2026-11-23  Fable 5.2  prompted by fyoon46
# 2026-11-23  Opus 5.5   prompted by TaeHyun79
# 2026-11-24  Opus 5.5   prompted by fyoon46
################################################################################

# Fluent Bit's pipeline in the real Fluent Bit image: its inputs and filters unchanged, with a stdout output in place
# of Slack's, reading lines that each test appends, as containerd writes them, to files named like the pods' logs.
# Needs docker and jq. README.md beside it says how to run the pipeline once against Slack. A [[ ]] check ends in
# `|| false` because bash before 4.1, which macOS has, does not fail a test on a [[ ]] that is not its last command.

MAIN_SERVER_FILE=main-server-6d5f7c8b9-x2k4p_snunow_main-server-3f9a1c0b7e2d4a6f8b1c9e0d2a4f6b8c1e3d5a7f9b0c2e4d6a8f1b3c5e7d9a0b.log
WORKER_SERVER_FILE=worker-server-5b8c7d6e4-m3n7r_snunow_worker-server-4d2b6f8a0c1e3a5b7d9f1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a.log
SOCKET_SERVER_FILE=socket-server-7c9d8e6f5-q8w2e_snunow_socket-server-9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d.log
STACK=$'Error: connect ETIMEDOUT\n    at CollectionService.collect (/app/dist/collection/collection.service.js:88:13)'

# The tag that the Helm release runs. The chart pulls it from cr.fluentbit.io, which serves the same image as Docker
# Hub.
setup_file() {
  local tag
  tag=$(sed -n 's/^ *fluent_bit_image_tag *= *"\([^"]*\)".*/\1/p' "$BATS_TEST_DIRNAME/../../fluent_bit.tf")
  [ -n "$tag" ]
  export IMAGE=fluent/fluent-bit:$tag
}

setup() {
  pipeline=$BATS_TEST_DIRNAME/..
  config=$BATS_TEST_TMPDIR/config
  logs=$BATS_TEST_TMPDIR/log/containers
  container=fluent-bit-pipeline-test-$$-$BATS_TEST_NUMBER
  mkdir -p "$config" "$logs"
  # Created before Fluent Bit starts, which reads such a file from its end, so a test reads only what it appends.
  : >"$logs/$MAIN_SERVER_FILE"
  : >"$logs/$WORKER_SERVER_FILE"
  : >"$logs/$SOCKET_SERVER_FILE"
}

teardown() {
  docker rm --force "$container" >/dev/null 2>&1 || true
}

# The configuration as the Helm release puts it together, the chart's [SERVICE] first, then the given output files.
assemble() {
  cat "$BATS_TEST_DIRNAME/service.conf" "$pipeline/inputs.conf" "$pipeline/filters.conf" \
    "$pipeline/server-filters.conf" "$@" >"$config/fluent-bit.conf"
}

# Starts Fluent Bit and waits until it watches each server's file.
start_fluent_bit() {
  cat >"$BATS_TEST_TMPDIR/stdout.conf" <<'EOF'

[OUTPUT]
    Name           stdout
    Match          *
    Format         json_lines
    json_date_key  false
EOF
  assemble "$BATS_TEST_TMPDIR/stdout.conf"
  # As the Helm release's security context has it: a read-only root filesystem, no capability, no new privilege.
  docker run --detach --name "$container" --read-only --cap-drop ALL --security-opt no-new-privileges \
    --volume "$config:/config:ro" --volume "$BATS_TEST_TMPDIR/log:/var/log:ro" "$IMAGE" \
    --config /config/fluent-bit.conf >/dev/null
  eventually watches "$MAIN_SERVER_FILE"
  eventually watches "$WORKER_SERVER_FILE"
  eventually watches "$SOCKET_SERVER_FILE"
}

# Retries a command for up to 30 seconds.
eventually() {
  local _
  for _ in $(seq 60); do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 0.5
  done
  return 1
}

# The records that would be posted, one JSON object a line: Fluent Bit writes them to stdout and its own log to stderr.
records() {
  docker logs "$container" 2>/dev/null
}

fluent_bit_log() {
  { docker logs "$container" >/dev/null; } 2>&1
}

# The files under /var/log/containers that Fluent Bit watches, one a line.
watched_files() {
  fluent_bit_log | sed -n 's|.*_fs_add().* name=/var/log/containers/||p' | sort -u
}

watches() {
  [[ $(watched_files) == *"$1"* ]]
}

posted() {
  records | jq -r .message | grep -Fxq "$1"
}

posted_count() {
  records | jq -s length
}

posted_at_least() {
  [ "$(posted_count)" -ge "$1" ]
}

# A log entry in ConsoleLogger's JSON shape: level message context [stack [fields]], the fields as a JSON object.
entry() {
  local fields=${5:-}
  jq -cn --arg level "$1" --arg message "$2" --arg context "$3" --arg stack "${4-}" --argjson fields "${fields:-null}" \
    '{level: $level, pid: 1, timestamp: 1795420800123, message: $message, context: $context}
      + if $stack == "" then {} else {stack: $stack} end + ($fields // {})'
}

# The fields the main server adds to a line written in a request, with made-up values.
REQUEST_FIELDS='{"req_id":"3f1c0d6e-0000-4000-8000-000000000001","user_id":"65298f3b-0000-4000-8000-000000000002"}'

# Appends a line to a container's log file in CRI's format: text [stream [file]], by default the main server's stdout.
append() {
  printf '2026-11-23T08:00:00.123456789Z %s F %s\n' "${2:-stdout}" "$1" >>"$logs/${3:-$MAIN_SERVER_FILE}"
}

@test "info is dropped, and warn, error and fatal are kept" {
  start_fluent_bit
  append "$(entry log 'The worker token was checked' AuthService)"
  append "$(entry warn 'Kakao did not answer: timeout' KakaoService)"
  append "$(entry error 'The Collection of shuttle_vehicles failed: timeout' CollectionService)" stderr
  append "$(entry fatal 'The server stopped: out of memory' NestApplication)" stderr

  eventually posted 'The server stopped: out of memory'
  [ "$(records | jq -rs 'map(.level) | join(" ")')" = 'warn error fatal' ]
}

@test "a line that is not JSON is dropped" {
  start_fluent_bit
  append "TypeError: Cannot read properties of undefined (reading 'id')" stderr
  append '    at QuestService.find (/app/dist/quest/quest.service.js:42:17)' stderr
  append '(node:1) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to 0 is insecure' stderr
  append "$(entry warn 'Kakao did not answer: timeout' KakaoService)"

  eventually posted 'Kakao did not answer: timeout'
  [ "$(records | jq -r .message)" = 'Kakao did not answer: timeout' ]
}

@test "a file of another namespace, or of another container, is not read" {
  other_namespace_file=main-server-6d5f7c8b9-x2k4p_default_main-server-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b.log
  other_container_file=admin-8f7e6d5c4-z9y8x_snunow_admin-2b4d6f8a1c3e5a7b9d1f3b5d7f9a2c4e6b8d1f3a5c7e9b2d4f6a8c1e3b5d7f9a.log
  : >"$logs/$other_namespace_file"
  : >"$logs/$other_container_file"
  start_fluent_bit
  append "$(entry warn 'A Quest was not found: Quest ID 7' QuestService)" stdout "$other_namespace_file"
  append "$(entry warn 'An upload failed: timeout' UploadService)" stdout "$other_container_file"
  append "$(entry warn 'Kakao did not answer: timeout' KakaoService)"

  eventually posted 'Kakao did not answer: timeout'
  [ "$(records | jq -r .message)" = 'Kakao did not answer: timeout' ]
  [ "$(watched_files)" = "$(printf '%s\n' "$MAIN_SERVER_FILE" "$SOCKET_SERVER_FILE" "$WORKER_SERVER_FILE" | sort)" ]
}

@test "the worker and socket servers' warnings are kept, each with its own server" {
  start_fluent_bit
  append "$(entry log 'A Collection finished' CollectionService)" stdout "$WORKER_SERVER_FILE"
  append "$(entry warn 'The Collection of shuttle_vehicles failed: timeout' CollectionService)" stdout "$WORKER_SERVER_FILE"
  append "$(entry error 'Redis did not answer: timeout' RedisIoAdapter "$STACK")" stderr "$SOCKET_SERVER_FILE"
  append 'A line that is not JSON' stderr "$SOCKET_SERVER_FILE"

  eventually posted_at_least 2
  sleep 3
  [ "$(records | jq -rs 'sort_by(.server) | map("\(.server) \(.level) \(.message)") | join("|")')" = \
    'socket-server error Redis did not answer: timeout|worker-server warn The Collection of shuttle_vehicles failed: timeout' ]
  [ "$(records | jq -c 'select(.server == "socket-server") | keys_unsorted')" = '["server","level","context","message","stack"]' ]
}

@test "each server has a throttle of its own" {
  local main_line worker_line socket_line _
  main_line=$(entry warn 'A push to a User was not sent: timeout' PushService)
  worker_line=$(entry warn 'The Collection of shuttle_vehicles failed: timeout' CollectionService)
  socket_line=$(entry warn 'Redis did not answer: timeout' RedisIoAdapter)
  start_fluent_bit
  for _ in $(seq 30); do
    append "$main_line"
    append "$worker_line" stdout "$WORKER_SERVER_FILE"
    append "$socket_line" stdout "$SOCKET_SERVER_FILE"
  done

  eventually posted_at_least 30
  sleep 3
  [ "$(records | jq -rs 'group_by(.server) | map("\(.[0].server) \(length)") | join(" ")')" = \
    'main-server 10 socket-server 10 worker-server 10' ]
}

@test "a kept record has only server, level, context, req_id, message and stack, in that order" {
  start_fluent_bit
  append "$(entry warn 'Kakao did not answer: timeout' KakaoService)"
  append "$(entry error 'The Collection of shuttle_vehicles failed: timeout' CollectionService "$STACK" "$REQUEST_FIELDS")" stderr

  eventually posted 'The Collection of shuttle_vehicles failed: timeout'
  [ "$(records | jq -c keys_unsorted)" = '["server","level","context","message"]
["server","level","context","req_id","message","stack"]' ]
  [ "$(records | jq -r 'select(.level == "error") | .req_id')" = 3f1c0d6e-0000-4000-8000-000000000001 ]
  [ "$(records | jq -rs 'map(.server) | unique | join(" ")')" = main-server ]
  [ "$(records | jq -r 'select(.level == "error") | .stack')" = "$STACK" ]
}

@test "a request's bodies and its User never reach the output" {
  local fields
  fields=$(jq -c '. + {req_body: "{\"title\":\"made-up-request-body\"}", res_body: "{\"title\":\"made-up-response-body\"}"}' <<<"$REQUEST_FIELDS")
  start_fluent_bit
  append "$(entry warn 'PUT /quests/q-1 200 8ms' HTTP '' "$fields")"
  append "$(entry error 'PUT /plans/p-1 500 12ms - TypeError: made-up' HTTP "$STACK" "$fields")" stderr

  eventually posted 'PUT /plans/p-1 500 12ms - TypeError: made-up'
  sleep 3
  [ "$(posted_count)" -eq 2 ]
  [ "$(records | jq -rs 'map(keys_unsorted | join(",")) | unique | join("|")')" = \
    'server,level,context,req_id,message|server,level,context,req_id,message,stack' ]
  ! records | grep -Eq 'made-up-(request|response)-body|65298f3b' || false
}

@test "a burst of 30 warnings within a minute lets 10 through, and a minute later 10 more" {
  local line _
  line=$(entry warn 'A push to a User was not sent: timeout' PushService)
  start_fluent_bit
  for _ in $(seq 30); do append "$line"; done

  eventually posted_at_least 10
  # Three more flushes, for any record that the throttle let through after the tenth.
  sleep 3
  [ "$(posted_count)" -eq 10 ]

  # The draft's window of five minutes would let none of this second burst through.
  sleep 60
  for _ in $(seq 30); do append "$line"; done
  eventually posted_at_least 20
  sleep 3
  [ "$(posted_count)" -eq 20 ]
}

@test "the whole pipeline, Slack output included, passes Fluent Bit's configuration check with a stand-in webhook" {
  assemble "$pipeline/outputs.conf"

  # --dry-run checks every section's property names, not the plugins' own checks: a throttle Window that Fluent Bit
  # replaces with its default, or a webhook that is not https, still passes.
  run docker run --rm --env SLACK_WEBHOOK_MAIN_SERVER=https://hooks.slack.invalid/stand-in \
    --env SLACK_WEBHOOK_WORKER_SERVER=https://hooks.slack.invalid/stand-in \
    --env SLACK_WEBHOOK_SOCKET_SERVER=https://hooks.slack.invalid/stand-in \
    --volume "$config:/config:ro" "$IMAGE" --dry-run --config /config/fluent-bit.conf
  [ "$status" -eq 0 ]
  [[ $output == *'configuration test is successful'* ]] || false
  # An unset variable, such as a misspelt webhook's, is only a warning.
  [[ $output != *'[ warn]'* && $output != *'[error]'* ]] || false
}
