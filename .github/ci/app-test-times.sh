#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-11-15  Opus 5.5   prompted by fyoon46
# 2026-11-21  Opus 5.5   prompted by fyoon46
################################################################################

# Rebuilds app-test-times.json, the app's integration test files' seconds by which app-test-sequencer.cjs packs the CI
# shards, from a finished CI run whose mobile-tests jobs did their work, one at the nightly level: each job prints an
# `app-test-time <seconds> <file>` line per test file.
#
# Usage: .github/ci/app-test-times.sh <run id>, with gh signed in. A nightly run on a Main measures best.

set -euo pipefail

run=${1:?usage: app-test-times.sh <run id>}
repository=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
table="$(dirname "$0")/app-test-times.json"

lines=$(
  gh api "repos/$repository/actions/runs/$run/jobs?per_page=100" \
    --jq '.jobs[] | select(.name | startswith("mobile-tests")) | .id' |
    while read -r job; do
      gh api --allow-escape-sequences "repos/$repository/actions/jobs/$job/logs"
    done |
    sed -n -E 's/.*app-test-time ([0-9.]+) (.+[^[:space:]])[[:space:]]*$/\1 \2/p'
)
if [[ -z "$lines" ]]; then
  echo "run $run printed no app-test-time lines" >&2
  exit 1
fi

jq --raw-input --null-input --sort-keys --indent 2 \
  '[inputs | capture("^(?<seconds>[0-9.]+) (?<file>.+)$") | {(.file): (.seconds | tonumber)}] | add' \
  <<<"$lines" >"$table.new"
mv "$table.new" "$table"
echo "$(jq length "$table") test files written to $table"
