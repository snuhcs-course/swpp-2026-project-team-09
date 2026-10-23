# deploy

The Dev Server's deployment and its runbook. The Dev Server is server B of the two the course lends the team. It runs
the four servers, PostgreSQL, Redis and the Demo Data under Docker Compose, behind a Caddy proxy, and keeps itself on
the tip of `development`: nothing pushes to it
([ADR 0003](../../docs/adr/0003-the-dev-server-pulls-its-deployments.md),
[ADR 0004](../../docs/adr/0004-compose-not-kubernetes-on-the-course-servers.md)).

## The Dev Server

Every team member reaches it as `ssh swpp-b` with their own key, from the university's network only, and has `sudo`
there. The server is an Incus (LXC) container with Ubuntu 24.04, on UTC.

### Its address

`http://swpp26t09.147-46-242-174.sslip.io`, plain HTTP on port 80. The course's ingress routes only this exact host
name to the server and ends requests that last over 120 seconds. The proxy (`infra/proxy/Caddyfile`) answers:

| Path                                   | What answers                                     |
| -------------------------------------- | ------------------------------------------------ |
| `/socket.io/`                          | The socket server, WebSocket upgrades included   |
| `/deploy-status`                       | The last deploy run's `status.json`              |
| `/apk/` (with the slash)               | A listing of the dev APKs, for a phone's browser |
| Anything else, such as `/health/ready` | The main server                                  |

The main server must define no route under `/apk/` or `/deploy-status`, which the proxy answers itself. The admin
site is not deployed: run it on a laptop with `MAIN_SERVER_URL=http://swpp26t09.147-46-242-174.sslip.io` in
`admin/.env`.

### What a deploy run does

`snu-now-deploy.timer` starts `snu-now-deploy.service` two minutes after boot and a minute after each run ends;
systemd never starts it while a run is going. The service runs `infra/deploy/deploy.sh` from the checkout, as root:

1. Fetches `development`. When its tip is the deployed commit, the result is `up-to-date` and the run stops.
2. Reads the tip's check runs from GitHub's public API, without a token. The CI checks `main-server`,
   `socket-server`, `worker-server`, `match-server` and `flow-tests` must have succeeded; `admin`, `mobile` and
   `deploy-scripts` are not consulted. One success of each among its runs is enough. Otherwise a check missing, still
   running, cancelled (as a newer push cancels it), stale or waiting for an action gives `waiting-for-ci`, asked again
   next run; one failed, timed out, neutral or skipped gives `ci-failed`, and the commit is not asked about again.
3. Dumps the databases with `pg_dumpall` into the backups folder and keeps the newest 7. No dump while no database
   runs.
4. Resets the checkout to the tip with `git reset --hard` and `git clean -fdx`.
5. Builds the images with `docker compose build`, with `compose.yaml` and `compose.deploy.yaml`, then starts them with
   `docker compose up --detach`, which recreates only the services whose image or settings changed. A failed build
   stops nothing: the containers that ran before keep running. A failed `up`, such as a migration that keeps the main
   server from turning healthy, leaves the new containers running as they are.
6. Checks, through the proxy on the server's loopback, that `/health/ready` answers 200 and
   `/socket.io/?EIO=4&transport=polling` an engine.io handshake, each within about two minutes. Nothing is rolled
   back when they do not.
7. Removes dangling images and build cache older than 7 days.
8. Writes `status.json`, which the proxy serves at `/deploy-status`.

A commit whose dump, checkout or build fails (`build-failed`) or whose `up` or check in step 6 fails (`unhealthy`) is
tried again on the next two runs, then `held` until a new commit arrives or a person asks for a run by hand. A run that
finds `CHANGE_ME` in the settings file stops before Docker (`secrets-missing`). Every run logs to the journal.

`snu-now-demo-refresh.timer` starts `snu-now-demo-refresh.service` every day at 19:00 UTC (04:00 in Seoul). It
restarts `demo-seed`, which rewrites the Demo Data's days around today.

### Where things are

