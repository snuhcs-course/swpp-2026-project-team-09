# 06: Server B's first run

Parent: [P04-05 spec](../spec.md)
Status: ready-for-human
Owner: 김태현
Blocked by: 01, 02, 03, 04, 05, and the pull request merged into `development`

Starts after the pull request is merged into `development`. Outside the scope of agent implementation; an agent may drive the ssh steps with the owner present.

## What to do

On `ssh swpp-b`, run the bootstrap with sudo and read what it reports. Fill `KAKAO_REST_API_KEY` (from the Owner of the team's Kakao app), `INITIAL_ADMINISTRATOR_EMAILS` and `DEMO_ACCOUNT_EMAILS` (the four members' SNU addresses) in the settings file. Watch the deploy unit's journal until a run ends in `deployed`. From a phone's browser, open `/health/ready` and `/deploy-status` at `http://swpp26t09.147-46-242-174.sslip.io`.

## Acceptance criteria

- [ ] The bootstrap ran to the end, and a second run reported nothing to do.
- [ ] A deploy run reached `deployed` for the tip of `development`, and the journal shows the eight steps.
- [ ] `/health/ready` answers 200 and `/deploy-status` shows the deployed commit from a phone outside the server.
- [ ] A development build of the app pointed at the Dev Server signs in with Google and shows the Lobby with Demo Data.
- [ ] The time the setup took is recorded under `## Comments`; agent time, if an agent drove the ssh steps, goes in an `### Agent usage (YYYY-MM-DD)` section.
