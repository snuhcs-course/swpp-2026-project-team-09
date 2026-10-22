#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# Renders each target with stand-in secrets, as a Release would, and checks the objects that the cluster would receive.
# Needs kubectl, jq, and rsync, and reaches no cluster.
set -euo pipefail

k8s=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export KUBECONFIG=/dev/null

servers=(main-server socket-server worker-server match-server admin)
targets=("${servers[@]}" all)
failures=0

check() {
  local name=$1
  shift
  if "$@"; then
    echo "ok: $name"
  else
    echo "not ok: $name"
    failures=$((failures + 1))
  fi
}

servers_of() {
  if [[ $1 == all ]]; then printf '%s\n' "${servers[@]}"; else echo "$1"; fi
}

# A copy of the manifests without any real secrets, with stand-ins where the Release workflow writes them.
copy_manifests() {
  mkdir -p "$1"
  rsync -a --exclude secrets/ "$k8s/" "$1/"
  local secrets=$1/parts/shared/secrets
  mkdir -p "$secrets"
  cat >"$secrets/secrets.env" <<'EOF'
MAIN_DATABASE_URL=postgresql://main:stand-in@database.example:5432/main?sslmode=verify-full
MATCH_DATABASE_URL=postgresql://match:stand-in@database.example:5432/match?sslmode=verify-full
WORKER_TOKEN=stand-in
MATCH_SERVER_TOKEN=stand-in
KAKAO_REST_API_KEY=stand-in
OPENROUTER_API_KEY=stand-in
INITIAL_ADMINISTRATOR_EMAILS=stand-in@example.com
EOF
  echo stand-in >"$secrets/access-token-private-key.pem"
  echo stand-in >"$secrets/access-token-public-key.pem"
}

# The render as a JSON array. An empty local patch makes kubectl print the objects unchanged, as JSON.
render() {
  kubectl kustomize "$1" |
    kubectl patch --local --type merge --patch '{}' --filename - --output json |
    jq --slurp .
}

renders() {
  render "$work/plain/targets/$1" >"$work/$1.json"
}

# Kind/name of each object, with the generators' content hash shown as HASH.
holds_shared_and_own_objects() {
  local expected=(ConfigMap/settings-HASH Secret/secrets-HASH Ingress/api Ingress/admin Deployment/redis Service/redis)
  local server
  for server in $(servers_of "$1"); do expected+=("Deployment/$server" "Service/$server"); done
  diff <(printf '%s\n' "${expected[@]}" | sort) \
    <(jq -r '.[] | "\(.kind)/\(.metadata.name)" |
      sub("^(?<id>ConfigMap/settings|Secret/secrets)-[a-z0-9]{10}$"; "\(.id)-HASH")' "$work/$1.json" | sort)
}

# Each image set in the target's kustomization, as `kustomize edit set image <server>=<registry>/<server>:<tag>` sets it.
sets_own_images() {
  local kustomization=$work/images/targets/$1/kustomization.yaml server
  {
    echo images:
    for server in $(servers_of "$1"); do
      printf -- '  - name: %s\n    newName: registry.example/%s\n    newTag: 0123abc\n' "$server" "$server"
    done
  } >>"$kustomization"
  diff <({
    for server in $(servers_of "$1"); do echo "$server registry.example/$server:0123abc"; done
    echo 'redis redis:8'
  } | sort) \
    <(render "$(dirname "$kustomization")" |
      jq -r '.[] | select(.kind == "Deployment") | .metadata.name as $deployment |
        .spec.template.spec.containers[] | "\($deployment) \(.image)"' | sort)
}

# The ConfigMap's and the Secret's names, and every name the containers refer to, as "kind name" lines.
generated_names() {
  jq -r '(.[] | select(.kind == "ConfigMap" or .kind == "Secret") | "\(.kind) \(.metadata.name)"),
    (.. | .configMapKeyRef? // empty | "ConfigMap \(.name)"),
    (.. | .secretKeyRef? // empty | "Secret \(.name)")' "$work/$1.json" | sort -u
}

refers_only_to_own_generated_objects() {
  [[ $(generated_names "$1" | wc -l) -eq 2 ]]
}

names_generated_objects_as_all_does() {
  diff <(generated_names all) <(generated_names "$1")
}

# The deploy role's rights stop at the namespace.
holds_only_objects_in_snunow() {
  jq -e 'all(.[]; .metadata.namespace == "snunow")' "$work/$1.json" >/dev/null
}

ignored_by_git() {
  git -C "$k8s" check-ignore --quiet "$1"
}

copy_manifests "$work/plain"
copy_manifests "$work/images"

for target in "${targets[@]}"; do
  check "$target renders" renders "$target"
done
for target in "${targets[@]}"; do
  check "$target holds the shared objects and its servers' Deployments and Services" holds_shared_and_own_objects "$target"
  check "$target sets its servers' images and leaves redis:8" sets_own_images "$target"
  check "$target refers only to its ConfigMap and its Secret" refers_only_to_own_generated_objects "$target"
  check "$target holds only objects in snunow" holds_only_objects_in_snunow "$target"
done
for target in "${servers[@]}"; do
  check "$target names its ConfigMap and Secret as all does" names_generated_objects_as_all_does "$target"
done
for file in secrets.env access-token-private-key.pem access-token-public-key.pem; do
  check "git ignores $file" ignored_by_git "parts/shared/secrets/$file"
done

if ((failures > 0)); then
  echo "$failures failed"
  exit 1
fi
