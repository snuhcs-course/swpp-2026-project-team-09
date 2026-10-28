#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
# 2026-10-28  Opus 5.5   prompted by AhnJinYoung
################################################################################

# The Release workflow's steps (.github/workflows/release.yml), one command each. The functions under Deciding take
# plain inputs and print a verdict; those under Doing call gh, aws, docker, kustomize, kubectl, and the app's tools. The
# app's job builds and attaches its APK from the workflow itself; its decision, its checks of the APK and of the
# published updates, and its new app-version.json are here.

readonly SERVERS=(main-server socket-server worker-server match-server admin)
readonly PARAMETER_PATH=/snunow/production
readonly NAMESPACE=snunow
# The SHA-256 digest of the Expo template's debug key, which signs every APK, so that a new one installs over the old.
readonly APK_SIGNER=fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c
REPOSITORY_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
readonly REPOSITORY_ROOT
readonly TARGETS='main-server|socket-server|worker-server|match-server|admin|app|all'
readonly RELEASE_REF="^refs/tags/snunow/($TARGETS)/[0-9]{2}\\.(0[1-9]|1[0-2])\\.(0[1-9]|[12][0-9]|3[01])-[1-9][0-9]*\$"

# --- Deciding -----------------------------------------------------------------------------------------------------

# Prints the job outputs for a Release's ref: the servers it deploys, as a JSON array, whether it publishes the app's
# bundle, and the images' Release tag. `all` is the five servers and the app; `app` deploys no server.
check_name() {
  local ref=$1 servers=() app=false
  if [[ ! "$ref" =~ $RELEASE_REF ]]; then
    echo "name: $ref is not a Release tag (refs/tags/snunow/<target>/YY.MM.DD-N)" >&2
    return 1
  fi
  case ${BASH_REMATCH[1]} in
    all) servers=("${SERVERS[@]}") app=true ;;
    app) app=true ;;
    *) servers=("${BASH_REMATCH[1]}") ;;
  esac
  local name=${ref#refs/tags/snunow/}
  echo "servers=$(jq --compact-output --null-input '$ARGS.positional' --args "${servers[@]}")"
  echo "app=$app"
  echo "image-tag=${name//\//-}"
}

# Whether version $1 is lower than, equal to, or higher than $2, as -1, 0, or 1. Both are x.y.z.
compare_versions() {
  local a b i
  IFS=. read -r -a a <<<"$1"
  IFS=. read -r -a b <<<"$2"
  for i in 0 1 2; do
    if ((10#${a[i]} < 10#${b[i]})); then
      echo -1
      return
    elif ((10#${a[i]} > 10#${b[i]})); then
      echo 1
      return
    fi
  done
  echo 0
}

# Prints publish or publish-needs-build, given the app's Android and iOS fingerprints, its `version`, and the path of
# app-version.json, which describes the latest native build. An update reaches only the builds whose fingerprint is its
# own: when the native part changed, it goes out only with a raised `version`, for the native build that is still to be
# made (publish-needs-build). Otherwise it fails. The reason goes to stderr, the verdict alone to stdout.
app_decision() {
  local android=$1 ios=$2 version=$3 file=$4 latest built_android built_ios
  local semver='^[0-9]+\.[0-9]+\.[0-9]+$'
  if ! latest=$(jq -er '.latest | strings' "$file" 2>/dev/null) ||
    ! built_android=$(jq -er '.fingerprint.android | strings' "$file" 2>/dev/null) ||
    ! built_ios=$(jq -er '.fingerprint.ios | strings' "$file" 2>/dev/null) || [[ ! "$latest" =~ $semver ]]; then
    echo "app: $file is missing or unreadable; it must give latest as x.y.z and fingerprint.android and .ios" >&2
    return 1
  fi
  if [[ ! "$version" =~ $semver || -z "$android" || -z "$ios" ]]; then
    echo "app: the app's version ($version) must be x.y.z, and both fingerprints must be given" >&2
    return 1
  fi
  if [[ "$android" == "$built_android" && "$ios" == "$built_ios" ]]; then
    echo "app: the native part is the latest native build's ($latest)" >&2
    echo publish
    return
  fi
  case $(compare_versions "$version" "$latest") in
    1)
      echo "app: the native part changed and version $version is above the latest native build's $latest" >&2
      echo publish-needs-build
      ;;
    *)
      echo "app: the native part changed since the latest native build ($latest), but version is $version; raise" \
        "version in mobile/app.json and make a native Release" >&2
      return 1
      ;;
  esac
}

# Prints publish or skip, given the workflow's event and GitHub's comparison of the latest published update's commit
# with this run's (behind, ahead, identical, diverged, or empty when there is none to compare). A pushed tag whose
# commit is behind the published one is an older Release whose server jobs finished late: it skips, so as not to put an
# older bundle over a newer one. A run by hand is a deliberate rollback and always publishes.
app_order() {
  local event=$1 status=$2
  if [[ "$event" == push && "$status" == behind ]]; then
    echo "app: a newer commit's bundle is already published; this older Release does not publish its own" >&2
    echo skip
    return
  fi
  case $event:$status in
    push:) echo "app: no earlier update to compare with" >&2 ;;
    push:*) echo "app: this commit is $status of the published update's" >&2 ;;
    *) echo "app: a run by hand always publishes" >&2 ;;
  esac
  echo publish
}