| On the server                             | What it is                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `/srv/team/snu-now`                       | The checkout, reset to each deployed commit; nothing of value lives in it |
| `/srv/team/snu-now-secrets/snu-now.env`   | The settings file, Compose's `--env-file`; its folder is closed to others |
| `/srv/team/snu-now-backups`               | The dumps, `snu-now-YYYYMMDDTHHMMSSZ.sql.gz` in UTC; closed to others     |
| `/srv/team/snu-now-status/status.json`    | The status file                                                           |
| `/srv/team/snu-now-apk`                   | The dev APKs                                                              |
| `/etc/systemd/system/snu-now-*`           | The five unit files, copied there from `infra/deploy` by the bootstrap    |
| The Docker volume `snu-now_postgres-data` | PostgreSQL's data                                                         |

The folders belong to the team group: every member reads them, and writes the settings file, the dumps and the APKs,
without `sudo`. Docker and systemd need `sudo`.

| In the repository                  | What it is                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `compose.deploy.yaml`              | The deployment override, laid over the laptop `compose.yaml`                         |
| `infra/proxy/`                     | The proxy's `Caddyfile` and the `Dockerfile` that builds it into the proxy's image   |
| `infra/deploy/deploy.sh`           | One deploy run                                                                       |
| `infra/deploy/bootstrap.sh`        | Readies a server for the deploy timer                                                |
| `infra/deploy/snu-now-*.service`   | The deploy and demo-refresh services, each with a `.timer`, and the redeploy service |
| `infra/deploy/snu-now.env.example` | The settings file as the bootstrap writes it, with what each value is                |
| `infra/deploy/test/`               | The two scripts' bats tests                                                          |

### Compose by hand

On the server, always through the settings file and both Compose files. A bare `docker compose` in the checkout
would start the laptop stack over the Dev Server's containers. Paste this function into the shell, or into your
`~/.bashrc`:

```bash
dc() { sudo docker compose --env-file /srv/team/snu-now-secrets/snu-now.env --file /srv/team/snu-now/compose.yaml --file /srv/team/snu-now/compose.deploy.yaml "$@"; }
```

The rest of this file uses it:

```bash
dc ps
dc logs --tail 100 --follow main-server
dc restart socket-server
```

Each service keeps at most 30 MB of logs (10 MB × 3 files).

## First setup

On a fresh server, from a laptop on the university's network, with a checkout of `development`:

```bash
scp infra/deploy/bootstrap.sh swpp-b:
ssh swpp-b
sudo bash bootstrap.sh
rm bootstrap.sh
```

