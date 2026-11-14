# P03: The agentic map's invitations, Quest members, and the Friend view

Status: ready-for-agent

Schedule row: Iteration 4 P03, package C of the agentic map (a Plan becomes a Quest with its invitations, the invitee answers, and the Assistant reads Friends through one view), as far as the first path needs it.

References:
- `.scratch/iteration-4/agentic-map-design.md`: the design. Section 4 ("What stays on the map", "Cards nobody asked for"), section 5 ("Friends and location", "Parties and invitations", "A late member"), section 6.1 (the lunch storyline, its rules, and "When someone is late"), and section 7 ("What the Assistant may use", "What is never recorded or sent").
- `.scratch/iteration-4/agentic-map-work-split.md`: sections 3 (the promises between packages and how the five member states map onto the tables), 4 (who changes which files, and the order of schema changes), 5 (the first path), and 6 (its check).
- `.scratch/iteration-4/P01-agentic-map-engine/spec.md`: the contract of an answer, the gathering calculation, and the recalculation.
- `.scratch/iteration-4/P02-agentic-map-answer-screen/spec.md`: the screen that shows a Plan, and what it leaves to this package.
- `.scratch/iteration-4/P04-push-notifications/spec.md`: a received invitation is pushed from the one service that creates invitations, and a notification opens `/main?card=invitation:<invitationId>`.
- The team wireframe canvas, rows "1. 배고파" (boards "같이 ⑪" to "⑬" and "늦을 때"), "4. 행사", "5. 파티", and "9. 친구와 위치".
- ADR 0007 (test levels).

The screens call a Quest that several Users hold a "파티". This document says Quest, and keeps Party for the glossary's Party, the "파티 켜기" of the screens.

## Problem Statement

The Assistant answers "배고파, 민수랑 같이" with a Plan: a Restaurant, a time, a Merging Point, and each person's way. The Plan ends on the asker's screen. To eat together the asker has to make a Quest by hand, type its time and Place again, add the meeting as a second Sub Quest, and invite each Friend one at a time. The invited Friend gets a row that names the Quest and its Leader, and has to work out alone when to set out and whether the next Class can still be reached. The asker learns of an answer only by opening the Quest.

The Assistant reads a Friend's position in a private method of the meal Plan's service. Nothing keeps the next tool from reading a position some other way and saying more than the asker's map shows.

## Solution

One request turns the Plan on screen into a Quest: the main server calculates the Plan again from its conditions, makes the Quest with the Plan's title, its Sub Quests in the Plan's order, and an invitation for every Friend of the Plan, all at once. The numbers are the server's own, never the app's.

An invited User opens the invitation and sees their own way: where they set out from, when, how long they walk, the Merging Point when it lies on their way, and when they must leave for what follows. The way is calculated for the invitee from their own Timetable and their own location, and nothing of it goes back to the Leader.

Accepting and declining tell the Leader's app at once with a signal that says who answered, and a Quest carries the state of each of its members, so that the person chips of the Plan follow.

A Holder who is late reports the minutes, which the Quest keeps and the other Holders are told. After a decline the Leader is asked whether to change the Quest, only when the remaining people have a better Plan.

One service answers what a viewer sees of each Friend: the level, and the position that level allows. The Assistant reads Friends only through it.

## User Stories

