# 02: A Release tag publishes the app's bundle

Parent: [P03 spec](../spec.md)
Status: done
Blocked by: 01

## What to build

Pushing `snunow/all/…` deploys the five servers and then, once every server has rolled out, publishes the app's bundle for Android and iOS to the `production` channel. Pushing `snunow/app/…` publishes only the bundle. The publish waits for CI on the commit, as the servers do. It refuses to go out when the native part changed but `version` did not. When the native part changed and `version` was raised, it says that a new build is needed. Running the workflow again on an earlier tag rolls the app back. See the spec's "Publishing from the Release workflow".

## Acceptance criteria

- [x] `release.sh check-name` accepts `app`, treats `all` as the five servers plus the app, and prints an `app` flag beside `servers`. `release.bats` covers this.
- [x] `release.yml` no longer excludes `snunow/app/**`.
- [x] An `app` job runs when the flag is set:
  - for `all`, only after every server job succeeded;
  - for `app`, alone;
  - after the same CI gate as the servers;
  - in its own concurrency group.
- [x] The job sets every build setting from repository variables (the `EXPO_PUBLIC_*` values, `INVITE_LINK_HOST`, `GOOGLE_IOS_URL_SCHEME`; never `ANDROID_X86_64`). It computes the Android and iOS fingerprints with `expo-updates`' fingerprint command and reads `app-version.json` from the `app-version` Release. A pure `release.sh` function decides, and `release.bats` tests each case:
  - publish when the fingerprints match;
  - fail, saying to raise `version` and make a native Release, when a fingerprint differs and `version` is unchanged;
  - publish with a "new APK and iOS build needed" notice in the job summary when both changed;
  - fail when the file is missing or unreadable.
- [x] `eas update --channel production --platform all --non-interactive` publishes with the tag as its message, and `EXPO_PUBLIC_RELEASE_TAG` and `EXPO_PUBLIC_RELEASE_COMMIT` set.
- [x] The repository secret `EXPO_TOKEN` (the developer robot token) and the variables for every build setting are set. The workflow reads these settings only from them.
- [x] Checked on a real tag: a JavaScript-only change pushed as `snunow/app/…` reaches the ticket 01 APK after one restart. Running the workflow again on the previous tag brings the previous code back.
- [x] `infra/production/README.md`'s Release section describes the `app` target, the ordering after the servers, the fingerprint check and rollback.

## Comments

### Agent usage (2026-10-28)

- **Agent time** (estimate): about 1.5 hours. That is about 6 minutes for the building subagent, about 15 minutes of real Release runs (three runs), and the rest for setup, the variables and the checks. It does not count the time spent waiting for the person.
- **Tokens** (estimate):
  - Subagents: about 110,000 tokens to build the ticket, measured, and about 130,000 for the code review.
  - Main session: about 150,000 input and 25,000 output, not counting cache reads. Cache reads were about 6,000,000 and cache writes about 200,000. These are estimates from the number of turns.

### Checks on real tags (2026-10-28)

- **`snunow/app/26.10.28-1` on ff70930**, run 40631035411, succeeded:
  - the server job was skipped;
  - CI computed the fingerprints android `d0581b58…` and ios `ffd1bd8f…`, both equal to `app-version.json`;
  - the verdict was publish, and both platforms were published.
  
  On the 1.0.0 APK, 내 정보 showed the tag after the app was restarted.
- **`snunow/app/26.10.28-2` on the same commit**, run 40631634399, succeeded. The phone showed `-2`.
- **Rollback.** Running `-1` again by hand with `gh workflow run release.yml --ref snunow/app/26.10.28-1` (run 40632312598) succeeded, and the phone went back to `-1`.
- **Who pushed.** A person pushed the tags and started the manual run. The agent's permission rules treat them as a Production deploy.
- **Known display issue.** When the server job is skipped, GitHub shows its name unexpanded, as `release ${{ matrix.server }}`. GitHub never expands a matrix it does not run. It does no harm.
