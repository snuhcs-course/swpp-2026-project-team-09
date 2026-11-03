# 03: The HE seed: accounts, Friends, Timetables and recruiting Quests

Parent: [P15 spec](../spec.md) ("The HE accounts", "The Timetables", "The recruiting Quests", "The HE seed")
Status: ready-for-agent
Blocked by: 01 (the account table and the sign-in by key)

## What to build

`he-seed`, a main-server command beside the demo seed, writes the confirmed HE data. Every HE account then starts at the first run with Friends, a Timetable and recruiting Quests to join. The data is the table of ticket 01, extended with the spec's tables.

## Acceptance criteria

- [ ] **Users:** seven Users that have not finished Onboarding, with the spec's names, departments, Google names and Friend IDs, and the Master Switch off.
- [ ] **Friendships:** the accepted friendships of the spec's table and no others, with the default switches. There are no Friend Requests, Quest invitations or Party memberships.
- [ ] **Timetables:** the spec's Timetables, Monday to Friday. Monday repeats Wednesday's Classes and Tuesday repeats Thursday's. Each Class time has its campus-map Place and no room.
- [ ] **Recruiting Quests:** the eight of the spec's table, each with:
  - the Leader as the only Holder;
  - the Board, the Join Policy and the capacity given;
  - a short recruiting post in Korean;
  - one Sub Quest at the time and Place given.

  #6 goes to the demo `band-show` Global Event through its attending Sub Quest.
- [ ] **Dates:** every time is a fixed date of the week of 2026-11-04 in Korean time.
- [ ] **Re-runs:** rows have stable ids. A run creates only what is missing and never overwrites, so a second run changes nothing and an onboarded account keeps its answers.
- [ ] **Missing prerequisites:** without the campus Places or the demo `band-show` Global Event, the command stops with a message that names what is missing.
- [ ] **Where it runs:** inside the main-server container from the built image, as the demo seed's command does.
- [ ] **Seed integration test**, with the clock at 2026-11-04 15:30 KST and CI green on the HE branch (prior art: the `demo-seed`, `free-time-judgement` and `recruiting-quests` integration tests):
  - each account signs in by key and finishes Onboarding through the API;
  - the test then checks the account's friend list, its Classes and the eight recruiting Quests, with Leaders, capacities and recruiting state;
  - through the Free Time module, it checks the spec's effects during the evaluation, at Wednesday dinner, for the round partners and at Thursday lunch;
  - a second run changes nothing, and an onboarded account's answers survive it;
  - a missing demo Global Event stops the seed.