1. As an SNU student, I want "이대로 초대" to make the Quest and send every invitation at once, so that I do not type the Plan again.
2. As an SNU student, I want the Quest to hold the Plan's steps in order, the meeting first and the meal after it, so that everyone sees the same steps.
3. As an SNU student, I want the Quest made only from the Plan I saw, so that a Plan that changed while I looked is not sent in its place.
4. As an SNU student, I want a second press of "이대로 초대" to make no second Quest.
5. As an invited Friend, I want the invitation to show when I set out and how long I walk, so that I can answer without working it out.
6. As an invited Friend, I want the invitation to say where I meet the Leader on the way, when that Place is on my way.
7. As an invited Friend, I want the invitation to say when I must leave for my next Class, so that I know the meal fits.
8. As an invited Friend, I want my way to start from where I really am when no Class comes right before, so that the minutes are right.
9. As an invited Friend who is off campus, I want the invitation to say that no way can be drawn, so that I am not shown a wrong one.
10. As an invited Friend, I want nothing of my way, my arrival, or my location to reach the Leader, so that an invitation cannot be used to find me.
11. As an invited Friend, I want the invitation to show nobody else's location.
12. As the Leader, I want the chip of a Friend who accepted to turn to ✓ while I look, so that I know who comes.
13. As the Leader, I want to see at once that a Friend declined, so that I can decide what to do.
14. As a Holder, I want the Quest to say who was invited and who accepted, so that I see the same chips as the Leader.
15. As a Holder who is late, I want to report the minutes with one press, so that the others know without my writing to each.
16. As a Holder, I want to see "민수 · 5분 늦음" on the Quest, so that I know why a Friend is not there yet.
17. As a late Holder, I want the others to receive only the minutes and my arrival time, never my location.
18. As the Leader, I want to be asked whether to change the Quest after a decline only when the people left have a better Plan, so that I am not asked for nothing.
19. As a Friend, I want the Assistant to use my location only when the asker's map shows it, whichever tool answers.
20. As a developer of the Assistant, I want one service to give a Friend's level and position, so that a new tool cannot read more than the map shows.
21. As a developer of the answer screen, I want typed client functions and stored copies of real replies for every endpoint of this package, so that the screen never meets a shape the server does not send.
22. As a User of an app that has not been updated, I want invitations to work as before.

## Implementation Decisions

### A Plan becomes a Quest

`POST /plans`, with an `Idempotency-Key`, as making a Quest by hand has.

```ts
// The body. The app sends back the conditions of the answer on screen and names the Plan it shows.
interface MakePlanQuest {
  input: PlanInput;              // the answer's input, as a recalculation takes it
  planId: string;                // the Plan on screen
  startAt: string;               // that Plan's start, as the answer gave it
  location: Position | null;     // where the asker is now, as a recalculation takes it
}

// The reply, 201.
interface PlanQuest {
  quest: Quest;                                   // as the asker reads any Quest they hold
  invitations: { id: string; userId: string }[];  // one for each Friend of the Plan, in the Plan's order
}
```

- The server plans again through the service the Assistant's tool and the recalculation call, with the time now and the location given, and takes the Plan whose id is `planId`. It reads nothing else of a Plan from the app.
- **Refused with 409 `PLAN_CHANGED`** when the recalculation has no Plan of that id, or that Plan no longer starts at `startAt`. The app then recalculates and shows the answer as it is now.
- **Refused with 400** as a recalculation is: a first person who is not the asker, a person who is not the asker's Friend, a date out of reach, a body of another shape. **Refused with 400 `PLAN_ALONE`** for a Plan with no Friend: what "여기로" does is package D's.
- **The Quest**: the Plan's title; the asker leads it and is its only Holder; Closed; on no Board; capacity 4, or the number of people of the Plan when that is more.
- **The Sub Quests** are the Plan's, in its order, each at its Place. Each ends where the next starts, and the last ends at the Plan's end, so that a step passes by time and the Quest leaves the list once the meal is over. A mark of done stays each Holder's own.
- **The invitations** go to every other person of the Plan, and are created by the one service that creates invitations, inside the transaction that makes the Quest. The asker and each invitee are told with `quests-changed`, as an invitation tells today.
- Nothing is stored of a Plan beyond the Quest, its Sub Quests, and its invitations.

### The invitee's own way

`GET /quest-invitations/:id`, with the optional query `latitude` and `longitude` (both or neither): where the invitee's phone is now. Only the invited User reads it; anyone else gets 404 `QUEST_INVITATION_NOT_FOUND`, as for an invitation that waits no more.

```ts
interface InvitationCard {
  id: string;
  sentAt: string;
  quest: QuestSummary;                    // as the list of invitations gives it
  holders: { id: string; name: string }[];   // who is in so far, the Leader first
  steps: { id: string; title: string; startsAt: string | null; endsAt: string | null; place: SubQuestPlace | null }[];
  // Where and when everyone is together: the Quest's destination step. Null when no step ahead has a start and a Place of the list.
  gathering: { place: PlacePoint; startAt: string; endAt: string | null } | null;
  way: OwnWay | null;                     // null when there is no gathering
}

// The invitee's own way to the gathering. Nothing here is ever sent to anyone else.
interface OwnWay {
  // 'ok' with an origin; 'unknown' when neither a Class nor a location says where they set out from;
  // 'off-campus' when only a location could say it and the phone is outside the Campus Boundary;
  // 'busy' when the invitee has no Free Time at the gathering's time.
  status: 'ok' | 'unknown' | 'off-campus' | 'busy';
  origin: { place: PlacePoint; basis: 'timetable' | 'location' } | null;
  leaveAt: string | null;                 // when they set out
  walkMinutes: number | null;             // their whole way, through the Merging Point when they take it
  arriveAt: string | null;                // when they are at the gathering's Place: its start, or later when they cannot make it
  meeting: { place: PlacePoint; at: string } | null;   // their Merging Point
  leaveBy: string | null;                 // when they must leave for what follows
  next: { startAt: string; place: PlacePoint | null } | null;
  lines: AnswerLine[];                    // at most two, written by the server
  scene: MapScene;                        // their own way only, in the shape an answer's scene has
}
```

