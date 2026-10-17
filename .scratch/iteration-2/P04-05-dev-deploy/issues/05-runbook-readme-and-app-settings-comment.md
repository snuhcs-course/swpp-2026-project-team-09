# 05: The runbook, the README's Deployment section, and the app's example settings

Parent: [P04-05 spec](../spec.md)
Status: done
Blocked by: 02, 03, 04 (the names and commands the runbook describes)
Touches: the deploy folder's README, the root README, and the mobile app's example settings file.

## What to build

A teammate with ssh and no memory of this spec can run the Dev Server from the runbook alone: first setup with the bootstrap; filling the two kinds of settings and where the person-held values come from; reading the status address and the journal; redeploying by hand; bringing `2.0/Main` into `development` with a fast-forward merge from a checkout, since no pull request targets `development`; restoring a dump; emptying the data and starting again; adding an APK; backing the settings up before the course deletes the servers; what changes for a production server on A. The root README gains a short "Deployment" section that says what the Dev Server is, its address, and points to the runbook. The app's example settings file gains a comment with the Dev Server's main-server and socket-server addresses, so a teammate copies two lines to build against it.

## Acceptance criteria

- [x] The runbook has a section for each item of the spec's "Repository additions" runbook list, and every command in it names the real scripts, units and folders of tickets 02 to 04.
- [x] The runbook's section on moving `development` gives the fast-forward commands and says why a pull request is never used for it (spec: "How `development` moves").
- [x] The runbook records what is not covered by tests and is checked in the operations tickets (spec: "Testing Decisions", last item), with a place for ticket 08's finding about WebSockets.
- [x] The root README's "Deployment" section is under a screen long, names the Dev Server's address and links to the runbook; the README's table of contents or heading structure stays consistent.
- [x] The app's example settings file carries the Dev Server's two addresses as a comment beside the two variables, and the mobile project's `pnpm format:check` still passes.
- [x] Markdown files get no AI-generated box; the example settings file gets a new row in its box if it has one (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### What ticket 05 decided (2026-10-17)

- The runbook is `infra/deploy/README.md`. It defines one shell function, `dc`, for Compose on the server (`sudo docker compose` with the settings file and both Compose files, by absolute paths, so it works from any folder), and every Docker command in it goes through `dc`. It warns that a bare `docker compose` in the checkout starts the laptop stack over the Dev Server's containers.
- First setup copies `bootstrap.sh` to the server with `scp` from a laptop's checkout, since the server has no checkout before the bootstrap; later runs use the checkout's copy. `BOOTSTRAP_TEAM_GROUP=swpp26-members` is the example group, taken from the server facts of 2026-10-17, with `id` to confirm it.
- Before the first deployment nothing listens on port 80, so the runbook sends a reader to `/srv/team/snu-now-status/status.json` on the server while the result is `secrets-missing`.
- A by-hand start does nothing when the tip is deployed (`plan_run` gives `up-to-date`), so the runbook gives `dc up --detach` to apply a changed setting and `dc restart` to restart a service. It also names the two settings that `dc up` cannot apply: the database passwords (read when the volume is created) and `INITIAL_ADMINISTRATOR_EMAILS` (read on an empty database).
- Moving `development` is four commands (`git fetch`, `git switch development`, `git merge --ff-only origin/2.0/Main`, `git push`), not the spec's three: the `switch` makes them work from any checkout. If the merge refuses because `origin/development` holds a direct push, the runbook brings the change to `2.0/Main` by a pull request and then resets `development` with `git push --force-with-lease`. The spec does not cover that case; the deploy script's `git reset --hard` follows a forced push.
- Restoring: stop the timer, take a `manual-` dump (outside the deploy's `snu-now-*` rotation), `dc down --volumes`, start PostgreSQL alone, pipe the dump through `psql`, start the rest, start the timer. The expected "already exists" errors for the roles and the two databases are named. A dump carries the roles' passwords, so it is restored under the settings file it was taken with, which is why the backup section saves both.
- The APK build is `pnpm expo prebuild --platform android` and `./gradlew assembleRelease`, output `android/app/build/outputs/apk/release/app-release.apk`. The repository does not record how the iteration-1 APK was built, so ticket 07 checks these steps.
- Production on A names A's address `http://swpp26t09.147-46-242-169.sslip.io`, from the same server facts. The spec does not give it.
- The "not covered by tests" record lists the bootstrap on the server, the units (including the `TRIGGER_UNIT` by which a by-hand run is told apart, and the timer going on after a failed run), the ingress and the APK download, each with the operations ticket that checks it. Ticket 08's place has four "not tried yet" answers. It also notes that the app uses the WebSocket transport only (`mobile/src/live/connection.ts`).
- `mobile/.env.example`: `EXPO_PUBLIC_SOCKET_SERVER_URL` now sits right after `EXPO_PUBLIC_MAIN_SERVER_URL`, in the order of the README's settings table, so that one comment below the two holds the two lines to copy. Both addresses are the bare host: the socket.io client adds `/socket.io/` itself, and a path in its URL would be read as a namespace. The file has no AI-generated box, like the other `.env.example` files the box commit left unmarked, so none was added.
- Root README: a "Deployment" section after "Running the tests", its entry in the table of contents, and the `infra/` row of "Repository layout" naming the Dev Server's proxy and deployment. The two Markdown files were formatted with the projects' prettier settings (120 columns), as the README already is.
- No acceptance criterion names a test, so none was written. The runbook's paths, units, variables, results and status fields were checked against `infra/deploy`, `compose.deploy.yaml` and `infra/proxy` with a script in the scratchpad. `pnpm install --frozen-lockfile` and `pnpm format:check` in `mobile` pass. Docker and `flow-tests` were not run.

### Agent usage (2026-10-17)

- Agent time: about 17 minutes, an estimate (one implementer subagent).
- Tokens: input 7,943,000 in all (cache reads 7,759,000, cache writes 184,000, uncached under 1,000), output 21,000. Measured just before this section was written.
