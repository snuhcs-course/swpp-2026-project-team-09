#!/usr/bin/env bats
################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# The Release workflow's script, through its commands: the name check, the gate with gh faked on PATH, the secrets
# files, and the choice of generated objects to delete.

REPOSITORY=snuhcs-course/swpp-2026-project-team-09
COMMIT=6b1f0c2a9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a
TAG=snunow/main-server/26.11.13-1
CI_JOBS=(main-server socket-server worker-server match-server admin mobile flow-tests deploy-scripts release-script
  terraform manifests)

setup() {
  RELEASE="$BATS_TEST_DIRNAME/../release.sh"
  mkdir "$BATS_TEST_TMPDIR/bin"
  ln -s "$BATS_TEST_DIRNAME/gh-fake.sh" "$BATS_TEST_TMPDIR/bin/gh"
  export PATH="$BATS_TEST_TMPDIR/bin:$PATH"
  export FAKE_CALLS="$BATS_TEST_TMPDIR/calls"
  export FAKE_GITHUB="$BATS_TEST_TMPDIR/github"
  mkdir "$FAKE_GITHUB"
  : >"$FAKE_CALLS"
  export GATE_INTERVAL_SECONDS=0
}

# Makes the faked GitHub list these CI runs of the commit, each "id status conclusion push", in every poll or, after
# --poll N, in poll N. The push is `branch` or `tag`, the Release's tag.
serve_runs() {
  local file=$FAKE_GITHUB/runs.json
  if [[ "$1" == --poll ]]; then
    file+=.$2
    shift 2
  fi
  printf '%s\n' "$@" | jq --raw-input --slurp --arg commit "$COMMIT" --arg tag "$TAG" '
    [split("\n")[] | select(length > 0) | split(" ") |
      {id: (.[0] | tonumber), name: "CI", path: ".github/workflows/ci.yml", head_sha: $commit,
        head_branch: (if .[3] == "tag" then $tag else "2.0/Main" end), status: .[1],
        conclusion: (if .[2] == "null" then null else .[2] end)}] |
    {total_count: length, workflow_runs: .}' >"$file"
}

# Makes the faked GitHub list a run's jobs, each "name status conclusion", in every poll or, after --poll N, in poll N.
serve_jobs() {
  local file
  if [[ "$1" == --poll ]]; then
    file=$FAKE_GITHUB/jobs-$3.json.$2
    shift 2
  else
    file=$FAKE_GITHUB/jobs-$1.json
  fi
  local run=$1
  shift
  printf '%s\n' "$@" | jq --raw-input --slurp --argjson run "$run" '
    [split("\n")[] | select(length > 0) | split(" ") |
      {run_id: $run, name: .[0], status: .[1], conclusion: (if .[2] == "null" then null else .[2] end)}] |
    {total_count: length, jobs: .}' >"$file"
}

# Every CI job with this status and conclusion, as serve_jobs takes them, except the jobs named in the further arguments.
ci_jobs() {
  local state=$1 conclusion=$2 job
  shift 2
  for job in "${CI_JOBS[@]}"; do
    [[ " $* " == *" $job "* ]] || echo "$job $state $conclusion"
  done
}

polls() {
  cat "$FAKE_GITHUB/poll"
}

@test "the name check accepts a server's tag and an all tag, and gives the servers and the image tag" {
  run "$RELEASE" check-name refs/tags/snunow/main-server/26.11.13-1
  [ "$status" -eq 0 ]
  [ "$output" = $'servers=["main-server"]\nimage-tag=main-server-26.11.13-1' ]

  run "$RELEASE" check-name refs/tags/snunow/all/26.11.13-12
  [ "$status" -eq 0 ]
  [ "$output" = $'servers=["main-server","socket-server","worker-server","match-server","admin"]\nimage-tag=all-26.11.13-12' ]
}

@test "the name check refuses every other name, a branch and an app tag among them" {
  local ref
  for ref in refs/tags/snunow/web/26.11.13-1 refs/tags/snunow/main-server/26.13.01-1 \
    refs/tags/snunow/main-server/26.11.32-1 refs/tags/snunow/main-server/26.11.13-0 \
    refs/tags/snunow/main-server/26.11.13 refs/tags/snunow-26.11.13-1 refs/tags/snunow/main-server/26.00.13-1 \
    refs/tags/snunow/main-server/26.11.00-1 refs/tags/snunow/main-server/2026.11.13-1 \
    refs/tags/snunow/main-server/26.11.13-01 refs/tags/snunow/app/26.11.13-1 refs/heads/snunow/main-server/26.11.13-1 \
    refs/heads/2.0/Main refs/tags/snunow/main-server/26.11.13-1/x; do
    run "$RELEASE" check-name "$ref"
    [ "$status" -eq 1 ] || { echo "accepted $ref"; false; }
    [[ "$output" == *"$ref"* ]] || false
  done
}

