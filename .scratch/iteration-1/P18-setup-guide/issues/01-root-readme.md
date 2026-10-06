# 01: The root README as the setup guide

Parent: [P18 spec](../spec.md)
Status: ready-for-human
Blocked by: none

## What to build

The root `README.md` is still the course template, with a short "Demo data" section under it. It becomes the guide
that takes a reader from a clean clone to the running servers, the admin site and the app on an Android phone, says
what the Iteration 1 demo shows, and lists what is known not to work. It is written in English and names nobody.

Its sections, in the spec's order:

1. What the project is: one paragraph.
2. What the demo demonstrates: the Iteration 1 features, its goal, what the prototype was meant to validate, and the
   three demo flows of P20 as what a User does.
3. The demo video: a placeholder line for its link, which a person fills in once P20 records it.
4. Known limitations and todos.
5. The development and execution environment used.
6. Requirements: the tools and their versions.
7. Setup from a clean clone.
8. Settings: every variable of every `.env.example`, by name, with a one-line description and where its value comes
   from, and no value.
9. Running the servers, with the demo data.
10. Running the admin site.
11. Running the app: Expo Go, the development build, reaching the servers from a phone, and the keys that must be
    registered with the signing key.
12. Running the tests of each project and of `flow-tests`.
13. Repository layout: one line per folder.
14. Data sources and attribution.
15. Links: the Wiki and each project's README.

Each project's README keeps what is specific to it. The root README gives the commands a reader runs in order and
links to the project READMEs for the rest, without repeating them. The commands are the ones the project READMEs give.
The "Demo data" section of the template is folded into "Running the servers".

The course reads the README on the demo branch `iteration-1-demo`: it must say how to run the demo, what the demo
demonstrates, and carry the short demo video or a link to it.

## Acceptance criteria

### Content

- [x] The sections are those above, in that order, under English headings. The course template's text is gone.
- [x] "What the project is" says in one paragraph what SNU Now is and for whom, in the terms of `GLOSSARY.md`.
- [x] "What the demo demonstrates" lists the Iteration 1 features by area (sign-in and Onboarding, the map, Friends,
      Quests and Matching, Parties, Global Events and the admin site, dining and shuttle, the timetable, Location
      Sharing), states the iteration's goal and what the prototype was meant to validate, and describes the event,
      Friend and campus services flows step by step as what a User does, not as endpoints.
- [x] "Demo video" holds a placeholder line for the link.
- [x] "Known limitations and todos" has at least:
  - Android only for the demo;
  - Kakao's map on ARM devices only;
  - background sharing stops when the User swipes the app away;
  - the shuttle's positions are computed from the operator's reports of a vehicle at a stop on its drawing;
  - a collected event needs an Administrator before it is published, unless the rules read its time and its place;
  - Users outside the Campus Boundary are hidden;
  - no dashes on the native map's lines;
  - the checks by hand on phones not yet done;
  - the registrations at Google and Kakao a person must make for a new signing key;

  and what the P13 to P19 tickets record under "For a person", "Not checked" and "Differences from the frame" that a
  reader would otherwise report as a defect.
- [x] "Development and execution environment" names the machine, operating system, tools, emulator and stack the
      project was built and run with.
- [x] "Requirements" names Node.js 24, pnpm 12.6.0, Docker with Compose, JDK 17, the Android SDK and an ARM phone or
      emulator with Google Play.
- [x] "Setup" is the commands from `git clone` to every server's `.env`, as the project READMEs give them.
- [x] "Settings" names every variable of the six `.env.example` files, and no variable that none of them holds. No
      value, key or secret appears.
- [x] "Running the servers" gives `docker compose up --build`, the demo profile `docker compose --profile demo up
      --build` with `DEMO_ACCOUNT_EMAILS`, and how to stop and reset.
- [x] "Running the app" covers Expo Go and its limits, the development build with `pnpm android`, the addresses a
      phone needs (the https tunnel), and which fingerprints of the signing key go to Kakao, Google and the main server.
- [x] "Running the tests" gives the four checks of each project, what each `pnpm test` needs, and `flow-tests`.
- [x] "Repository layout" has one line per top-level folder.
- [x] "Data sources and attribution" credits OpenStreetMap (ODbL) for the Campus Boundary, the shuttle's line and the
      Places and outlines taken from it, and 국토지리정보원's 연속수치지형도 under 공공누리 제1유형 for the national map's
      outlines and Places, and names Kakao, the SNU campus map, the Co-op's, the dormitory's and the veterinary
      college's menu pages, the university's events list and the shuttle operator.