- **The destination step** is the first Sub Quest ahead that has a start and a Place of the list, in the order of their starts. When that step is a **meeting step**, the destination is the step after it.
- **A meeting step** is recognised by what the making of a Quest from a Plan writes, with nothing more stored: it ends where the next step starts, and its start plus the walk from its Place to the next step's Place is the next step's start. A Sub Quest a Holder wrote by hand almost never has both.
- **Where the invitee sets out from** follows the gathering calculation's rule for the asker of a Plan, with the invitee in the asker's place: the Place of the Class or Sub Quest that keeps them until the gathering; else the Place of the location the request gives; else the Place of an item that ended at most 15 minutes ago; else unknown. The calculation is called as it is, for one person and one Place.
- **The Merging Point** is the invitee's when the meeting step's Place lies on their way, by the calculation's own rule (going by it takes at most one minute longer than going straight), and they can be there by its start. Then they set out to be there at its start, and walk on with the others. Otherwise they go straight. An invitee whose way starts at the meeting step's Place or at the destination has none.
- **Setting out** is as late as still has them there at the start. An invitee who cannot be there by the start sets out when they are ready, and `arriveAt` says when they arrive.
- **Leave-by** is the start of their next item minus the walk from the destination to its Place, as in the calculation.
- **The words**: "12:15에 수업이 끝나면 바로 나서면 돼요. 걸어서 18분." when they set out the moment a Class ends; "16:56에 나서면 돼요. 걸어서 14분." otherwise; "같은 건물이라 걷지 않아도 돼요." for a way of 0 minutes; "12:37에야 도착해요. 걸어서 17분." when they cannot make the start; "캠퍼스 밖이라 길은 그리지 못해요." off campus; "그 시간에는 다른 일정이 있어요." when busy; no line of the way when the origin is unknown. A second line, when something follows: "13:00 수업이라 12:59엔 나서요.", or "일정이라" for a Sub Quest.
- **The scene** holds the invitee at their origin, the destination as the pick, the Place of what follows, one route of the invitee for each leg, and the flags "12:18 유상과 만남" at the Merging Point (the Leader's name) and "12:33 학생회관식당에서 식사" at the destination (the step's start and title). It holds no other person.
- The invitee's Timetable and held Sub Quests are read as the Assistant reads a User's day.
- The reply is computed at each read and nothing of it is stored or sent to another User. Reading an invitation sends no signal.

### Members and the signals of an answer

A Quest, as a Holder reads it, carries its members:

```ts
type MemberState = 'invited' | 'accepted' | 'late' | 'declined';
interface QuestMember {
  user: { id: string; name: string; department: string };
  state: MemberState;
  lateMinutes: number | null;    // set with 'late'
}
```

- The Holders come first, in the order they entered, then the invited, then the declined, each by when the invitation was sent.
- The design's five states map onto the tables as the work split says: invited is a waiting invitation; accepted is a Holder; N minutes late is a Holder's late minutes; declined is the record of a decline; and a member who dropped out is no longer listed, as is a User whose invitation the Leader cancelled.
- `late` and `declined` are sent once the schema holds them (below). Until then a User who declined is not listed.
- A Class Quest has no members. An app before this change ignores the field, and the app takes a Quest without it.
- **Accepting** sends the Leader `invitation-accepted` with `{ questId, userId }`, and **declining** `invitation-declined` with the same, beside the `quests-changed` each sends today. An acceptance by the Leader's own doing sends none. A decline also sends `quests-changed` to the other Holders, whose members changed.
- **The app** passes a signal's payload on. `invitation-accepted` and `invitation-declined` fetch the Quests and the sent invitations again, and reach whoever listens with the Quest and the User they name, so that the screen of a Plan can mark the chip before the fetch answers.

### A late Holder