@test "the gate goes on once every CI job of the commit has passed, and only reads CI's runs and their jobs" {
  serve_runs '41 completed success tag'
  mapfile -t jobs < <(ci_jobs completed success)
  serve_jobs 41 "${jobs[@]}"

  run "$RELEASE" gate "$REPOSITORY" "$COMMIT" "$TAG"

  [ "$status" -eq 0 ]
  [[ "$output" == *"gate: every CI job passed"* ]] || false
  [ "$(polls)" -eq 1 ]
  grep -v -E "^gh api repos/$REPOSITORY/actions/(workflows/ci\.yml/runs\?head_sha=$COMMIT&|runs/41/jobs\?)[a-z_=&0-9]*$" \
    "$FAKE_CALLS" && false
  [ "$(wc -l <"$FAKE_CALLS")" -eq 2 ]
}

@test "a job that failed in every run of the commit stops the gate" {
  serve_runs '41 completed failure branch' '57 completed failure tag'
  mapfile -t jobs < <(ci_jobs completed success mobile; echo 'mobile completed failure')
  serve_jobs 41 "${jobs[@]}"
  serve_jobs 57 "${jobs[@]}"

  run "$RELEASE" gate "$REPOSITORY" "$COMMIT" "$TAG"

  [ "$status" -eq 1 ]
  [[ "$output" == *"mobile=failure"* ]] || false
  [[ "$output" == *"gate: CI failed on $COMMIT"* ]] || false
  [ "$(polls)" -eq 1 ]
}

@test "a job that failed on the branch's push but still runs on the tag's is waited for, and one success of each job is enough" {
  mapfile -t branch_jobs < <(ci_jobs completed success mobile; echo 'mobile completed failure')
  serve_runs '41 completed failure branch' '57 in_progress null tag'
  serve_jobs 41 "${branch_jobs[@]}"
  serve_jobs 57 'mobile in_progress null' 'main-server queued null'
  serve_jobs --poll 2 57 'mobile completed success' 'main-server in_progress null'

  run "$RELEASE" gate "$REPOSITORY" "$COMMIT" "$TAG"

  [ "$status" -eq 0 ]
  [ "$(polls)" -eq 2 ]
  [[ "${lines[0]}" == *"mobile=in_progress"* ]] || false
  [[ "$output" == *"gate: every CI job passed"* ]] || false
}

@test "a run that has not listed its jobs yet keeps a job that failed elsewhere waiting" {
  mapfile -t branch_jobs < <(ci_jobs completed success mobile; echo 'mobile completed failure')
  mapfile -t tag_jobs < <(ci_jobs completed success)
  serve_runs '41 completed failure branch' '57 queued null tag'
  serve_jobs 41 "${branch_jobs[@]}"
  serve_jobs 57
  serve_jobs --poll 2 57 "${tag_jobs[@]}"

  run "$RELEASE" gate "$REPOSITORY" "$COMMIT" "$TAG"

  [ "$status" -eq 0 ]
  [ "$(polls)" -eq 2 ]
  [[ "${lines[0]}" == *"mobile=queued"* ]] || false
}

@test "a job that failed on the branch's push is waited for until GitHub lists the tag's run" {
  mapfile -t branch_jobs < <(ci_jobs completed success mobile; echo 'mobile completed failure')
  mapfile -t tag_jobs < <(ci_jobs completed success)
  serve_runs '41 completed failure branch'
  serve_runs --poll 2 '41 completed failure branch' '57 completed success tag'
  serve_jobs 41 "${branch_jobs[@]}"
  serve_jobs 57 "${tag_jobs[@]}"

  run "$RELEASE" gate "$REPOSITORY" "$COMMIT" "$TAG"

  [ "$status" -eq 0 ]
  [ "$(polls)" -eq 2 ]
  [[ "${lines[0]}" == *"mobile=missing"* ]] || false
}