The bootstrap installs `docker.io`, `docker-compose-v2`, `docker-buildx`, `git`, `curl` and `jq` from Ubuntu's archive,
creates the five folders of [Where things are](#where-things-are), clones the repository on `development` into the
checkout and marks it safe for git under root. It writes the settings file with the generated and fixed values and
`CHANGE_ME` for the three a person fills in, copies the five unit files into systemd and runs
`systemctl enable --now` on the two timers. It never overwrites an existing settings file and never deploys.

It takes the team group from `/srv/team`. If it stops saying that `/srv/team` belongs to root, name the team's group
(`id` lists yours; `swpp26-members` on the course servers):

```bash
sudo BOOTSTRAP_TEAM_GROUP=swpp26-members bash bootstrap.sh
```

The bootstrap is safe to run again: a second run reports only that it keeps the settings file, and, while one is
left, that a `CHANGE_ME` waits. Once the checkout exists, run it from there:
`sudo bash /srv/team/snu-now/infra/deploy/bootstrap.sh`.

The timers start at once, so the first deploy run stops at `secrets-missing`. Fill in the settings
([Filling the settings](#filling-the-settings)); the next run, within a minute, deploys by itself. The first build of
the four servers' images takes several minutes. Follow it with `sudo journalctl -u snu-now-deploy --follow`, then open
`/health/ready` and `/deploy-status` at the Dev Server's address from a phone. Until the first deployment nothing
listens on port 80 and the ingress answers 503; the status is then read on the server, in
`/srv/team/snu-now-status/status.json`.

`systemctl list-timers 'snu-now-*'` shows when each timer last fired and fires next.

## Filling the settings

The settings file, `/srv/team/snu-now-secrets/snu-now.env`, holds two kinds of values.
[`snu-now.env.example`](snu-now.env.example) says what each one is and which service takes it, by the names of the
servers' own `.env.example` files.

**Written by the bootstrap, left as they are.** The generated secrets: `POSTGRES_PASSWORD`, `MAIN_DB_PASSWORD`,
`MATCH_DB_PASSWORD`, the access-token key pair `ACCESS_TOKEN_PRIVATE_KEY` and `ACCESS_TOKEN_PUBLIC_KEY`, `WORKER_TOKEN`
and `MATCH_SERVER_TOKEN`. The fixed values: `COMPOSE_PROFILES=demo`, `DEPLOY_STATUS_DIR`, `DEPLOY_APK_DIR`,
`PUBLIC_URL` (the Dev Server's address), the two Google client IDs, `ANDROID_CERTIFICATE_FINGERPRINTS` (the debug
key's, which signs the dev APK), `ASSISTANT_MODEL` and `ROUND_INTERVAL_SECONDS`.

**Filled in by a person**, `CHANGE_ME` until then:

| Setting                        | Value                                                                      | Where it comes from                   |
| ------------------------------ | -------------------------------------------------------------------------- | ------------------------------------- |
| `KAKAO_REST_API_KEY`           | The REST API key of the team's Kakao app                                   | The Owner of the Kakao app, privately |
| `INITIAL_ADMINISTRATOR_EMAILS` | The four members' addresses they sign in to the admin site with, by commas | The members                           |
| `DEMO_ACCOUNT_EMAILS`          | The four members' SNU addresses, separated by commas                       | The members                           |

`OPENROUTER_API_KEY`, the Assistant's OpenRouter key (`main-server/.env.example` says how to make one), is left empty
rather than `CHANGE_ME`: while it is empty, the Assistant answers that it is unavailable and everything else runs. A
settings file written before the Assistant lacks it and `ASSISTANT_MODEL`: copy both lines from
[`snu-now.env.example`](snu-now.env.example) and apply them as in [Changing a setting later](#changing-a-setting-later).

The file belongs to the team group, so any member edits it without `sudo`, for example with
`nano /srv/team/snu-now-secrets/snu-now.env`. `grep CHANGE_ME /srv/team/snu-now-secrets/snu-now.env` prints nothing
once every value is in.

### Changing a setting later

A deploy run hands the settings to the containers only when it deploys a new commit. To apply a change at once,
`dc up --detach`: Compose recreates the services whose settings changed. Two kinds of change do not take effect that
way:

- The three database passwords are read only when PostgreSQL's data volume is created. Changed later, they lock the
  servers out of their databases.
- `INITIAL_ADMINISTRATOR_EMAILS` is read only while the database holds no Administrator. Afterwards Administrators
  register each other on the admin site, or the data is emptied
  ([Emptying the data](#emptying-the-data-and-starting-again)).

## Reading the status and the journal

From any browser, `http://swpp26t09.147-46-242-174.sslip.io/deploy-status`. Its fields:

| Field               | What it is                                                       |
| ------------------- | ---------------------------------------------------------------- |
| `trackedRef`        | `development`                                                    |
| `checkedAt`         | When the run ran, in UTC                                         |
| `result`            | What the run did, below                                          |
| `candidateCommit`   | The tip of `development` the run looked at                       |
| `attempt`           | 1 to 3, when the run built the candidate or held it              |
| `deployedCommit`    | The last commit built, started and checked healthy               |
| `deployedAt`        | When that commit was deployed                                    |
| `checks`            | The name and conclusion of each required check of the candidate  |
| `recreatedServices` | The services Compose created or recreated in the last deployment |

| `result`          | What it means and what to do                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `up-to-date`      | The tip is deployed. Nothing to do.                                                                                                                                      |
| `deployed`        | This run deployed the tip.                                                                                                                                               |
| `waiting-for-ci`  | A required check of the tip is missing, still running or cancelled, or GitHub refused the request (60 an hour without a token). Wait.                                    |
| `ci-failed`       | A required check failed. Push a fix; after re-running the checks on GitHub, [ask for a run by hand](#redeploying-by-hand).                                               |
| `build-failed`    | The dump, the checkout or the build failed; the old containers keep running. Read the journal.                                                                           |
| `unhealthy`       | The new containers run, but `up` failed or the main server or the socket server did not answer through the proxy; `deployedCommit` stays the one before. Read `dc logs`. |
| `held`            | Three attempts at the tip failed. Push a fix, or ask for a run by hand once the cause is gone.                                                                           |
| `secrets-missing` | The settings file is missing or holds `CHANGE_ME`. [Fill it in](#filling-the-settings).                                                                                  |

A `checkedAt` more than a few minutes old means no run has finished since: a build is going, the timer is stopped or
a fetch failed, which leaves the file as it was. The journal says which.

The status file is also the deploy run's only memory: a run reads the previous one's file to know the deployed commit
and the attempts. Leave it in place.

The journal of the deploy runs:

```bash
sudo journalctl -u snu-now-deploy --since '1 hour ago'
sudo journalctl -u snu-now-deploy --follow
systemctl status snu-now-deploy
```

Each run starts with `run: started by systemd` or `run: asked for by hand (snu-now-redeploy)`, logs one line per
step (`fetch:`, `ci:`, `dump:`, `checkout:`, Compose's own output with `build:` or `start:` when that fails, `smoke:`,
`clean:`) and ends with `status:` and the result. A run that ends in `build-failed`, `unhealthy` or `secrets-missing`
marks the service failed; the timer starts the next one all the same. The demo refresh logs under
`sudo journalctl -u snu-now-demo-refresh`, and the servers' logs are `dc logs <service>`.

## Redeploying by hand

```bash
sudo systemctl start snu-now-redeploy
```

It writes a request file, `/srv/team/snu-now-status/redeploy`, starts a deploy run and returns at once; follow the run
in the journal. The run that finds the file removes it, asks GitHub again about a `held` or `ci-failed` commit and
builds it from attempt 1. While a run is going, the request waits for the next one, a minute after it ends. When the
tip is already deployed the run does nothing (`up-to-date`): to restart the running stack, `dc up --detach` or
`dc restart <service>`.

`sudo systemctl start snu-now-deploy` also starts a run, but it behaves as a timer run: systemd hands it the timer's
details, so the run cannot tell that a person started it, and a `held` or `ci-failed` commit stays as it is.

To apply the demo refresh now: `sudo systemctl start snu-now-demo-refresh`.

## Moving `development` to `2.0/Main`

The Dev Server follows `development` and nothing else. `2.0/Main` is the reviewed iteration branch; `development` only
ever receives it, by a fast-forward. After a pull request is merged into `2.0/Main`, from any checkout:

```bash
git fetch origin
git switch development
git merge --ff-only origin/2.0/Main
git push origin development
```

`git switch development` creates the local branch from `origin/development` the first time. Within a minute the Dev
Server sees the new tip. The commit's checks already ran on its push to `2.0/Main`, so it deploys at once if they
passed; the push to `development` runs CI again, and one success of each check is enough.

No pull request ever targets `development`. The repository allows only squash merges, so a pull request would put a
new commit on `development` that `2.0/Main` lacks, and from then on the two branches drift and the fast-forward
fails. `development` also has no protection rule: whatever reaches it deploys.

If `git merge --ff-only` refuses, `development` holds a commit that `2.0/Main` lacks. When only the local branch
does, `git switch --force-create development origin/development` and merge again. When `origin/development` does,
someone pushed to it directly: bring that change into `2.0/Main` with a pull request, then put `development` back on
it with `git push --force-with-lease origin origin/2.0/Main:development`. The Dev Server follows a forced push as it
follows any other.

## Restoring a dump

Every deploy run dumps the databases before it checks out the new commit, so the newest dump holds the data from
before the last deployment. A dump is a `pg_dumpall` of the whole cluster, with the roles and their passwords: restore
it under the settings file it was taken with. When the main server starts on the restored data, it applies the
migrations the dump lacks; if a migration broke the data, restore once `development` carries a corrected one.

```bash
ls -lt /srv/team/snu-now-backups
sudo systemctl stop snu-now-deploy.timer
systemctl is-active snu-now-deploy
```

When no run is going (`inactive` or `failed`), keep what is there now, then restore into an empty volume:

```bash
dc exec -T postgres pg_dumpall --username postgres | gzip > /srv/team/snu-now-backups/manual-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
dc down --volumes
dc up --detach --wait postgres
gunzip --stdout /srv/team/snu-now-backups/snu-now-20261020T031205Z.sql.gz | dc exec -T postgres psql --username postgres --dbname postgres --quiet
dc up --detach
sudo systemctl start snu-now-deploy.timer
```

with the name of the dump to restore in the fourth line. `psql` reports that the roles and the two databases already
exist, because PostgreSQL creates them on an empty volume; those errors are expected. A `manual-` dump is not among the
seven the deploy run keeps, so it stays until a person deletes it.

## Emptying the data and starting again

This deletes every User, Quest, Party and collected Global Event, and the Administrators. Take a `manual-` dump first
if anything is worth keeping ([Restoring a dump](#restoring-a-dump)).

```bash
sudo systemctl stop snu-now-deploy.timer
dc down --volumes
dc up --detach --wait
sudo systemctl start snu-now-deploy.timer
```

On the empty database the main server loads the seed, registers the addresses of `INITIAL_ADMINISTRATOR_EMAILS`, and
`demo-seed` writes the Demo Data again. Everyone signs in and completes Onboarding again.

## Adding an APK

The dev APK is a release build of the app pointed at the Dev Server and signed with the shared debug key, which
Google, Kakao and the settings file already know. On a laptop that builds the app for Android (JDK 17 and the Android
SDK: [mobile/README.md](../../mobile/README.md), "Build the app for Android"):

1. In `mobile/.env`, fill in `KAKAO_NATIVE_APP_KEY` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and set the two server
   addresses to the commented lines of `mobile/.env.example`. Leave `INVITE_LINK_HOST` empty: over plain HTTP an
   Invite Link opens the app only through `snunow://`.
2. Build it:

   ```bash
   cd mobile
   pnpm install
   pnpm expo prebuild --platform android
   cd android
   ./gradlew assembleRelease
   ```

3. Copy it into the APK folder under today's date:

   ```bash
   scp app/build/outputs/apk/release/app-release.apk swpp-b:/srv/team/snu-now-apk/snu-now-dev-$(date +%F).apk
   ```

On a phone, open `http://swpp26t09.147-46-242-174.sslip.io/apk/` in the browser, tap the newest file and allow the
browser to install apps. The folder keeps every APK until someone deletes it with `rm` on the server.

## Backing up before the course deletes the servers

The checkout is on GitHub and an APK can be built again. What exists only on the server is the data and the settings
file: its generated secrets are made once, and the dumps carry its database passwords. Before the course takes the
servers back, take a last dump on the server:

```bash
dc exec -T postgres pg_dumpall --username postgres | gzip > /srv/team/snu-now-backups/manual-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
```

and copy both to a laptop on the university's network:

```bash
scp swpp-b:/srv/team/snu-now-secrets/snu-now.env .
scp 'swpp-b:/srv/team/snu-now-backups/*.sql.gz' .
```

The settings file holds the private key that signs access tokens, and the dumps hold Users' data: keep them where only
the team can read them, never in the repository, and delete them when they are no longer needed. To carry the Dev
Server to a new server, run the bootstrap there, copy the saved file over the settings file it wrote (`cp` keeps the
file's group and mode), correct `PUBLIC_URL` if the address changed, and restore the dump once the first deployment
has run.

## Changing the deployment

- A change to `compose.deploy.yaml`, `infra/proxy/`, a server's Dockerfile or `deploy.sh` reaches the server through a
  normal deploy run. The Caddyfile is built into the proxy's image, so a change to it recreates the proxy, and a
  Caddyfile that does not validate fails the build while the running proxy stays.
- A change to a unit file reaches systemd only through the bootstrap. Once a deploy run has taken the commit, run
  `sudo bash /srv/team/snu-now/infra/deploy/bootstrap.sh`; it installs the changed units and reloads systemd.
- A new setting: add it to the server's settings file by hand before the commit that needs it reaches `development`,
  since the bootstrap never rewrites an existing file. In the commit, add it to `compose.deploy.yaml`,
  `snu-now.env.example` and the settings the bootstrap writes.
- The tests: `bats --recursive infra/deploy` and `shellcheck` on every `*.sh` and `*.bats` under `infra/deploy`
  (CI's `deploy-scripts` job runs both), and `pnpm test` in `flow-tests`, whose `test/deploy-stack.e2e.test.ts` starts
  the deployment stack and calls it through the proxy.

A deploy run waits only for the five server checks, not for `deploy-scripts`, so a commit that breaks `deploy.sh`
itself deploys like any other. Every later run is then the broken script's and fails, until a fixed commit reaches
`development`, and a script that no longer fetches never takes the fix by itself. To get back quickly, revert the
commit on `2.0/Main` in a pull request, [move `development`](#moving-development-to-20main), and put the checkout on
the new tip by hand, so that the next run is the fixed script's and deploys the tip once its checks pass:

```bash
sudo git -C /srv/team/snu-now fetch origin development
sudo git -C /srv/team/snu-now reset --hard FETCH_HEAD
```

## Server A

Server A (`ssh swpp-a`, `http://swpp26t09.147-46-242-169.sslip.io`) stays empty. Production runs on AWS
([ADR 0006](../../docs/adr/0006-production-runs-on-eks-and-releases-are-pushed.md)).

## Not covered by tests

The bats tests in `test/` cover the deploy run's decisions and the order of its steps with fakes in place of `git`,
`docker` and `curl`, and the bootstrap's settings file, folders and units with fakes in place of `apt-get`, `git` and
`systemctl`. `flow-tests/test/deploy-stack.e2e.test.ts` covers the stack's routing through the proxy. These are checked
by hand on the server instead, in the operations tickets of [P04-05](../../.scratch/iteration-2/P04-05-dev-deploy/):

- The bootstrap on the real server: the packages from Ubuntu's archive, the team folder's group and default ACL, the
  clone and `safe.directory`, and a second run that changes nothing. Ticket 06.
- The systemd units: a first run on `enable --now`, a run a minute after each run, failed ones included, and two
  minutes after boot; `snu-now-redeploy` starting a run that takes its request file; the demo refresh at 19:00 UTC.
  Ticket 06.
- The course's ingress: the host reaching the proxy from a phone, and an APK downloaded whole through it. Tickets 06
  and 07; ticket 07 also checks [Adding an APK](#adding-an-apk) against what was done.
- WebSocket through the ingress. Ticket 08, below.

### WebSocket through the ingress

The app opens its live connection over WebSocket only (`transports: ['websocket']` in
`mobile/src/live/connection.ts`). Through the proxy alone, a connection stayed open for 6.5 minutes (ticket 02);
through the course's ingress it has not been tried. Ticket 08 records here what a phone off the campus network found:

- Date and network: not tried yet.
- Does the ingress pass WebSocket connections? Not tried yet.
- Does it end them at 120 seconds? Not tried yet.
- Does the app's reconnection cover an ending without a visible gap? Not tried yet.

If the ingress ends the connections, a follow-up ticket shortens socket.io's ping interval below its limit or lets the
app fall back to the polling transport.