# Checks the updates that `eas update --json` printed, given on stdin, against the Android and iOS fingerprints the
# decision computed: each platform must have been published, under its fingerprint as its runtime version.
check_published() {
  local -A expected=([android]=$1 [ios]=$2)
  local updates platform published
  updates=$(cat)
  for platform in android ios; do
    if ! published=$(jq -er --arg platform "$platform" \
      '[.[] | select(.platform == $platform) | .runtimeVersion] | if length == 1 then .[0] | strings else empty end' \
      <<<"$updates" 2>/dev/null); then
      echo "app: eas update did not report exactly one $platform update" >&2
      return 1
    fi
    if [[ "$published" != "${expected[$platform]}" ]]; then
      echo "app: the $platform update went out for runtime version $published, but its fingerprint is" \
        "${expected[$platform]}" >&2
      return 1
    fi
  done
  echo "app: published for android $1 and ios $2" >&2
}

# Checks a built APK, given the Android fingerprint the decision computed, the fingerprint embedded in the APK
# (assets/fingerprint), and `apksigner verify --print-certs`'s output on stdin: the APK must carry the computed
# fingerprint, and its one signer must be the shared debug key.
check_apk() {
  local computed=$1 embedded=$2 signers
  if [[ -z "$computed" || "$embedded" != "$computed" ]]; then
    echo "app: the APK embeds the fingerprint '$embedded', but the computed one is '$computed'" >&2
    return 1
  fi
  signers=$(sed -n 's/^Signer #[0-9]* certificate SHA-256 digest: *//p')
  if [[ "$signers" != "$APK_SIGNER" ]]; then
    echo "app: the APK is signed by '${signers//$'\n'/ }', not the shared debug key $APK_SIGNER" >&2
    return 1
  fi
  echo "app: the APK embeds $embedded and is signed by the shared debug key" >&2
}

# Prints the new app-version.json for a native build, given its version, its Android and iOS fingerprints, the APK's
# address, and the path of the old app-version.json, whose `minimum` it keeps. iOS has no download until iOS builds
# are distributed.
app_version_json() {
  local version=$1 android=$2 ios=$3 url=$4 file=$5 minimum
  if ! minimum=$(jq -er '.minimum | strings' "$file" 2>/dev/null); then
    echo "app: $file is missing or unreadable; it must give minimum" >&2
    return 1
  fi
  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ || -z "$android" || -z "$ios" || "$url" != https://* ]]; then
    echo "app: a new app-version.json needs version as x.y.z, both fingerprints, and the APK's https address" >&2
    return 1
  fi
  jq --null-input --arg latest "$version" --arg minimum "$minimum" --arg android "$android" --arg ios "$ios" \
    --arg url "$url" '{latest: $latest, minimum: $minimum, fingerprint: {android: $android, ios: $ios},
    download: {android: $url, ios: null}}'
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

# Prints the app's Android and iOS fingerprints, its `version`, and the decision (app_decision) as job outputs, given
# the address of app-version.json and where to save it. The fingerprints are computed in mobile/ under the build
# settings in the environment, with expo-updates' own command, so they are the runtime versions a build gets. An empty
# setting would give another fingerprint, or a bundle that calls nowhere, so each must be set.
decide_app() {
  local url=$1 file=$2 android ios version verdict name
  for name in EXPO_PUBLIC_MAIN_SERVER_URL EXPO_PUBLIC_SOCKET_SERVER_URL EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID \
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID GOOGLE_IOS_URL_SCHEME INVITE_LINK_HOST; do
    if [[ -z "${!name:-}" ]]; then
      echo "app: the repository variable for $name is not set" >&2
      return 1
    fi
  done
  cd "$REPOSITORY_ROOT/mobile"
  android=$(npx expo-updates fingerprint:generate --platform android | jq -er .hash) &&
    ios=$(npx expo-updates fingerprint:generate --platform ios | jq -er .hash) &&
    version=$(jq -er .expo.version app.json) || return 1
  echo "app: version $version, fingerprints android $android, ios $ios" >&2
  curl --fail --silent --show-error --location --output "$file" "$url" || echo "app: $url could not be downloaded" >&2
  verdict=$(app_decision "$android" "$ios" "$version" "$file") || return 1
  printf 'android=%s\nios=%s\nversion=%s\nverdict=%s\n' "$android" "$ios" "$version" "$verdict"
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
    app-decision) app_decision "$@" ;;
    app-order) app_order "$@" ;;
    check-published) check_published "$@" ;;
    check-apk) check_apk "$@" ;;
    app-version-json) app_version_json "$@" ;;
    decide-app) decide_app "$@" ;;
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
