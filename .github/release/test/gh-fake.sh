#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# Stands in for gh in the gate tests, linked as gh on PATH. Every call is appended to $FAKE_CALLS. `gh api` answers from
# $FAKE_GITHUB: runs.json for CI's runs of the commit, jobs-<run id>.json for a run's jobs. Each request for the runs
# starts a poll, and a file with the poll's number appended, such as runs.json.2, answers that poll instead. GitHub
# does not answer during the polls listed in $FAKE_GITHUB_DOWN.
set -euo pipefail

printf 'gh %s\n' "$*" >>"$FAKE_CALLS"
[[ "$1" == api ]] || exit 2
path=$2
poll=$(cat "$FAKE_GITHUB/poll" 2>/dev/null || echo 0)
case $path in
  */actions/workflows/ci.yml/runs\?*)
    poll=$((poll + 1))
    echo "$poll" >"$FAKE_GITHUB/poll"
    file=runs.json
    ;;
  */actions/runs/*/jobs*)
    id=${path#*/actions/runs/}
    file=jobs-${id%%/*}.json
    ;;
  *) exit 2 ;;
esac
if [[ " ${FAKE_GITHUB_DOWN:-} " == *" $poll "* ]]; then
  echo 'gh: HTTP 502: Bad Gateway' >&2
  exit 1
fi
[[ ! -f "$FAKE_GITHUB/$file.$poll" ]] || file=$file.$poll
cat "$FAKE_GITHUB/$file"
