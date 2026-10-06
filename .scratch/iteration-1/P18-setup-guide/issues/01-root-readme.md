# 01: The root README as the setup guide

Parent: [P18 spec](../spec.md)
Status: ready-for-agent
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

- [ ] The sections are those above, in that order, under English headings. The course template's text is gone.
- [ ] "What the project is" says in one paragraph what SNU Now is and for whom, in the terms of `GLOSSARY.md`.
- [ ] "What the demo demonstrates" lists the Iteration 1 features by area (sign-in and Onboarding, the map, Friends,
      Quests and Matching, Parties, Global Events and the admin site, dining and shuttle, the timetable, Location
      Sharing), states the iteration's goal and what the prototype was meant to validate, and describes the event,
      Friend and campus services flows step by step as what a User does, not as endpoints.
- [ ] "Demo video" holds a placeholder line for the link.
- [ ] "Known limitations and todos" has at least:
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
- [ ] "Development and execution environment" names the machine, operating system, tools, emulator and stack the
      project was built and run with.
- [ ] "Requirements" names Node.js 24, pnpm 12.6.0, Docker with Compose, JDK 17, the Android SDK and an ARM phone or
      emulator with Google Play.
- [ ] "Setup" is the commands from `git clone` to every server's `.env`, as the project READMEs give them.
- [ ] "Settings" names every variable of the six `.env.example` files, and no variable that none of them holds. No
      value, key or secret appears.
- [ ] "Running the servers" gives `docker compose up --build`, the demo profile `docker compose --profile demo up
      --build` with `DEMO_ACCOUNT_EMAILS`, and how to stop and reset.
- [ ] "Running the app" covers Expo Go and its limits, the development build with `pnpm android`, the addresses a
      phone needs (the https tunnel), and which fingerprints of the signing key go to Kakao, Google and the main server.
- [ ] "Running the tests" gives the four checks of each project, what each `pnpm test` needs, and `flow-tests`.
- [ ] "Repository layout" has one line per top-level folder.
- [ ] "Data sources and attribution" credits OpenStreetMap (ODbL) for the Campus Boundary, the shuttle's line and the
      Places and outlines taken from it, and 국토지리정보원's 연속수치지형도 under 공공누리 제1유형 for the national map's
      outlines and Places, and names Kakao, the SNU campus map, the Co-op's, the dormitory's and the veterinary
      college's menu pages, the university's events list and the shuttle operator.
- [ ] "Links" points to the Wiki and to each project's README.

### Checks

- [ ] `docker compose config` passes for the default and the demo profile, and `pnpm install --frozen-lockfile` passes
      in at least one project, run as written.
- [ ] The setup's commands for the servers' `.env` files are run once in a clean export of the branch, as written.
- [ ] Every setting named in the README exists in an `.env.example`, and every setting of the `.env.example` files is
      named in the README. The result is recorded under Comments.
- [ ] A person who did not write the README follows it on a clean machine and reaches a running system and a running
      app. Left for a person: it needs a clean machine, the Kakao keys and a phone.
- [ ] The README is checked against the state of `iteration-1-demo` when P20 cuts it, and the video link is filled in.
      Left for P20.
