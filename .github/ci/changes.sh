#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-11-15  Opus 5.5   prompted by fyoon46
################################################################################

# Says whether a CI job (.github/workflows/ci.yml) has work on this run: run=false only when no path that the pushed
# branch changes reaches the job. A branch <line>/<name> is compared with origin/<line>/Main from all their common
# ancestors, never with the previous push, whose run may have been cancelled before it checked anything. A push to a
# Main skips the work that the merge queue's run of the same commit has already passed. Every other case, and any doubt
# or failure, gives run=true.
#
# Usage: changes.sh <job key>, from the repository root, with GitHub's GITHUB_EVENT_NAME, GITHUB_REF, GITHUB_REF_NAME,
# GITHUB_SHA and GITHUB_REPOSITORY, and GH_TOKEN for gh. It appends run=true or run=false to GITHUB_OUTPUT, or prints it when that is unset, prints one line
# that says why, and always exits 0.

JOBS=(main-server socket-server worker-server match-server admin mobile flow-tests mobile-tests app-fingerprint
  deploy-scripts release-script terraform manifests)
PACKAGE_JOBS='main-server socket-server worker-server match-server admin mobile flow-tests'
NODE_JOBS="$PACKAGE_JOBS mobile-tests app-fingerprint"

# Sets `reached` to the jobs whose work a change to the path can affect, separated by spaces, or to `every` for CI's
# own files and `unknown` for a path that no rule names, both of which reach every job. In a case pattern `*` matches
# `/` too, so a folder's rule comes before `*.md`.
reach() {
  case $1 in
    .github/workflows/ci.yml | .github/ci/*) reached=every ;;
    .nvmrc) reached=$NODE_JOBS ;;
    # Each package's lint runs ../scripts/check-test-levels.ts.
    scripts/*) reached=$PACKAGE_JOBS ;;
    # The app's tests read the seed's JSON.
    main-server/seed/*) reached='main-server flow-tests mobile mobile-tests' ;;
    # The Dev Server bootstrap's tests read it.
    main-server/.env.example) reached='main-server flow-tests deploy-scripts' ;;
    # The flow tests build the four servers' images.
    main-server/*) reached='main-server flow-tests' ;;
    socket-server/*) reached='socket-server flow-tests' ;;
    worker-server/*) reached='worker-server flow-tests' ;;
    match-server/*) reached='match-server flow-tests' ;;
    admin/*) reached='admin' ;;
    mobile/*) reached='mobile mobile-tests app-fingerprint' ;;
    flow-tests/* | compose.yaml | compose.deploy.yaml | infra/proxy/*) reached=flow-tests ;;
    # Their tests build the database's image.
    infra/postgres/*) reached='main-server match-server flow-tests' ;;
    infra/deploy/*) reached=deploy-scripts ;;
    infra/production/terraform/*) reached=terraform ;;
    infra/production/k8s/*) reached=manifests ;;
    # app-fingerprint runs the Release script's decision.
    .github/release/*) reached='release-script app-fingerprint' ;;
    .github/workflows/release.yml) reached=release-script ;;
    # Read by no job. Markdown inside a package matched its package above, whose format check reads it.
    .scratch/* | docs/* | .claude/* | .agents/* | .github/CODEOWNERS | .github/pull_request_template.md | *.md)
      reached=''
      ;;
    *) reached=unknown ;;
  esac
}

# Whether a change to the path reaches the job, saying how in `reason`.
reaches() {
  reach "$1"
  case " $reached " in
    ' every ') reason="$1 is part of CI itself" ;;
    ' unknown ') reason="no rule names $1" ;;
    *" $2 "*) reason="$1 reaches it" ;;
    *) return 1 ;;
  esac
}

# Whether a merge_group run of CI passed on the commit: 0 when one did, 1 when none did, 2 when GitHub did not answer.
# The queue moves Main to the very commit it tested, so that run is the Main commit's full run.
queue_passed() {
  local answer
  [[ -n ${GITHUB_REPOSITORY:-} && $1 =~ ^[0-9a-f]{40}$ ]] || return 2
  answer=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?head_sha=$1&event=merge_group&per_page=100") ||
    return 2
  jq -e --arg sha "$1" 'any(.workflow_runs[];
    .event == "merge_group" and .head_sha == $sha and .status == "completed" and .conclusion == "success")' \
    <<<"$answer" >/dev/null && return 0
  jq -e '.workflow_runs | type == "array"' <<<"$answer" >/dev/null && return 1
  return 2
}

# Sets `run` and `why` for the job.
decide() {
  local job=$1 known='' one branch line main main_commit sha shallow holders holder status bases base at='' path count=0
  local paths hit=''
  run=true
  if [[ -z $job ]]; then
    why='no job key was given'
    return
  fi
  for one in "${JOBS[@]}"; do
    [[ $one != "$job" ]] || known=1
  done
  if [[ -z $known ]]; then
    why="$job is not a job key that this script knows"
    return
  fi
  if [[ ${GITHUB_EVENT_NAME:-} != push ]]; then
    why="the run was started by ${GITHUB_EVENT_NAME:-an unnamed event}, not by a push"
    return
  fi
  if [[ ${GITHUB_REF:-} != refs/heads/* ]]; then
    why="${GITHUB_REF:-the unnamed ref} is not a branch"
    return
  fi
  branch=${GITHUB_REF_NAME:-}
  if [[ $GITHUB_REF != "refs/heads/$branch" ]]; then
    why="GITHUB_REF_NAME ($branch) does not name $GITHUB_REF"
    return
  fi
  line=${branch%%/*}
  if [[ $branch != */* || -z $line || -z ${branch#*/} ]]; then
    why="$branch is not named <line>/<name>"
    return
  fi
  main=origin/$line/Main
  if [[ ${branch#*/} == Main ]]; then
    queue_passed "${GITHUB_SHA:-}" && status=0 || status=$?
    case $status in
      0)
        run=false
        why="the merge queue's run of ${GITHUB_SHA:0:7} already passed every job"
        ;;
      1) why="$branch is a Main, and no merge queue run passed ${GITHUB_SHA:0:7}" ;;
      *) why="$branch is a Main, and GitHub did not say whether the merge queue passed ${GITHUB_SHA:-the commit}" ;;
    esac
    return
  fi

  # A shallow history can hide the common ancestors.
  if ! shallow=$(git rev-parse --is-shallow-repository) || [[ $shallow != false ]]; then
    why='the checkout is shallow, or git cannot read it'
    return
  fi
  if ! main_commit=$(git rev-parse --verify --quiet "refs/remotes/$main^{commit}"); then
    why="$main is missing or is not a commit"
    return
  fi
  if ! sha=$(git rev-parse --verify --quiet "${GITHUB_SHA:-}^{commit}"); then
    why="the pushed commit ${GITHUB_SHA:-(unset)} cannot be read"
    return
  fi
  # A commit already on a Main of any line, on main or on development is checked in full wherever it is pushed.
  if ! holders=$(git for-each-ref --contains "$sha" --format='%(refname)' refs/remotes/origin); then
    why='git could not tell which branches hold the commit'
    return
  fi
  while IFS= read -r holder; do
    case ${holder#refs/remotes/origin/} in
      */Main | main | development)
        why="the commit is already on ${holder#refs/remotes/}"
        return
        ;;
    esac
  done <<<"$holders"
  bases=$(git merge-base --all "$main_commit" "$sha") && status=0 || status=$?
  if ((status == 1)) && [[ -z $bases ]]; then
    why="the commit shares no history with $main"
    return
  elif ((status != 0)) || [[ -z $bases ]]; then
    why="git could not find where $branch left $main"
    return
  fi

  changed=$(mktemp)
  while IFS= read -r base; do
    at+="${at:+ and }${base:0:7}"
    # Both sides of a move, each path whole and unquoted, so that each is matched by its real folder.
    if ! git -c core.quotePath=false diff --no-renames --name-only -z "$base" "$sha" >>"$changed"; then
      why="git could not list the paths changed from $base"
      return
    fi
  done <<<"$bases"
  sort -z -u -o "$changed" "$changed"
  while IFS= read -r -d '' path; do
    count=$((count + 1))
    if [[ -z $hit ]] && reaches "$path" "$job"; then
      hit=$reason
    fi
  done <"$changed"

  paths="$count paths"
  ((count != 1)) || paths='1 path'
  if [[ -n $hit ]]; then
    why="$hit; $branch changes $paths since it left $main at $at"
  elif ((count == 0)); then
    run=false
    why="$branch changes no path since it left $main at $at"
  else
    run=false
    why="$branch changes $paths since it left $main at $at, and none reaches it"
  fi
}

# Records the decision once: run=… in GITHUB_OUTPUT, or on stdout when that is unset, after the line that says why.
record() {
  local run=$1 why=$2 text
  [[ -z $recorded ]] || return 0
  recorded=1
  if [[ -n ${GITHUB_OUTPUT:-} ]] && ! { echo "run=$run" >>"$GITHUB_OUTPUT"; } 2>/dev/null; then
    run=true
    why="$why; GITHUB_OUTPUT cannot be written, so the step sets no output"
  fi
  if [[ $run == false ]]; then
    text="The job ${job:-without a key} skips its work: $why"
  else
    text="The job ${job:-without a key} does its work: $why"
  fi
  # A path or a branch could otherwise end the line, or start a workflow command on a line of its own.
  text=${text//%/%25}
  text=${text//$'\r'/%0D}
  text=${text//$'\n'/%0A}
  if [[ $run == false ]]; then
    echo "::notice::$text"
  else
    echo "$text"
  fi
  [[ -n ${GITHUB_OUTPUT:-} ]] || echo "run=$run"
}

main() {
  job=${1:-} recorded='' changed=''
  trap 'record true "the script stopped before it decided" || true; [[ -z $changed ]] || rm -f "$changed" || true; exit 0' \
    EXIT
  decide "$job"
  record "$run" "$why"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  set -euo pipefail
  export LC_ALL=C
  main "$@"
fi