@test "the gate waits while the commit has no CI run, and fails once its limit passes" {
  serve_runs

  GATE_LIMIT_SECONDS=0 run "$RELEASE" gate "$REPOSITORY" "$COMMIT" "$TAG"

  [ "$status" -eq 1 ]
  [[ "$output" == *"ci=missing"* ]] || false
  [[ "$output" == *"gate: CI has not passed on $COMMIT within 0 minutes"* ]] || false
}

@test "a run cancelled by a newer push to its branch is waited for, not failed" {
  mapfile -t jobs < <(ci_jobs completed success flow-tests; echo 'flow-tests completed cancelled')
  serve_runs '41 completed cancelled branch'
  serve_jobs 41 "${jobs[@]}"

  GATE_LIMIT_SECONDS=0 run "$RELEASE" gate "$REPOSITORY" "$COMMIT" "$TAG"

  [ "$status" -eq 1 ]
  [[ "$output" == *"flow-tests=cancelled"* ]] || false
  [[ "$output" == *"gate: CI has not passed"* ]] || false
}

@test "GitHub not answering is waited for" {
  mapfile -t jobs < <(ci_jobs completed success)
  serve_runs '41 completed success tag'
  serve_jobs 41 "${jobs[@]}"
  export FAKE_GITHUB_DOWN=1

  run "$RELEASE" gate "$REPOSITORY" "$COMMIT" "$TAG"

  [ "$status" -eq 0 ]
  [ "$(polls)" -eq 2 ]
  [[ "$output" == *"ci: GitHub did not answer"* ]] || false
}

ENDPOINT=snunow.c0ffee12abcd.ap-northeast-2.rds.amazonaws.com
PRIVATE_KEY=$'-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgq3v8XbT1Zq3v8XbT\n1Zq3v8XbT1Zq3v8XbT1Zq3v8XbShRANCAAQ3v8XbT1Zq3v8XbT1Zq3v8XbT1Zq3v\n-----END PRIVATE KEY-----'
PUBLIC_KEY=$'-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEN7/F2009Wat7/F2009Wat7/F2009W\nat7/F2009Wat7/F2009Wat7/F2009Wat7/F2009Wat7/F2009Wat7/F2009Wa==\n-----END PUBLIC KEY-----'

