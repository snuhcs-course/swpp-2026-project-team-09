#!/usr/bin/env bats
################################################################################
# AI-generated with Claude
#
# 2026-11-15  Opus 5.5   prompted by fyoon46
################################################################################

# Each test runs in a subshell of its own, so that its exports reach no other test, as meant.
# shellcheck disable=SC2030,SC2031 source-path=SCRIPTDIR

# The change-detection script: its map of paths to jobs, through the function that it exposes, and whole runs in
# throwaway repositories under $BATS_TEST_TMPDIR, an origin and a clone of it made like CI's checkout. A [[ ]] check
# ends in `|| false` because bash before 4.1, which macOS has, does not fail a test on a [[ ]] that is not its last
# command.

bats_require_minimum_version 1.5.0

KEYS=(main-server socket-server worker-server match-server admin mobile flow-tests mobile-tests app-fingerprint
  deploy-scripts release-script terraform manifests)
EVERY="${KEYS[*]}"
PACKAGES='main-server socket-server worker-server match-server admin mobile flow-tests'
APP='mobile mobile-tests app-fingerprint'

setup() {
  CHANGES="$BATS_TEST_DIRNAME/../changes.sh"
  export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
  export GIT_AUTHOR_NAME=Tester GIT_AUTHOR_EMAIL=tester@example.com
  export GIT_COMMITTER_NAME=Tester GIT_COMMITTER_EMAIL=tester@example.com
  export GITHUB_EVENT_NAME=push
  unset GITHUB_OUTPUT GITHUB_REF GITHUB_REF_NAME GITHUB_SHA
  ORIGIN=$BATS_TEST_TMPDIR/origin.git
  WORK=$BATS_TEST_TMPDIR/work
  CLONE=$BATS_TEST_TMPDIR/clone
  git -c init.defaultBranch=4.0/Main init --quiet --bare "$ORIGIN"
  git -C "$ORIGIN" config uploadpack.allowFilter true
  git -c init.defaultBranch=4.0/Main init --quiet "$WORK"
  git -C "$WORK" remote add origin "$ORIGIN"
  commit README.md mobile/App.tsx main-server/src/main.ts
  publish 4.0/Main
}

# Commits a change to each path in the working repository: a line added, the file made if missing.
commit() {
  local path
  for path in "$@"; do
    mkdir -p "$WORK/$(dirname "$path")"
    echo change >>"$WORK/$path"
    git -C "$WORK" add -- "$path"
  done
  git -C "$WORK" commit --quiet --message "Change $*"
}

# Starts a branch in the working repository, from 4.0/Main or the given commit.
branch_off() {
  git -C "$WORK" checkout --quiet -b "$1" "${2:-4.0/Main}"
}

switch_to() {
  git -C "$WORK" checkout --quiet "$1"
}

merge() {
  git -C "$WORK" merge --quiet --no-ff --no-edit "$1"
}

# Pushes the working repository's branches to the origin under their own names.
publish() {
  local branch
  for branch in "$@"; do
    git -C "$WORK" push --quiet --force origin "refs/heads/$branch:refs/heads/$branch"
  done
}

# Clones the origin as CI's checkout does, with every branch's history and no file contents until they are needed,
# checks out the branch's tip, moves into the clone and sets GitHub's variables for a push to the branch. Clone options
# given after the branch replace --filter=blob:none.
ci_checkout() {
  local branch=$1
  shift
  if (($# == 0)); then
    set -- --filter=blob:none
  fi
  cd "$BATS_TEST_TMPDIR" || return
  rm -rf "$CLONE"
  git clone --quiet --no-checkout "$@" "file://$ORIGIN" "$CLONE"
  git -C "$CLONE" checkout --quiet --detach "origin/$branch"
  export GITHUB_REF="refs/heads/$branch" GITHUB_REF_NAME="$branch"
  GITHUB_SHA=$(git -C "$CLONE" rev-parse HEAD)
  export GITHUB_SHA
  cd "$CLONE" || return
}

# Pushes a branch that changes only a document, and checks it out as CI does.
push_documents_branch() {
  branch_off "$1"
  commit docs/guide.md
  publish "$1"
  ci_checkout "$1"
}

# The jobs whose work runs on the checkout, in KEYS's order, as the script decides for each key with these extra
# variables. Fails unless each decision is exactly one run= line.
jobs_that_run() {
  local key output="$BATS_TEST_TMPDIR/output" ran=''
  for key in "${KEYS[@]}"; do
    rm -f "$output"
    env "$@" GITHUB_OUTPUT="$output" "$CHANGES" "$key" >/dev/null
    case $(cat "$output") in
      run=true) ran+=" $key" ;;
      run=false) ;;
      *) return 1 ;;
    esac
  done
  echo "${ran# }"
}

