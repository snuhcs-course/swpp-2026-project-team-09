# 04: Deploy the HE branch to swpp-a

Parent: [P15 spec](../spec.md) ("Deploying to swpp-a", "The HE branch")
Status: ready-for-agent
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
- [ ] **Settings:** the deploy settings pass `HE_ACCOUNTS` to the main server. swpp-a's environment has:
  - `HE_ACCOUNTS` on;
  - `DEMO_ACCOUNT_EMAILS` empty;
  - `COMPOSE_PROFILES` set to `demo`;
  - `EXTRA_SNU_COLLECTION` off;
  - no `CHANGE_ME` left.
- [ ] **Collections:** after the first deploy, `coop_menus`, `dormitory_menus`, `veterinary_menus`, `shuttle_stops` and `snu_events` are each collected once by hand and report success.
- [ ] **Running server:**
  - server A's host answers 200 on `/health/ready`;
  - `/deploy-status` names the HE branch and the deployed commit;
  - a key signs in over HTTP;
  - the server holds menus, upcoming published Global Events and the Shuttle Stops.
- [ ] **Untouched:** swpp-b is only read, and development, 3.0/Main and Production are untouched.

## Comments

- **Code (2026-11-03), on `3.0/P15-he-04`.**
  - **Tracked branch:** `bootstrap.sh` clones `3.0/P15-he` and `deploy.sh`'s `TRACKED_REF` is `3.0/P15-he`, so `/deploy-status` names it. The gate is unchanged: it asks GitHub's `commits/<hash>/check-runs` for the fetched commit by hash, so the slash in the branch name never reaches the API path.
  - **Settings:** `compose.deploy.yaml` hands `HE_ACCOUNTS` to the main server, `off` when the file lacks it. The settings file the bootstrap writes, and `snu-now.env.example`, have server A's `PUBLIC_URL`, `HE_ACCOUNTS=on`, `DEMO_ACCOUNT_EMAILS` empty, `COMPOSE_PROFILES=demo` and `EXTRA_SNU_COLLECTION=off`; `KAKAO_REST_API_KEY` and `INITIAL_ADMINISTRATOR_EMAILS` stay `CHANGE_ME` and `OPENROUTER_API_KEY` empty for the keys from swpp-b. `docker compose config` over the template gives the main server `HE_ACCOUNTS=on`.
  - **Tests:** `bootstrap.bats` and `deploy.bats` expect the HE branch, server A's address and the HE settings; `bats --recursive infra/deploy` (27) and CI's shellcheck pass. The README's branch, host and settings lines follow.
  - **Not ticked:** Settings, since swpp-a's own file and its `CHANGE_ME`s wait for bootstrap and the keys; Collections, Running server and Untouched wait for the PM's steps.
