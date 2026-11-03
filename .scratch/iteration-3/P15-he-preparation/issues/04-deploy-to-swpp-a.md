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

- [ ] **Tracked branch:** bootstrap clones the HE branch and the deploy run tracks it.
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