# Fails, showing both lists, unless exactly these jobs do their work, with these extra variables.
expect_jobs() {
  local expected=$1 actual
  shift
  actual=$(jobs_that_run "$@") || return
  [ "$actual" = "$expected" ] || { echo "expected: '$expected'"$'\n'"actual:   '$actual'" >&2; false; }
}

# Fails unless every job does its work, with these extra variables, and the mobile job's line gives this reason first.
expect_full_run() {
  local reason=$1
  shift
  expect_jobs "$EVERY" "$@"
  run --separate-stderr env "$@" GITHUB_OUTPUT="$BATS_TEST_TMPDIR/full-run" "$CHANGES" mobile
  [ "$status" -eq 0 ]
  [[ "$output" == "The job mobile does its work: $reason"* ]] || { echo "$output" >&2; false; }
}

# The jobs that a change to this path alone reaches through the script's map, in KEYS's order.
reached_by() {
  local key ran=''
  for key in "${KEYS[@]}"; do
    if reaches "$1" "$key"; then
      ran+=" $key"
    fi
  done
  echo "${ran# }"
}

# Fails unless a change to each further path reaches exactly these jobs.
expect_reached() {
  local expected=$1 path actual
  shift
  for path in "$@"; do
    actual=$(reached_by "$path")
    [ "$actual" = "$expected" ] || { echo "$path reaches '$actual', not '$expected'" >&2; false; }
  done
}

# Puts a git on PATH that exits with this status when an argument is this word, and runs the real git otherwise.
fake_git_failing_on() {
  if [ ! -e "$BATS_TEST_TMPDIR/bin/git" ]; then
    REAL_GIT=$(command -v git)
    export REAL_GIT PATH="$BATS_TEST_TMPDIR/bin:$PATH"
    mkdir -p "$BATS_TEST_TMPDIR/bin"
    cat >"$BATS_TEST_TMPDIR/bin/git" <<'EOF'
#!/usr/bin/env bash
for arg; do
  [[ $arg != "$FAKE_GIT_WORD" ]] || exit "$FAKE_GIT_STATUS"
done
exec "$REAL_GIT" "$@"
EOF
    chmod +x "$BATS_TEST_TMPDIR/bin/git"
  fi
  export FAKE_GIT_WORD=$1 FAKE_GIT_STATUS=$2
}

# --- The map ------------------------------------------------------------------------------------------------------

@test "CI's own files reach every job, as does a path that no rule names" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached "$EVERY" .github/workflows/ci.yml .github/ci/changes.sh .github/ci/test/changes.bats \
    .github/ci/README.md .gitignore package.json new-folder/index.ts mobileapp/index.ts infra/production/notes.txt \
    .github/workflows/other.yml .github/dependabot.yml
}

@test ".nvmrc reaches every job that sets up Node" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached "$PACKAGES mobile-tests app-fingerprint" .nvmrc
}

@test "scripts/ reaches the seven packages' checks, whose lint runs its test-level check" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached "$PACKAGES" scripts/check-test-levels.ts scripts/test/check-test-levels.integration.test.ts
}

@test "main-server's seed also reaches the app's check and tests, which read its JSON" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached 'main-server mobile flow-tests mobile-tests' main-server/seed/department-colleges.json \
    main-server/seed/README.md
}

@test "main-server's .env.example also reaches deploy-scripts, whose bootstrap tests read it" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached 'main-server flow-tests deploy-scripts' main-server/.env.example
}

@test "a server's folder, Markdown in it too, reaches that server and flow-tests" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached 'main-server flow-tests' main-server/src/main.ts main-server/test/answers/a.json main-server/README.md
  expect_reached 'socket-server flow-tests' socket-server/src/main.ts
  expect_reached 'worker-server flow-tests' worker-server/test/pages/notice.html
  expect_reached 'match-server flow-tests' match-server/prisma/schema.prisma
}