`POST /quests/:questId/late` with `{ minutes, location }`: a Holder reports being late.

- `minutes` is a whole number from 1 to 120. The Quest keeps it on the Holder, and a later report replaces it.
- The server answers with the Holder's own way as it now is (`OwnWay`): they set out `minutes` later than their way without the lateness has them set out, and the way is worked out again from then, from the location given. The Quest's own Sub Quests are left out of the Holder's day for it.
- The other Holders are told with `late` and `{ questId, userId, minutes, arriveAt }`: the minutes and the arrival that follows, and nothing of where the Holder is. Every Holder is told with `quests-changed`.
- The preview before the report, and what changes for each other Holder, are package A's.

### After a decline

`GET /plans/:questId/better`: only the Leader reads it.

- The server plans again for the people left: the Leader, the other Holders, and the invited who have not answered, for the day and the meal of the Quest's destination step, with nothing else fixed, leaving the Quest's own Sub Quests out of everyone's day.
- It answers `{ current: { place, startAt, endAt, togetherMinutes }, better: Plan | null, input: PlanInput }`. `better` is the first Plan when it is at another Place or starts at another time and has more minutes together than the Quest as it stands; otherwise null.
- `PUT /plans/:questId` with `{ input, planId, startAt, location }` changes the Quest to that Plan, checked by recalculation as the making is: the title and the Sub Quests are replaced, the Holders stay, an invitation that waits stays, and every Holder and invitee is told with `plan-changed` and `{ questId }`, and with `quests-changed`.
- The conditions the asker fixed for the first Plan (a window, a Place, a constraint) are not kept with a Quest, so a Plan offered after a decline does not hold them. The Leader sees the offer before anything changes.

### The schema

One migration, in this package's place in the order of schema changes, made from the schema on the iteration branch at that moment:

- `quest_holders.late_minutes`, an integer from 1 to 120 or null.
- `quest_declines`, one row for a User who declined the Leader's invitation into a Quest, with the time. A decline deletes the invitation, as today, and writes the row; the row goes when the User is invited again or enters the Quest, and with the Quest.

A decline is kept in a table of its own, not as a mark on the invitation: the library's room requests create and read invitations themselves, and every reader of invitations takes a row for an invitation that waits.

Everything up to "A late Holder" is built on the schema as it is.

### The Friend view

One service of the main server answers what a viewer sees of each Friend:

```ts
type FriendLevel = 'timetable' | 'building' | 'exact';
interface FriendView {
  id: string;
  name: string;
  department: string;
  level: FriendLevel;            // what the viewer sees of the Friend now
  position: { latitude: number; longitude: number; measuredAt: string } | null;   // only at 'exact'
  placeId: string | null;        // the Place of the position; at 'building' all there is of it
}
```

- It is read from today's switches: a Friend whose position the viewer may see now is at `exact`, with that position and its Place; every other Friend is at `timetable`, with no position and no Place. A Friend who shares but has no position kept looks as one who does not share. `building` is in the type for the per-Friend levels and is not given yet.
- A Friend's Timetable is visible at every level, so the view lists every Friend.
- The meal Plan reads its Friends, their positions, and their levels through it, in the one place it reads positions today, and every other tool of the Assistant that reads who the User's Friends are reads the view too. No part of the Assistant imports the position store, the visibility rule, or the location sharing service.
- A Plan's scene marks a Friend by the level the view gave. With today's switches that is exact or the Timetable, which the scene already tells apart; the mark of the building level comes with the levels.
- The map's own answers (`GET /friends`, `GET /positions`, and the `position` signal) stay as they are: they already follow the visibility rule the view reads.

### The app

- The contract is declared in the app as it is in the server: the body and reply of `POST /plans`, the invitation's card, a Quest's members, and the signals' payloads.
- The client has `makePlanQuest(making, idempotencyKey)`, `getInvitationCard(invitationId, location)`, and, with their tickets, `reportLate(questId, minutes, location)`, `getBetterPlan(questId)`, and `changePlanQuest(questId, making)`. Each checks the reply's shape.
- The mock client answers each from a stored copy of the main server's real reply for the worked example (Tuesday 11:50, the asker and 민수). It does not calculate.
- The buttons "이대로 초대", the card of a received invitation, and the person chips are package B's.

## Testing Decisions

A good test states a behaviour a User or another package depends on, through a public seam, with expected values taken from the design's worked example or chosen by hand, never recomputed the way the code does.

