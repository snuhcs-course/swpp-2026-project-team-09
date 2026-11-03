# 04: Deploy the HE branch to swpp-a

Parent: [P15 spec](../spec.md) ("Deploying to swpp-a", "The HE branch")
Status: done
Blocked by: 01 (the server must take the keys)

## What to build

swpp-a runs the HE branch as the Dev Server runs development:

- bootstrap clones it;
- the deploy timer tracks it and deploys a tip whose required checks passed;
- the stack runs with the HE setting on and the real Collections filled.

The Mac doing this must be on the SNU network, since ssh to the course servers and swpp-a's web answer only there.

## Steps that wait for the PM's word

Each is done only after the PM says so in the chat:

1. **First push:** pushing `3.0/P15-he` to origin for the first time. CI then runs on it.
2. **Bootstrap:** running bootstrap on swpp-a as root, which installs Docker and the deploy units.
3. **Keys:** copying the keys from swpp-b's environment file into swpp-a's, never printing them. They are the OpenRouter key, the Kakao REST key, the two Google client IDs and the initial Administrator emails.
4. **First deploy:** the first deploy and the Collections run by hand.

## Acceptance criteria

- [x] **Tracked branch:** bootstrap clones the HE branch and the deploy run tracks it.
  - The gate on the required checks is unchanged.
  - `PUBLIC_URL` is server A's host.
  - The deploy scripts' bats tests expect the HE branch and pass.
- [x] **Settings:** the deploy settings pass `HE_ACCOUNTS` to the main server. swpp-a's environment has:
  - `HE_ACCOUNTS` on;
  - `DEMO_ACCOUNT_EMAILS` empty;
  - `COMPOSE_PROFILES` set to `demo`;
  - `EXTRA_SNU_COLLECTION` off;
  - no `CHANGE_ME` left.
- [x] **Collections:** after the first deploy, `coop_menus`, `dormitory_menus`, `veterinary_menus`, `shuttle_stops` and `snu_events` are each collected once by hand and report success.
- [x] **Running server:**
  - server A's host answers 200 on `/health/ready`;
  - `/deploy-status` names the HE branch and the deployed commit;
  - a key signs in over HTTP;
  - the server holds menus, upcoming published Global Events and the Shuttle Stops.
- [x] **Untouched:** swpp-b is only read, and development, 3.0/Main and Production are untouched.

## Comments

- **Code (2026-11-03), on `3.0/P15-he-04`.**
  - **Tracked branch:** `bootstrap.sh` clones `3.0/P15-he` and `deploy.sh`'s `TRACKED_REF` is `3.0/P15-he`, so `/deploy-status` names it. The gate is unchanged: it asks GitHub's `commits/<hash>/check-runs` for the fetched commit by hash, so the slash in the branch name never reaches the API path.
  - **Settings:** `compose.deploy.yaml` hands `HE_ACCOUNTS` to the main server, `off` when the file lacks it. The settings file the bootstrap writes, and `snu-now.env.example`, have server A's `PUBLIC_URL`, `HE_ACCOUNTS=on`, `DEMO_ACCOUNT_EMAILS` empty, `COMPOSE_PROFILES=demo` and `EXTRA_SNU_COLLECTION=off`; `KAKAO_REST_API_KEY` and `INITIAL_ADMINISTRATOR_EMAILS` stay `CHANGE_ME` and `OPENROUTER_API_KEY` empty for the keys from swpp-b. `docker compose config` over the template gives the main server `HE_ACCOUNTS=on`.
  - **Tests:** `bootstrap.bats` and `deploy.bats` expect the HE branch, server A's address and the HE settings; `bats --recursive infra/deploy` (27) and CI's shellcheck pass. The README's branch, host and settings lines follow.
  - **Not ticked:** Settings, since swpp-a's own file and its `CHANGE_ME`s wait for bootstrap and the keys; Collections, Running server and Untouched wait for the PM's steps.
- **The PM's steps (2026-11-03), from the main session, each on the PM's word.**
  1. **First push:** `4c3e129` at 17:17, then `a78b952` with this ticket's code at 17:19. From then on the PM let the branch be pushed without asking.
  2. **Bootstrap:** at 17:23, `sudo bash bootstrap.sh` on swpp-a. It installed Docker, git and jq, cloned `a78b952` into `/srv/team/snu-now` and wrote the settings file. `/srv/team` already belonged to `swpp26-members`, so no `BOOTSTRAP_TEAM_GROUP` was needed.
  3. **Keys:** at 17:25 the five lines (`OPENROUTER_API_KEY`, `KAKAO_REST_API_KEY`, `GOOGLE_APP_CLIENT_ID`, `GOOGLE_ADMIN_CLIENT_ID`, `INITIAL_ADMINISTRATOR_EMAILS`) went from swpp-b's settings file into swpp-a's through a pipe between two ssh sessions, never printed or written elsewhere. Their lengths match swpp-b's, and no `CHANGE_ME` is left.
  4. **First deploy:** the deploy timer deployed `a78b952` at 17:29, after its 16 CI checks passed. At 17:30 `dc exec -T worker-server node dist/collect coop_menus dormitory_menus veterinary_menus shuttle_stops snu_events` reported `succeeded` for all five.
- **The running server (2026-11-03).**
  - `/health/ready` answers 200.
  - `/deploy-status` reads `trackedRef: 3.0/P15-he`. It deployed `a78b952`, then `d0a4ed5` with ticket 03 at 17:36.
  - An unknown key is refused with 401. The key `he-s1` signs in over HTTP, and the answer is Onboarding not completed, with 이도현 / 경영학과 suggested. Its sign-out gave 204.
  - The database holds 686 menu lines, 31 upcoming published Global Events and 14 Shuttle Stops.
  - **Untouched:** swpp-b was only read: the key lines, their lengths and a log count. Nothing was pushed to development or 3.0/Main, and Production was not touched.