@test "admin/ reaches admin, and mobile/ the app's check, tests and fingerprint, Markdown in them too" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached admin admin/src/app/page.tsx admin/README.md
  expect_reached "$APP" mobile/app.json mobile/__tests__/map.unit.test.tsx mobile/README.md
}

@test "flow-tests/, the compose files and infra/proxy/ reach flow-tests" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached flow-tests flow-tests/test/stack.ts flow-tests/README.md compose.yaml compose.deploy.yaml \
    infra/proxy/Caddyfile
}

@test "infra/postgres/ reaches the servers' tests that build the database's image, and flow-tests" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached 'main-server match-server flow-tests' infra/postgres/Dockerfile
}

@test "the Dev Server's scripts, Production's Terraform and Production's manifests each reach their own job" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached deploy-scripts infra/deploy/deploy.sh infra/deploy/README.md
  expect_reached terraform infra/production/terraform/main.tf
  expect_reached manifests infra/production/k8s/base/kustomization.yaml
}

@test "the Release script reaches release-script and app-fingerprint, and the Release workflow release-script" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached 'app-fingerprint release-script' .github/release/release.sh .github/release/test/release.bats
  expect_reached release-script .github/workflows/release.yml
}

@test "notes, documents, agent settings and Markdown outside the packages reach no job" {
  # shellcheck source=../changes.sh
  source "$CHANGES"
  expect_reached '' .scratch/iteration-4/plan.txt docs/adr/figure.png .claude/settings.json .agents/skills \
    .github/CODEOWNERS .github/pull_request_template.md README.md GLOSSARY.md docs/README.md infra/production/README.md
}

# --- The output ---------------------------------------------------------------------------------------------------

@test "a skip appends exactly one run=false after what GITHUB_OUTPUT held, prints one notice and exits 0" {
  local base
  push_documents_branch 4.0/documents
  base=$(git rev-parse origin/4.0/Main)
  expect_jobs ''
  echo earlier=1 >"$BATS_TEST_TMPDIR/output"

  run --separate-stderr env GITHUB_OUTPUT="$BATS_TEST_TMPDIR/output" "$CHANGES" mobile

  [ "$status" -eq 0 ]
  [ "$(cat "$BATS_TEST_TMPDIR/output")" = $'earlier=1\nrun=false' ]
  [ "$output" = "::notice::The job mobile skips its work: 4.0/documents changes 1 path since it left origin/4.0/Main at \
${base:0:7}, and none reaches it" ]
}

@test "a run appends exactly one run=true and prints one plain line that says why" {
  local base
  branch_off 4.0/app
  commit mobile/App.tsx docs/guide.md
  publish 4.0/app
  ci_checkout 4.0/app
  base=$(git rev-parse origin/4.0/Main)

  run --separate-stderr env GITHUB_OUTPUT="$BATS_TEST_TMPDIR/output" "$CHANGES" mobile-tests

  [ "$status" -eq 0 ]
  [ "$(cat "$BATS_TEST_TMPDIR/output")" = run=true ]
  [ "$output" = "The job mobile-tests does its work: mobile/App.tsx reaches it; 4.0/app changes 2 paths since it left \
origin/4.0/Main at ${base:0:7}" ]
}

@test "without GITHUB_OUTPUT, the decision is printed as run= after the line that says why" {
  branch_off 4.0/app
  commit mobile/App.tsx
  publish 4.0/app
  ci_checkout 4.0/app

  run --separate-stderr "$CHANGES" admin
  [ "$status" -eq 0 ]
  [ "${#lines[@]}" -eq 2 ]
  [[ "${lines[0]}" == '::notice::The job admin skips its work: '* ]] || false
  [ "${lines[1]}" = run=false ]

  run --separate-stderr "$CHANGES" mobile
  [ "$status" -eq 0 ]
  [ "${#lines[@]}" -eq 2 ]
  [[ "${lines[0]}" == 'The job mobile does its work: mobile/App.tsx reaches it; '* ]] || false
  [ "${lines[1]}" = run=true ]
}

@test "an unwritable GITHUB_OUTPUT still exits 0, and the line says that the job does its work" {
  push_documents_branch 4.0/documents

  run --separate-stderr env GITHUB_OUTPUT="$BATS_TEST_TMPDIR/missing/output" "$CHANGES" mobile

  [ "$status" -eq 0 ]
  [ "${#lines[@]}" -eq 1 ]
  [[ "$output" == 'The job mobile does its work: '*'; GITHUB_OUTPUT cannot be written, so the step sets no output' ]] ||
    false
}