- [x] "Links" points to the Wiki and to each project's README.

### Checks

- [x] `docker compose config` passes for the default and the demo profile, and `pnpm install --frozen-lockfile` passes
      in at least one project, run as written.
- [x] The setup's commands for the servers' `.env` files are run once in a clean export of the branch, as written.
- [x] Every setting named in the README exists in an `.env.example`, and every setting of the `.env.example` files is
      named in the README. The result is recorded under Comments.
- [ ] A person who did not write the README follows it on a clean machine and reaches a running system and a running
      app. Left for a person: it needs a clean machine, the Kakao keys and a phone.
- [ ] The README is checked against the state of `iteration-1-demo` when P20 cuts it, and the video link is filled in.
      Left for P20.

## Comments

### Decisions (2026-10-06)

- **The course template's text is gone.** The course asks nothing of the template itself; what it asks of the demo
  branch's README, how to run the demo, what it demonstrates and the video, is in "What the demo demonstrates", the
  line "To run the demo yourself" with its links, and "Demo video". The template's "Demo data" section became
  "Running the servers" > "Demo data".
- **Setup** repeats the project READMEs' commands in one order from `git clone`. The lines that copy a secret from
  `main-server/.env` to another server's `.env` are anchored (`grep '^WORKER_TOKEN='`), so that the commented
  example lines are not copied; the project READMEs say "the same line" without a command.
- **Settings** are one table per project, by name, with what the setting is and where its value comes from. The
  app's development settings, which no `.env.example` holds, are left to `mobile/README.md` by a link, so that the
  README names only what the `.env.example` files hold.
- **Known limitations** take, besides the spec's list, from the tickets' Comments what a reader would otherwise report
  as a defect: the checks by hand still open (P13-01, P14-01, P15-02, P17-01, P19), no dashes on the native lines
  (P15-02), the notification permission on Android 13 (P17-01), the app's own sample data in a build, and the
  Party features without a frame (P13-01). Differences in words or sizes from the wireframes are left to the tickets.
  Features not built are written as planned for later iterations.
- **Reaching the servers from a phone** names an https tunnel without a tool: the repository fixes none. A debug build
  on the same network can use the computer's address over http.
- **Placeholders** for a person: the demo video's link and the demo APK's link with its server address.

Checked:

- `docker compose config --quiet` passes, and `docker compose --profile demo config --services` lists the three demo
  services with the six others.
- `pnpm install --frozen-lockfile` passes in `socket-server` and `main-server` with Node.js 24.21.0 and pnpm 12.6.0.
- In a clean export of the branch (`git archive HEAD`), the setup's commands for the four servers' `.env` files ran as
  written: `main-server/.env` holds one each of `ACCESS_TOKEN_PRIVATE_KEY`, `ACCESS_TOKEN_PUBLIC_KEY`, `WORKER_TOKEN`
  and `MATCH_SERVER_TOKEN` and no stray line, each other server got its one line, and `docker compose config` resolves
  them for the main server. `docker compose up --build`, the admin site and the app were not started.
- The settings, by a script over the README and the six `.env.example` files: the 38 entries (27 distinct names:
  main-server 16, mobile 7, match-server 5, socket-server 4, worker-server 3, admin 3) are each in their project's
  table, no table names a setting its `.env.example` lacks, and no setting is named anywhere in the README that no
  `.env.example` holds.
- The README is formatted with the servers' Prettier settings.

For a person:

- Follow the README on a clean machine to a running system and app, with the Kakao keys and a phone.
- Add the demo video's link and the demo APK's link (P20), and check the README against `iteration-1-demo` when it is
  cut, including the features of P13-02, P13-03 and P14-02, which were built alongside.
- Confirm Google Cloud's Android OAuth client for `com.bonnieandclaude.snunow`, and name the tunnel's tool and
  addresses once the demo's are fixed.
- Publish the same guide to the Wiki when asked.

### Agent usage (2026-10-06)

Estimates, not read from the transcripts: about 35 minutes of agent time in one session. Tokens: about 7 M input, of
which about 6.7 M cache reads and 0.25 M cache writes, and about 0.04 M output. No subagents.
