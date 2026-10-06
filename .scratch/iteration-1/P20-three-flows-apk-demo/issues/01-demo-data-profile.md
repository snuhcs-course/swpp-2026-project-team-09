# 01: Demo data under the demo profile

Parent: [P20 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

`docker compose --profile demo up --build` at the repository root starts the system as `docker compose up --build` does
and fills it with demo data, so that every feature of the app can be tried at once without entering anything by hand:
demo Users with their profiles and friendships, published Global Events today and this week, recruiting Quests on every
Board, a running Party, today's and this week's menus, shuttle vehicles, and Avatars that keep moving. A real account
named in `DEMO_ACCOUNT_EMAILS` becomes Friends with some demo Users and receives Friend Requests, a Quest invitation and
a Meetup from them once it has finished Onboarding.

Three services do it, each under `profiles: [demo]`, so that `docker compose up` and the tests never start them:

- `demo-seed`, from the main server's image, runs `node dist/demo-seed --watch` once `main-server` is healthy. It writes
  the demo data into the main database, then keeps watching for the real accounts. Outside Compose, `pnpm demo:seed` in
  `main-server/` runs it once against `DATABASE_URL`.
- `demo-walker`, from the main server's image, runs `node dist/demo-walk` once `demo-seed` has written the data. Every
  5 seconds it uploads the demo Users' positions along the campus's roads through `POST /positions`, and outside the
  hours the worker collects the shuttle, its vehicles through `POST /shuttle/vehicles/collected`. Outside Compose,
  `pnpm demo:walk`.
- `demo-menus`, from the worker server's image, runs `node dist/demo-menus` once `main-server` is healthy: the saved
  menu pages of the worker's tests, read by the worker's parsers and dated as today and the six days after, go to
  `POST /menus/collected`, as a Collection's would. Outside Compose, `pnpm demo:menus` in `worker-server/`.

How the choices were made:

- **The seed lives in the main server** (`src/demo/`, built into the same image) and writes through Prisma, not the
  HTTP routes: it creates what no route creates, such as Users who never sign in and Quests made some minutes ago, and
  it updates each row in place by a stable id, which makes it idempotent. No route, setting or module of the running
  server changes for the demo.
- **The real accounts are prepared by the seed watching** for them every 5 seconds, not by a call from the main server
  when Onboarding finishes. The main server then carries no demo code and no demo setting, which the default profile
  would share through `main-server/.env`, and 5 seconds are short next to what a person does after Onboarding. An
  account is prepared once per run of `demo-seed`, so that a Friend Request the person declined does not come back
  until the profile starts again. The seed sends the signals a route would, so that an open app shows the change.
- **The walker signs access tokens for the demo Users' Sessions** with the main server's private key, which it reads
  from `main-server/.env` in the main server's own image, so the key reaches no other image. Its positions then take
  the path a phone's take, with the same checks, the Campus Boundary and the `position` signals. A route for the
  worker's token would add a route that only the demo needs.
- **The menus go through the worker's parsers**, so that the stored rows are what a Collection stores, with no copy of
  a parser's result to keep in step with the parser.
- **The vehicles are the walker's only while the worker does not collect them**, outside weekdays 08:00 to 21:00 in
  Asia/Seoul: each set replaces the one before, so the walker's and the operator's would replace each other every few
  seconds.

## Acceptance criteria

### The profile

- [ ] `compose.yaml` has the three services under `profiles: [demo]`. `docker compose up` starts none of them, and no
      test or global setup runs the seed.
- [ ] `main-server` gets a health check on `GET /health/ready`, which `demo-seed` and `demo-menus` wait for.
      `demo-seed` reports itself healthy once the data is written, which `demo-walker` waits for.
- [ ] The services take their settings from the `.env` files of their projects, as the servers do, with the addresses
      inside Compose under `environment`.

### The seed

- [ ] Running it twice leaves the same rows as running it once: every row it makes has an id, a Google subject, a
      Friend ID or a unique key of its own that a later run finds and updates in place. A row it made and a person
      deleted, such as a Quest its Leader ended, is made again.
- [ ] 8 demo Users, onboarded, each with a Korean name, a department, an admission year, hashtags, a Friend ID and a
      Google subject that no Google account has, so that nobody signs in as them. Each has an open Session for the
      walker's tokens. All but one have the Master Switch on; that one is a Friend whose Avatar never shows.
- [ ] Friendships among the demo Users, with both switches on.
- [ ] 6 published Global Events: one under way, one later today and the others on the following days of the week, each
      at a Place of the campus map with its name and coordinates.
- [ ] 8 recruiting Quests, an Open and an Approval one on each of the four Boards, led by demo Users, each with a
      description and Sub Quests ahead at Places; the 공연 Board's two are Quests for Global Events, with their attending
      Sub Quests. Some have more than one Holder.
- [ ] One running Party, Open, for one of those Quests, whose members are Holders of it and Friends of the real
      accounts.
- [ ] The times count from the run: a later run moves them to the new day, so that a restart of `demo-seed` makes the
      data current again.
- [ ] Each run tells the apps that the Global Events changed.

### The real accounts

- [ ] `DEMO_ACCOUNT_EMAILS`, in `main-server/.env`, lists addresses separated by commas, in any case. Empty or left out,
      no account is prepared.
- [ ] A User with one of these addresses who has finished Onboarding becomes Friends with 5 demo Users, the Party's
      members and the one without Master Switch among them, receives Friend Requests from 2 others, an invitation into
      an Approval Quest whose Leader is a Friend, and a Meetup proposed by a Friend later today at a Place.
- [ ] Preparing an account twice adds nothing, and what already lies between the account and a demo User, such as a
      friendship the person ended and then asked for again, is left as it is.
- [ ] Once prepared, the account gets `friends-changed`, `quests-changed`, `meetups-changed` and `party-changed`.
- [ ] `demo-seed --watch` prepares an account within 5 seconds of its Onboarding, once per run.

### The walker

- [ ] Every 5 seconds, each demo User with the Master Switch on uploads a position along the shuttle's line, walking at
      a person's pace, the Users at different points and in both directions. Every position lies inside the Campus
      Boundary.
- [ ] The access tokens are signed for the demo Users' Sessions as the main server signs them, and a refused upload is
      logged without stopping the walker.
- [ ] Every 15 seconds outside weekdays 08:00 to 21:00 in Asia/Seoul, two vehicles go round the shuttle's stops, at the
      stops' places on the operator's drawing, through the worker's route and token.

### The menus

- [ ] The Co-op's, the dormitory's and the veterinary college's saved pages give the menus of today and the six days
      after: the daily pages as each day's page, and the veterinary week moved to the current week. The Co-op's
      restaurants are filtered as the collector filters them.
- [ ] The run exits with status 1 when the main server refuses a message.

### Documents and checks

- [ ] The root `README.md` has a short "Demo data" section. `main-server/README.md` has the details: the services, the
      settings, what the data holds, how a real account gets its share, and how to start again. `worker-server/README.md`
      names `pnpm demo:menus`.
- [ ] `main-server/.env.example` has `DEMO_ACCOUNT_EMAILS`, empty, with a comment.
- [ ] Vitest in main-server, against a database of the test's own: the seed run twice gives the same rows, and its
      content read through the routes as a real account sees it; an account prepared twice. The walker's path: a
      position at a distance along the line, the wrap at its end, both directions, and every position inside the Campus
      Boundary. Vitest in worker-server: the menus' messages for a given day.
- [ ] The four checks of main-server and worker-server pass.

## Comments