@test "a failure after the decision was recorded adds no second run= line, and the script still exits 0" {
  local code=0
  push_documents_branch 4.0/documents

  GITHUB_OUTPUT="$BATS_TEST_TMPDIR/output" "$CHANGES" mobile >&- 2>/dev/null || code=$?

  [ "$code" -eq 0 ]
  [ "$(cat "$BATS_TEST_TMPDIR/output")" = run=false ]
}

@test "a % or a line break in a branch or a path is escaped, so that the decision stays one line" {
  push_documents_branch 4.0/documents-100%
  run --separate-stderr env GITHUB_OUTPUT="$BATS_TEST_TMPDIR/output" "$CHANGES" mobile
  [ "$status" -eq 0 ]
  [ "${#lines[@]}" -eq 1 ]
  [[ "$output" == '::notice::The job mobile skips its work: 4.0/documents-100%25 changes 1 path '* ]] || false

  branch_off 4.0/odd-name
  commit $'odd\r\n::error::name'
  publish 4.0/odd-name
  ci_checkout 4.0/odd-name
  run --separate-stderr env GITHUB_OUTPUT="$BATS_TEST_TMPDIR/odd-output" "$CHANGES" mobile
  [ "$status" -eq 0 ]
  [ "${#lines[@]}" -eq 1 ]
  [[ "$output" == 'The job mobile does its work: no rule names odd%0D%0A::error::name; '* ]] || false
}

# --- Branches and their history -----------------------------------------------------------------------------------

@test "Main's changes after a branch left it do not count for the branch" {
  branch_off 4.0/admin
  commit admin/src/page.tsx
  switch_to 4.0/Main
  commit mobile/App.tsx
  publish 4.0/Main 4.0/admin
  ci_checkout 4.0/admin
  expect_jobs admin
}

@test "a branch that took Main in by a merge counts only its own changes" {
  branch_off 4.0/admin
  commit admin/src/page.tsx
  switch_to 4.0/Main
  commit mobile/App.tsx
  switch_to 4.0/admin
  merge 4.0/Main
  switch_to 4.0/Main
  commit infra/production/terraform/main.tf
  publish 4.0/Main 4.0/admin
  ci_checkout 4.0/admin
  expect_jobs admin
}

@test "a branch stacked on another counts both branches' changes" {
  branch_off 4.0/first
  commit admin/src/page.tsx
  branch_off 4.0/second 4.0/first
  commit infra/production/terraform/main.tf
  publish 4.0/first 4.0/second
  ci_checkout 4.0/second
  expect_jobs 'admin terraform'
}

@test "with two merge bases, a path changed from either one counts" {
  local admin terraform
  branch_off 4.0/cross
  commit admin/src/page.tsx
  admin=$(git -C "$WORK" rev-parse HEAD)
  switch_to 4.0/Main
  commit infra/production/terraform/main.tf
  terraform=$(git -C "$WORK" rev-parse HEAD)
  merge "$admin"
  switch_to 4.0/cross
  merge "$terraform"
  commit docs/guide.md
  publish 4.0/Main 4.0/cross
  ci_checkout 4.0/cross

  [ "$(git merge-base --all origin/4.0/Main HEAD | grep -c .)" -eq 2 ]
  expect_jobs 'admin terraform'
}

@test "a file moved out of a folder still reaches that folder's jobs" {
  branch_off 4.0/move
  mkdir "$WORK/docs"
  git -C "$WORK" mv mobile/App.tsx docs/App.tsx
  git -C "$WORK" commit --quiet --message 'Move the app'
  publish 4.0/move
  ci_checkout 4.0/move
  expect_jobs "$APP"
}

@test "a path with a space or a Korean name is matched by its real folder" {
  branch_off 4.0/space
  commit 'mobile/assets/map icon.png'
  publish 4.0/space
  ci_checkout 4.0/space
  expect_jobs "$APP"

  branch_off 4.0/korean
  commit admin/public/지도.png
  publish 4.0/korean
  ci_checkout 4.0/korean
  expect_jobs admin
}

