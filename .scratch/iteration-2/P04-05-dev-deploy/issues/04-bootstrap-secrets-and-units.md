# 04: The bootstrap, the generated secrets, the systemd units and the settings example

Parent: [P04-05 spec](../spec.md)
Status: done
Blocked by: None (can start immediately)
Touches: the deploy folder (the bootstrap script, its tests, the four unit files, the settings example). Not the deploy script, its tests or the CI workflow, which ticket 03 owns; the CI job of ticket 03 picks these tests up by itself.

## What to build

One script, run once with sudo on a fresh course server and safe to run again, leaves the server ready for the first deploy run (spec: "The bootstrap", "Server layout", "Settings and secrets", "Timers"): Docker, Compose and Buildx from Ubuntu's archive; the five folders under the team folder with the team group, the secrets folder closed to others; the repository cloned on `development` and marked safe for git under root; the settings file written if absent, with the generated values, the fixed values and `CHANGE_ME` for the three person-held values; the two timers and their services installed into systemd and enabled. It never overwrites an existing settings file, never fills in the person-held values and never deploys.

The four unit files: the deploy service runs the deploy script from the checkout with the environment the script expects, and its timer fires a minute after the previous run and two minutes after boot; the demo-refresh service restarts `demo-seed` with the demo profile, and its timer fires daily at 19:00 UTC.

The settings example is the file a person reads before filling the real one: every variable with a one-line comment saying what it is and which service takes it, the generated ones marked as written by the bootstrap.

## Shared contract

Fixed here so that tickets 02 and 03 match without seeing this ticket: the deploy folder is `infra/deploy`; the settings file is `/srv/team/snu-now-secrets/snu-now.env`; its variables are those of the spec's "Settings and secrets" plus `DEPLOY_STATUS_DIR`, `DEPLOY_APK_DIR` and `COMPOSE_PROFILES=demo`; the unit names are `snu-now-deploy` and `snu-now-demo-refresh`; the override is `compose.deploy.yaml` at the repository root.

## Acceptance criteria

- [x] bats: a fresh settings file holds every variable of the contract; the generated values are present, non-empty and distinct; exactly `KAKAO_REST_API_KEY`, `INITIAL_ADMINISTRATOR_EMAILS` and `DEMO_ACCOUNT_EMAILS` are `CHANGE_ME`; `PUBLIC_URL`, the two Google client ids, the fingerprints and `COMPOSE_PROFILES` have the spec's fixed values.
- [x] bats: the key pair is a P-256 pair in one-line PEM form that `openssl` reads back as PKCS8 private and SPKI public keys, and the public key matches the private.
- [x] bats: a second run leaves an existing settings file byte for byte as it was.
- [x] bats: with fakes for `apt-get`, `git`, `systemctl` and `install`, a first run installs the three packages, clones, installs and enables the two timers; a second run on a prepared machine installs nothing again and fails nothing.
- [x] bats: the folders are created with the team group, the secrets folder closed to others, the rest group-writable.
- [x] bats: the unit files carry the schedule of the spec's "Timers" and the deploy service points its environment at the settings file, the status folder and the backups folder of the contract.
- [x] `shellcheck` reports nothing on the bootstrap.
- [x] Every new source file (the bootstrap, the tests, the four unit files) starts with the AI-generated box, below the shebang where there is one (`CLAUDE.md`). The settings example is a dotenv file and gets a `#` box too.
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Agent usage (2026-10-17)

- Agent time: about 20 minutes, an estimate: the implementer subagent and the subagent that merged its branch.
- Tokens: input 11,761,000 in all (cache reads 11,480,000, cache writes 281,000, uncached under 1,000); output about 40,000 (estimated from what the transcripts hold, which keep only partial output counts, so a lower bound).
- The orchestrating session, the code review and its fix round are shared by tickets 01–05 and recorded once, under ticket 05.

### Review round (2026-10-17)

- A fifth unit, `snu-now-redeploy.service`, asks for a deploy run by hand; the bootstrap installs it with the others and still enables only the two timers.
- The backups folder is closed to others (2770), as the secrets folder is: the dumps hold Users' data and password hashes, and `/srv/team`'s default ACL overrides the umask.