- **Making a Quest from a Plan, integration tests.** The seam is `POST /plans` over the started server with the scripted model, the seed's walking table, and Places, on the stage the meal Plan's tests use. The worked example with 민수: the Quest's title, Leader, Join Policy, and capacity; the Sub Quests in order with their times and Places; the invitation the Friend then lists; the signals to both. With both Friends: the meeting step first. The refusals: a Plan that changed, a Plan alone, a person who is no Friend. A repeat with the same key makes one Quest.
- **The invitee's own way, unit tests.** The seam is the pure function from the Quest's steps, the invitee's day, their location's Place, and the walking times to their way. The worked example on the seed's walking table: 민수 through the Merging Point (sets out at 12:15, 18 minutes), 지은 straight (5 minutes, leave-by for the 13:00 Class), and 민수 at 302동식당 (0 minutes). Boundaries on a small walking table: a detour of one minute and of two; reaching the meeting step exactly at its start and a minute after; a step that only ends where the next starts; a way that starts at the meeting step's Place; arriving a minute after the start; no step with a Place; an unknown origin; a location off campus with and without a Class before; and no Free Time at the gathering.
- **The invitee's card, integration tests.** The seam is `GET /quest-invitations/:id` over the started server. The card of the worked example; the location of the request used only when no Class comes right before; another User, the Leader included, gets 404; nothing is signalled; and the reply holds no position of another person.
- **Members and signals, integration tests.** The seam is the Quest a Holder reads and the signals on Redis. Invited then accepted then a second invitee declining; the order of the members; `invitation-accepted` and `invitation-declined` reach the Leader with the Quest and the User and reach nobody else; a Class Quest has no members.
- **The Friend view, integration tests.** The seam is the service over the started server with real switches: a Friend seen is exact with their position and its Place; a Friend whose switch, whose own Master Switch, or the viewer's Master Switch is off, or who has no position kept, is at the Timetable with no position; a Friend seen only through a common Party is exact; and a User who is no Friend is not listed. For each tool of the Assistant that reads Friends, with the view answering "Timetable only" for a Friend who has a position: the tool's result, what the model is given, and the reply hold no position and no Place beyond the Timetable's. A unit test reads the Assistant's sources and fails when one imports the position store, the visibility rule, or the location sharing service.
- **The app, unit and integration tests.** The stored copies pass the app's checks of each reply; the mock client returns them; the live connection passes a payload on; and the two signals fetch the Quests again and reach a listener.
- **The first path's steps 4 to 7** are run once on the local stack, two Users over the real servers and the socket: the Leader makes the Quest from the Plan, the invitation is in the invitee's list, the invitee's card shows their own way, and the acceptance reaches the Leader's socket.
- Prior art: the meal Plan's tests and their stage, the invitation and signal tests, the visibility tests, the gathering unit tests and their worked example, and the app's API answer tests.
- No evaluation suite is written or run in this task.

## Out of Scope

- The buttons and cards that show any of this: "이대로 초대", the card of a received invitation, the person chips, the flag of a Quest on the everyday map, and the question after a decline. Package B's.
- The push of an invitation and its richer words, the leave-by notification, the notification list's stored rows, and "파티 켜기" on a notification. Packages D and P04.
- The preview of being late, what changes for each other Holder when one is late, and the question whether to go anyway or drop out. Package A's.
- Storing the three Friend levels, sending a location at the building level, and the two moments the Assistant asks. Iteration 5.
- The answers for events and recruiting Quests (rows 4 and 5), a recruiting Quest made from a Plan, and the start rounded up to ten minutes.
- An invitation link sent through a messenger.
- A constraint an invited person sets, and keeping the asker's conditions with a Quest.
- The requirements and the acceptance test document that say a Friend's Classes are not shown.

## Further Notes

- The invitee's way uses the calculation's rules, so for an invitee who is where the Plan took them to be it gives the Plan's own numbers: 민수 sets out at 12:15 and walks 18 minutes through 301동, as the Plan's part of him says.
- An invitee the Plan did not put at the Merging Point takes it when it lies on their way, and one the Plan did put there goes straight when they cannot reach it in time. The step's title still names whom the Plan put there.
- The first person chip states of the wireframe, "아직 안 봄" and "수락", are the states `invited` and `accepted`. Whether an invitation was opened is not recorded.
- Until the schema holds a decline, the Leader's app learns of one from the signal alone.