# Parameter Store's answer to get-parameters-by-path, from `name value` pairs.
serve_parameters() {
  while (($#)); do
    jq --null-input --arg name "$1" --arg value "$2" \
      '{Name: "/snunow/production/\($name)", Type: "SecureString", Value: $value, Version: 1, DataType: "text"}'
    shift 2
  done | jq --slurp '{Parameters: .}' >"$BATS_TEST_TMPDIR/parameters.json"
}

PARAMETERS=(main-db-password 'k/9Zr+Qw2=xT@4' match-db-password 0b5e3c9a7d1f42e8 access-token-private-key
  "$PRIVATE_KEY" access-token-public-key "$PUBLIC_KEY" worker-token 3f9a1c77d2e0 match-server-token 8e21b4a09c5d
  kakao-rest-api-key 5c1d0e9f8a7b openrouter-api-key sk-or-v1-77aa initial-administrator-emails 'a@snu.ac.kr,b@snu.ac.kr')

@test "the secrets files hold every parameter, the database addresses with their passwords encoded, and the key pair with its line breaks, and no value is printed" {
  serve_parameters "${PARAMETERS[@]}"
  local secrets=$BATS_TEST_TMPDIR/secrets

  run "$RELEASE" write-secrets "$secrets" "$ENDPOINT" <"$BATS_TEST_TMPDIR/parameters.json"

  [ "$status" -eq 0 ]
  diff "$secrets/secrets.env" - <<EOF
MAIN_DATABASE_URL=postgresql://main:k%2F9Zr%2BQw2%3DxT%404@$ENDPOINT:5432/main?sslmode=verify-full
MATCH_DATABASE_URL=postgresql://match:0b5e3c9a7d1f42e8@$ENDPOINT:5432/match?sslmode=verify-full
WORKER_TOKEN=3f9a1c77d2e0
MATCH_SERVER_TOKEN=8e21b4a09c5d
KAKAO_REST_API_KEY=5c1d0e9f8a7b
OPENROUTER_API_KEY=sk-or-v1-77aa
INITIAL_ADMINISTRATOR_EMAILS=a@snu.ac.kr,b@snu.ac.kr
EOF
  diff "$secrets/access-token-private-key.pem" <(printf '%s\n' "$PRIVATE_KEY")
  diff "$secrets/access-token-public-key.pem" <(printf '%s\n' "$PUBLIC_KEY")
  [ "$(wc -l <"$secrets/access-token-private-key.pem")" -eq 4 ]
  [[ "$output" != *3f9a1c77d2e0* && "$output" != *"BEGIN"* && "$output" != *0b5e3c9a7d1f42e8* ]] || false
}

@test "a missing parameter, a key without line breaks, a value over two lines, or no database endpoint fails, naming the parameter and printing no value" {
  local secrets=$BATS_TEST_TMPDIR/secrets

  serve_parameters "${PARAMETERS[@]:2}"
  run "$RELEASE" write-secrets "$secrets" "$ENDPOINT" <"$BATS_TEST_TMPDIR/parameters.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"/snunow/production/main-db-password"* ]] || false

  serve_parameters "${PARAMETERS[@]:0:6}" access-token-public-key \
    '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\n-----END PUBLIC KEY-----' "${PARAMETERS[@]:8}"
  run "$RELEASE" write-secrets "$secrets" "$ENDPOINT" <"$BATS_TEST_TMPDIR/parameters.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"/snunow/production/access-token-public-key"* && "$output" != *MFkw* ]] || false

  serve_parameters "${PARAMETERS[@]:0:8}" worker-token $'3f9a1c77\nd2e0' "${PARAMETERS[@]:10}"
  run "$RELEASE" write-secrets "$secrets" "$ENDPOINT" <"$BATS_TEST_TMPDIR/parameters.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"/snunow/production/worker-token"* && "$output" != *3f9a1c77* ]] || false

  serve_parameters "${PARAMETERS[@]}"
  run "$RELEASE" write-secrets "$secrets" '' <"$BATS_TEST_TMPDIR/parameters.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"database endpoint"* ]] || false
}

# A ConfigMap or Secret as `kubectl get -o json` lists it: kind, name, and creation time.
stored() {
  jq --null-input --arg kind "$1" --arg name "$2" --arg created "$3" \
    '{apiVersion: "v1", kind: $kind, metadata: {name: $name, namespace: "snunow", creationTimestamp: $created}}'
}

# A pod spec whose one container reads a value from each named ConfigMap or Secret.
reading() {
  jq --null-input --arg settings "$1" --arg secrets "$2" '{containers: [{name: "server", image: "main-server:abc", env: [
    {name: "REDIS_HOST", valueFrom: {configMapKeyRef: {name: $settings, key: "REDIS_HOST"}}},
    {name: "WORKER_TOKEN", valueFrom: {secretKeyRef: {name: $secrets, key: "WORKER_TOKEN"}}}]}]}'
}

@test "after a rollout, only the generated ConfigMaps and Secrets that no Deployment and no pod names, and that are not new, are chosen for deletion" {
  local now old=2026-11-13T02:00:00Z new=2026-11-13T02:58:00Z
  now=$(date -u -d 2026-11-13T03:00:00Z +%s)
  {
    stored ConfigMap settings-6htcg4cm6m "$old"
    stored ConfigMap settings-2k9b7dhf5t "$old"
    stored ConfigMap settings-t8m5c2gh7f "$old"
    stored ConfigMap kube-root-ca.crt "$old"
    stored Secret secrets-f7c9k2bm4h "$old"
    stored Secret secrets-b5g8h2kt9d "$old"
    stored Secret secrets-m4d7t9hc2g "$old"
    stored Secret secrets-k8h2dm5c7b "$new"
    stored Secret database-setup "$old"
  } | jq --slurp '{apiVersion: "v1", kind: "List", items: .}' >"$BATS_TEST_TMPDIR/objects.json"
  {
    jq --null-input --argjson spec "$(reading settings-6htcg4cm6m secrets-f7c9k2bm4h)" \
      '{kind: "Deployment", metadata: {name: "main-server"}, spec: {replicas: 2, template: {spec: $spec}}}'
    jq --null-input --argjson spec "$(reading settings-t8m5c2gh7f secrets-m4d7t9hc2g)" \
      '{kind: "Pod", metadata: {name: "socket-server-5d8f7c9b6-x2k4p"}, spec: $spec}'
  } | jq --slurp '{apiVersion: "v1", kind: "List", items: .}' >"$BATS_TEST_TMPDIR/users.json"

  run "$RELEASE" unused-generated "$BATS_TEST_TMPDIR/objects.json" "$BATS_TEST_TMPDIR/users.json" "$now"

  [ "$status" -eq 0 ]
  [ "$output" = $'configmap/settings-2k9b7dhf5t\nsecret/secrets-b5g8h2kt9d' ]
}