@test "the .agents symlink to the shared skills reaches no job" {
  branch_off 4.0/skills
  mkdir "$WORK/.agents"
  ln -s ../.claude/skills "$WORK/.agents/skills"
  git -C "$WORK" add .agents/skills
  git -C "$WORK" commit --quiet --message 'Share the skills'
  publish 4.0/skills
  ci_checkout 4.0/skills

  [ "$(git ls-tree origin/4.0/skills .agents/skills | cut -c 1-6)" = 120000 ]
  expect_jobs ''
}

@test "a blobless clone made like CI's gives the same decisions as a full clone" {
  local blobless full
  branch_off 4.0/mixed
  commit mobile/App.tsx docs/guide.md
  publish 4.0/mixed

  ci_checkout 4.0/mixed
  [ "$(git config remote.origin.partialclonefilter)" = blob:none ]
  blobless=$(jobs_that_run)
  ci_checkout 4.0/mixed --no-filter
  [ -z "$(git config remote.origin.partialclonefilter)" ]
  full=$(jobs_that_run)

  [ "$blobless" = "$full" ]
  [ "$full" = "$APP" ]
}

@test "a branch of any line is compared with that line's Main, so ci-trial/<name> with ci-trial/Main" {
  git -C "$WORK" branch ci-trial/Main 4.0/Main
  branch_off ci-trial/notes ci-trial/Main
  commit .scratch/notes.txt
  publish ci-trial/Main ci-trial/notes
  ci_checkout ci-trial/notes
  expect_jobs ''
}

# --- Full runs ----------------------------------------------------------------------------------------------------

@test "a run that a push did not start runs every job" {
  push_documents_branch 4.0/documents
  expect_full_run 'the run was started by workflow_dispatch, not by a push' GITHUB_EVENT_NAME=workflow_dispatch
}

@test "a ref that is not a branch, such as a Release tag, runs every job" {
  push_documents_branch 4.0/documents
  expect_full_run 'refs/tags/snunow/all/26.11.15-1 is not a branch' GITHUB_REF=refs/tags/snunow/all/26.11.15-1 \
    GITHUB_REF_NAME=snunow/all/26.11.15-1
}

@test "a GITHUB_REF_NAME that does not name GITHUB_REF runs every job" {
  push_documents_branch 4.0/documents
  expect_full_run 'GITHUB_REF_NAME (4.0/other) does not name refs/heads/4.0/documents' GITHUB_REF_NAME=4.0/other
}

@test "a branch name without a slash runs every job" {
  push_documents_branch development
  expect_full_run 'development is not named <line>/<name>'
}

@test "a Main runs every job, whatever its line" {
  ci_checkout 4.0/Main
  expect_full_run '4.0/Main is a Main'

  git -C "$WORK" branch ci-trial/Main 4.0/Main
  publish ci-trial/Main
  ci_checkout ci-trial/Main
  expect_full_run 'ci-trial/Main is a Main'
}

@test "a branch whose Main is missing runs every job" {
  push_documents_branch 9.0/documents
  expect_full_run 'origin/9.0/Main is missing or is not a commit'
}

@test "a branch whose Main is not a commit runs every job" {
  push_documents_branch 4.0/documents
  git update-ref refs/remotes/origin/4.0/Main "$(git rev-parse 'HEAD^{tree}')"
  expect_full_run 'origin/4.0/Main is missing or is not a commit'
}

@test "a commit already on Main runs every job, even pushed on a working branch" {
  commit docs/guide.md
  publish 4.0/Main
  git -C "$WORK" branch 4.0/at-tip 4.0/Main
  git -C "$WORK" branch 4.0/behind '4.0/Main~1'
  publish 4.0/at-tip 4.0/behind

  ci_checkout 4.0/at-tip
  expect_full_run 'the commit is already on origin/4.0/Main'
  ci_checkout 4.0/behind
  expect_full_run 'the commit is already on origin/4.0/Main'
}

@test "a commit already on another line's Main, on development or on main runs every job" {
  branch_off 5.0/Main
  commit admin/next.ts
  publish 5.0/Main
  git -C "$WORK" branch 4.0/late 5.0/Main
  publish 4.0/late
  ci_checkout 4.0/late
  expect_full_run 'the commit is already on origin/5.0/Main'

  push_documents_branch 4.0/deployed
  git -C "$WORK" branch development 4.0/deployed
  publish development
  ci_checkout 4.0/deployed
  expect_full_run 'the commit is already on origin/development'

  # Another path than 4.0/deployed's, or both commits could be one when made within the same second.
  branch_off 4.0/old
  commit docs/old.md
  publish 4.0/old
  git -C "$WORK" branch main 4.0/old
  publish main
  ci_checkout 4.0/old
  expect_full_run 'the commit is already on origin/main'
}

