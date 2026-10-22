#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# The Release workflow's steps (.github/workflows/release.yml), one command each. The functions under Deciding take
# plain inputs and print a verdict; those under Doing call gh, aws, docker, kustomize, and kubectl.

readonly SERVERS=(main-server socket-server worker-server match-server admin)
readonly PARAMETER_PATH=/snunow/production
readonly NAMESPACE=snunow
REPOSITORY_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
readonly REPOSITORY_ROOT
readonly TARGETS='main-server|socket-server|worker-server|match-server|admin|all'
readonly RELEASE_REF="^refs/tags/snunow/($TARGETS)/[0-9]{2}\\.(0[1-9]|1[0-2])\\.(0[1-9]|[12][0-9]|3[01])-[1-9][0-9]*\$"

# --- Deciding -----------------------------------------------------------------------------------------------------

# Prints the job outputs for a Release's ref: the servers it deploys, as a JSON array, and the images' Release tag.
check_name() {
  local ref=$1 servers
  if [[ ! "$ref" =~ $RELEASE_REF ]]; then
    echo "name: $ref is not a Release tag (refs/tags/snunow/<target>/YY.MM.DD-N)" >&2
    return 1
  fi
  if [[ "${BASH_REMATCH[1]}" == all ]]; then servers=("${SERVERS[@]}"); else servers=("${BASH_REMATCH[1]}"); fi
  local name=${ref#refs/tags/snunow/}
  echo "servers=$(jq --compact-output --null-input '$ARGS.positional' --args "${servers[@]}")"
  echo "image-tag=${name//\//-}"
}

# Prints `name<TAB>status<TAB>conclusion` for each job of a CI run, given the run's status and GitHub's jobs answer on
# stdin. A run that has not finished but lists no jobs yet prints `*<TAB>status`, since it will run every job.
jobs_from_json() {
  jq -r --arg run_status "$1" '
    if (.jobs | length) == 0 and $run_status != "completed" then ["*", $run_status]
    else .jobs[] | [.name, .status, .conclusion // ""] end | @tsv'
}

# Prints `name<TAB>outcome` for each CI job, given the jobs of every CI run of the commit as jobs_from_json prints them.
# The Dev Server's deploy script (infra/deploy/deploy.sh) reads its checks the same way: a commit pushed to a branch and
# tagged has a CI run for each push, and one success among them is enough. A run cancelled by a newer push to its
# branch (ci.yml's concurrency) may be run again, so it is waited for, not failed.
summarize_jobs() {
  awk -F '\t' '
    NF == 0 { next }
    $1 == "*" { listing = $2; next }
    { seen[$1] = 1 }
    $3 == "success" { success[$1] = 1 }
    $2 != "completed" && !($1 in unsettled) { unsettled[$1] = $2 }
    $3 ~ /^(cancelled|stale|action_required)$/ && !($1 in unsettled) { unsettled[$1] = $3 }
    $2 == "completed" && $3 != "success" && !($1 in failed) { failed[$1] = $3 }
    END {
      for (n in seen) {
        if (n in success) outcome = "success"
        else if (n in unsettled) outcome = unsettled[n]
        else if (listing != "") outcome = listing
        else outcome = failed[n]
        print n "\t" outcome
      }
      if (length(seen) == 0) print "ci\t" (listing != "" ? listing : "missing")
    }' | LC_ALL=C sort
}

# Prints pass, waiting, or fail, given the CI jobs as summarize_jobs prints them.
judge_jobs() {
  awk -F '\t' '
    $2 == "success" { next }
    $2 ~ /^(missing|queued|in_progress|requested|waiting|pending|cancelled|stale|action_required)$/ {
      waiting = 1
      next
    }
    { failed = 1 }
    END { print failed ? "fail" : waiting ? "waiting" : "pass" }'
}

# Prints a parameter's value from Parameter Store's answer in $parameters, or fails naming it.
parameter() {
  local value
  value=$(jq -r --arg name "$PARAMETER_PATH/$1" 'first(.Parameters[] | select(.Name == $name) | .Value) // empty' \
    <<<"$parameters")
  if [[ -z "$value" ]]; then
    echo "secrets: $PARAMETER_PATH/$1 is not in Parameter Store" >&2
    return 1
  fi
  printf '%s' "$value"
}

# A value for the env file, which holds one line per value.
line_parameter() {
  local value
  value=$(parameter "$1") || return 1
  if [[ "$value" == *$'\n'* ]]; then
    echo "secrets: $PARAMETER_PATH/$1 holds more than one line" >&2
    return 1
  fi
  printf '%s' "$value"
}

# A key, which Node reads only as PEM with real line breaks.
pem_parameter() {
  local value
  value=$(parameter "$1") || return 1
  if [[ "$value" != *$'\n'* ]]; then
    echo "secrets: $PARAMETER_PATH/$1 is not stored as PEM with real line breaks" >&2
    return 1
  fi
  printf '%s\n' "$value"
}

database_url() {
  local user=$1 password
  password=$(line_parameter "$user-db-password") || return 1
  password=$(jq -rn --arg password "$password" '$password | @uri')
  printf 'postgresql://%s:%s@%s:5432/%s?sslmode=verify-full' "$user" "$password" "$endpoint" "$user"
}

# Prints kind/name of each generated ConfigMap and Secret to delete, given `kubectl get configmaps,secrets -o json`,
# then `kubectl get deployments,pods -o json` taken after it, and the time now in seconds. The generators name them
# settings-<hash> and secrets-<hash>, so a Secret made by hand never matches. One stays while a Deployment's pod
# template or a pod names it, and for 10 minutes after it was created: a Release running at the same time applies the
# objects before the Deployment that names them.
unused_generated() {
  jq -r --slurpfile users "$2" --argjson now "$3" '
    ([$users[0].items[] | (.spec.template.spec // .spec) | .. | strings] | unique) as $named |
    .items[] |
    select((.kind == "ConfigMap" and (.metadata.name | test("^settings-[a-z0-9]{10}$"))) or
      (.kind == "Secret" and (.metadata.name | test("^secrets-[a-z0-9]{10}$")))) |
    select(.metadata.name | IN($named[]) | not) |
    select((.metadata.creationTimestamp | fromdateiso8601) <= $now - 600) |
    "\(.kind | ascii_downcase)/\(.metadata.name)"' "$1"
}

# --- Doing --------------------------------------------------------------------------------------------------------

# Prints the jobs of every CI run of the commit, as jobs_from_json prints them. GitHub may list the run of the tag's own
# push a little after the Release starts, so until it does, that run counts as one that will run every job.
read_ci_jobs() {
  local repository=$1 commit=$2 tag=$3 runs id run_status jobs
  runs=$(gh api "repos/$repository/actions/workflows/ci.yml/runs?head_sha=$commit&per_page=100") || return 1
  jq -e --arg tag "$tag" 'any(.workflow_runs[]; .head_branch == $tag)' <<<"$runs" >/dev/null || printf '*\tmissing\n'
  while IFS=$'\t' read -r id run_status; do
    jobs=$(gh api "repos/$repository/actions/runs/$id/jobs?per_page=100") || return 1
    jobs_from_json "$run_status" <<<"$jobs"
  done < <(jq -r '.workflow_runs[] | [.id, .status] | @tsv' <<<"$runs")
}

# Waits for CI's results on the commit and fails unless every CI job has passed. It only reads them: CI runs on the
# tag's push by itself, since its `on: push` takes tags.
gate() {
  local repository=$1 commit=$2 tag=$3 lines jobs verdict
  local limit=${GATE_LIMIT_SECONDS:-2700} interval=${GATE_INTERVAL_SECONDS:-60}
  while :; do
    if lines=$(read_ci_jobs "$repository" "$commit" "$tag"); then
      jobs=$(summarize_jobs <<<"$lines")
      verdict=$(judge_jobs <<<"$jobs")
      echo "ci: $(tr '\t\n' '= ' <<<"$jobs")"
    else
      echo "ci: GitHub did not answer"
      verdict=waiting
    fi
    case $verdict in
      pass)
        echo "gate: every CI job passed"
        return 0
        ;;
      fail)
        echo "gate: CI failed on $commit; not releasing"
        return 1
        ;;
    esac
    if ((SECONDS >= limit)); then
      echo "gate: CI has not passed on $commit within $((limit / 60)) minutes; not releasing"
      return 1
    fi
    sleep "$interval"
  done
}

# Writes the three files that the shared part's secretGenerator reads, given the folder, the database's host name, and
# Parameter Store's answer to get-parameters-by-path on stdin. It prints no value.
write_secrets() {
  local folder=$1 endpoint=$2 parameters env private_key public_key
  if [[ -z "$endpoint" ]]; then
    echo "secrets: no database endpoint given" >&2
    return 1
  fi
  parameters=$(cat)
  env="MAIN_DATABASE_URL=$(database_url main)" &&
    env+=$'\n'"MATCH_DATABASE_URL=$(database_url match)" &&
    env+=$'\n'"WORKER_TOKEN=$(line_parameter worker-token)" &&
    env+=$'\n'"MATCH_SERVER_TOKEN=$(line_parameter match-server-token)" &&
    env+=$'\n'"KAKAO_REST_API_KEY=$(line_parameter kakao-rest-api-key)" &&
    env+=$'\n'"OPENROUTER_API_KEY=$(line_parameter openrouter-api-key)" &&
    env+=$'\n'"INITIAL_ADMINISTRATOR_EMAILS=$(line_parameter initial-administrator-emails)" &&
    private_key=$(pem_parameter access-token-private-key) &&
    public_key=$(pem_parameter access-token-public-key) || return 1
  (
    umask 077
    mkdir -p "$folder"
    printf '%s\n' "$env" >"$folder/secrets.env"
    printf '%s\n' "$private_key" >"$folder/access-token-private-key.pem"
    printf '%s\n' "$public_key" >"$folder/access-token-public-key.pem"
  )
  echo "secrets: wrote $folder from $PARAMETER_PATH"
}

# Builds the server's image for linux/arm64 and pushes it with the commit's and the Release's tags. When the commit's
# image is already in its repository, it gets the Release's tag the way ECR retags an image, without a build.
push_image() {
  local registry=$1 server=$2 commit=$3 release_tag=$4 found manifest media_type build_args=()
  found=$(aws ecr batch-get-image --repository-name "$server" --image-ids "imageTag=$commit" --output json \
    --accepted-media-types application/vnd.docker.distribution.manifest.v2+json \
    application/vnd.docker.distribution.manifest.list.v2+json application/vnd.oci.image.manifest.v1+json \
    application/vnd.oci.image.index.v1+json) || return 1
  manifest=$(jq -r '.images[0].imageManifest // empty' <<<"$found")
  if [[ -n "$manifest" ]]; then
    media_type=$(jq -r '.images[0].imageManifestMediaType' <<<"$found")
    echo "image: $server:$commit is already pushed; tagging it $release_tag"
    if ! aws ecr put-image --repository-name "$server" --image-tag "$release_tag" --image-manifest "$manifest" \
      --image-manifest-media-type "$media_type" --output json >/dev/null 2>"$work/put-image"; then
      grep -q ImageAlreadyExistsException "$work/put-image" || { cat "$work/put-image" >&2 && return 1; }
    fi
    return
  fi
  if [[ "$server" == admin ]]; then
    # Without the Kakao key the site still works, taking positions as numbers; without the client, no one signs in.
    if [[ -z "${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-}" ]]; then
      echo "image: NEXT_PUBLIC_GOOGLE_CLIENT_ID must be set for the admin site" >&2
      return 1
    fi
    build_args=(--build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID --build-arg NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY)
  fi
  echo "image: building $server:$commit"
  docker buildx build --platform linux/arm64 "${build_args[@]}" --tag "$registry/$server:$commit" \
    --tag "$registry/$server:$release_tag" --push "$REPOSITORY_ROOT/$server"
}

# Applies the server's target, the shared part and the server's part, with the server's image set to the commit, and
# waits for the server's Deployment. The startup probes allow 5 minutes.
deploy() {
  local registry=$1 server=$2 commit=$3 target=$REPOSITORY_ROOT/infra/production/k8s/targets/$2 attempt
  (cd "$target" && kustomize edit set image "$server=$registry/$server:$commit")
  # The jobs of an `all` Release apply the same shared objects at once: under one field manager, server-side apply
  # lets them agree, and a request that loses a race to create an object is sent again.
  for attempt in 1 2 3; do
    kubectl apply --server-side --force-conflicts --field-manager=release --kustomize "$target" && break
    ((attempt < 3)) || return 1
    sleep 5
  done
  kubectl rollout status "deployment/$server" --namespace "$NAMESPACE" --timeout=10m
}

# Deletes the generated ConfigMaps and Secrets that no pod uses any more. Only names and creation times are kept from
# the listing, so no secret value is written to disk.
clean() {
  local objects
  kubectl get configmaps,secrets --namespace "$NAMESPACE" --output json |
    jq '{items: [.items[] | {kind, metadata: (.metadata | {name, creationTimestamp})}]}' >"$work/objects.json"
  kubectl get deployments,pods --namespace "$NAMESPACE" --output json >"$work/users.json"
  mapfile -t objects < <(unused_generated "$work/objects.json" "$work/users.json" "$(date +%s)")
  if ((${#objects[@]} == 0)); then
    echo "clean: no unused settings or secrets"
    return
  fi
  kubectl delete --namespace "$NAMESPACE" --ignore-not-found "${objects[@]}"
}

main() {
  local command=$1
  shift
  # A scratch folder for the commands, global so that the trap still sees it once main has returned.
  work=$(mktemp -d)
  trap 'rm -rf "$work"' EXIT
  case $command in
    check-name) check_name "$@" ;;
    gate) gate "$@" ;;
    write-secrets) write_secrets "$@" ;;
    push-image) push_image "$@" ;;
    deploy) deploy "$@" ;;
    unused-generated) unused_generated "$@" ;;
    clean) clean ;;
    *)
      echo "usage: release.sh <command> ..." >&2
      return 2
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  set -euo pipefail
  main "$@"
fi
