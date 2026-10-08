# 04: Titles of Quests for a Global Event that the Leader may change

Parent: [P27 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

Choosing a Global Event in 파티 만들기 fills the title with the event's, and the User may change it before saving. The Leader may change it later in 파티 수정. A Quest's title is its own: it does not follow later changes to the Global Event's title, while the attending Sub Quest and the event's Badge and card still read the event.

The main server stops refusing a title change for a Quest with a Global Event, and creating a Quest for a Global Event accepts a title, taking the event's when none is given (as Matching's Quests do). The mock API follows the same rules.

## Acceptance criteria

- [ ] `PATCH` of a Quest's title succeeds for a Quest with a Global Event; the refusal `QUEST_TITLE_FROM_GLOBAL_EVENT` is gone.
- [ ] Creating a Quest for a Global Event with a title keeps that title; without one it takes the event's.
- [ ] After an Administrator renames the Global Event, the Quest keeps its title, and its attending Sub Quest reads the new event title.
- [ ] Matching's Quests are still titled with the event's title.
- [ ] In 파티 만들기 and 파티 수정 the title field is never locked. Choosing an event replaces the title with the event's; choosing another replaces it again; `행사 빼기` leaves it.
- [ ] The Quest's event Badge and card show the event's title.
- [ ] Server end-to-end tests and screen tests cover the above; `quest-settings`, which asserted the refusal, changes with it and the PR names it.