@test "a branch that shares no history with Main runs every job" {
  git -C "$WORK" checkout --quiet --orphan 4.0/orphan
  commit docs/guide.md
  publish 4.0/orphan
  ci_checkout 4.0/orphan
  expect_full_run 'the commit shares no history with origin/4.0/Main'
}

@test "a change to ci.yml runs every job" {
  branch_off 4.0/ci
  commit .github/workflows/ci.yml docs/guide.md
  publish 4.0/ci
  ci_checkout 4.0/ci
  expect_full_run '.github/workflows/ci.yml is part of CI itself; '
}

@test "a change under .github/ci/ runs every job" {
  branch_off 4.0/ci
  commit .github/ci/test/changes.bats docs/guide.md
  publish 4.0/ci
  ci_checkout 4.0/ci
  expect_full_run '.github/ci/test/changes.bats is part of CI itself; '
}

@test "a changed path that no rule names runs every job" {
  branch_off 4.0/ignore
  commit .gitignore docs/guide.md
  publish 4.0/ignore
  ci_checkout 4.0/ignore
  expect_full_run 'no rule names .gitignore; '
}

@test "an unknown job key, or none, runs the job" {
  local key
  push_documents_branch 4.0/documents
  for key in mobile-test 'mobile flow-tests' MOBILE; do
    rm -f "$BATS_TEST_TMPDIR/output"
    run --separate-stderr env GITHUB_OUTPUT="$BATS_TEST_TMPDIR/output" "$CHANGES" "$key"
    [ "$status" -eq 0 ]
    [ "$(cat "$BATS_TEST_TMPDIR/output")" = run=true ]
    [ "$output" = "The job $key does its work: $key is not a job key that this script knows" ]
  done

  rm "$BATS_TEST_TMPDIR/output"
  run --separate-stderr env GITHUB_OUTPUT="$BATS_TEST_TMPDIR/output" "$CHANGES"
  [ "$status" -eq 0 ]
  [ "$(cat "$BATS_TEST_TMPDIR/output")" = run=true ]
  [ "$output" = 'The job without a key does its work: no job key was given' ]
}

@test "git failing for for-each-ref --contains, for merge-base --all or for diff runs every job" {
  push_documents_branch 4.0/documents

  fake_git_failing_on --contains 129
  expect_full_run 'git could not tell which branches hold the commit'
  fake_git_failing_on --all 128
  expect_full_run 'git could not find where 4.0/documents left origin/4.0/Main'
  fake_git_failing_on diff 128
  expect_full_run 'git could not list the paths changed from '
  fake_git_failing_on rev-parse 128
  expect_full_run 'the checkout is shallow, or git cannot read it'
}

@test "git missing from PATH, or a pushed commit that git cannot read, runs every job" {
  push_documents_branch 4.0/documents
  mkdir "$BATS_TEST_TMPDIR/no-git"
  ln -s "$(command -v bash)" "$BATS_TEST_TMPDIR/no-git/bash"

  expect_full_run 'the checkout is shallow, or git cannot read it' PATH="$BATS_TEST_TMPDIR/no-git"
  expect_full_run 'the pushed commit 0123456789abcdef0123456789abcdef01234567 cannot be read' \
    GITHUB_SHA=0123456789abcdef0123456789abcdef01234567
}

@test "a shallow checkout runs every job" {
  branch_off 4.0/documents
  commit docs/guide.md
  publish 4.0/documents
  ci_checkout 4.0/documents --depth=1 --no-single-branch
  expect_full_run 'the checkout is shallow, or git cannot read it'
}

@test "a failure inside the script runs the job, and the script still exits 0" {
  push_documents_branch 4.0/documents
  mkdir "$BATS_TEST_TMPDIR/bin"
  printf '#!/bin/sh\nexit 1\n' >"$BATS_TEST_TMPDIR/bin/mktemp"
  chmod +x "$BATS_TEST_TMPDIR/bin/mktemp"

  expect_full_run 'the script stopped before it decided' PATH="$BATS_TEST_TMPDIR/bin:$PATH"
}
