# P01: The agentic map's engine and its contract

Status: ready-for-agent

Schedule row: Iteration 4 P01, package A of the agentic map (the engine and the contract the other three packages rely on).

References:
- `.scratch/iteration-4/agentic-map-design.md`: the design. Sections 1, 4, 5 ("Depth and measures", "The time band", "A late member", "Location questions"), 6.1 (the lunch scene and its worked example), and 7 ("What the Assistant may use").
- `.scratch/iteration-4/agentic-map-work-split.md`: sections 3 (what the first pull request settles), 4 (who changes which files), and 5 (the plan through Sunday).
- ADR 0005 (the Assistant runs in the main server, without an agent framework), ADR 0009 (new capabilities join the chat as tools and prompt fragments), ADR 0010 (Travel Time from the walking table), ADR 0011 (when a Restaurant is open), and ADR 0007 (test levels).

## Problem Statement

A User who is hungry between Classes and wants to eat with a Friend has to work out several things at once: when the Friend's Class ends and where, how long each of them walks to each Restaurant, which Restaurant leaves the longest time to eat before the next Class, and whether they could meet on the way. The Assistant answers such a question today with Restaurant cards in a chat. The cards order Restaurants by the longest walk, they say nothing about where the two could meet, and the answer cannot be corrected without writing another message.

The agentic map's design answers the question on the map: one Place, one time, a Merging Point, and one route per person, with the other candidates one arrow away. The other three packages (the answer screen, invitations, and notifications and bookings) cannot start against real data until the server computes such an answer and the shape of the answer is fixed.

## Solution

The main server decides a meal's Plan by calculation. From each person's Timetable, the location the asker may see, and the campus walking table, it finds for every open Restaurant when everyone can be there and when the first of them must leave, adds a Merging Point where a Friend's way passes the asker's starting Place, and orders the Restaurants by the time everyone is together. The language model only turns the User's words into the conditions (who, which day, and which meal) and writes one sentence. Every number is the server's.

The answer comes back through the Assistant's existing endpoint in a new shape that the app and the server share: the conditions the answer used, the Plans in order, and for each Plan its map scene, its time band, its two lines, and its basis. An app that does not say it can draw an answer is answered as before.

A change made on the map, a drag of the time band or a changed condition chip, sends the conditions back and is recalculated without the language model.

## User Stories

1. As an SNU student, I want to say "배고파, 민수랑 같이" and get one Restaurant with a time, so that I do not compare walking times and Timetables myself.
2. As an SNU student, I want the Plan to end early enough for everyone's next Class, so that nobody is late.
3. As an SNU student, I want the Restaurant where we can eat together longest to come first, so that the first answer is the one I would pick.
4. As an SNU student, I want to see where I meet a Friend whose way passes my Place, so that we walk together.
5. As an SNU student, I want each person's walking minutes and the time they set out, so that I can see the Plan is feasible.
6. As an SNU student, I want the other Restaurants one arrow away, so that I can choose another without asking again.
7. As an SNU student, I want a Restaurant that does not fit to be shown with the reason, so that I know why my usual Restaurant is missing.
8. As an SNU student, I want to be told when no Restaurant fits and why, so that I can change the conditions.
9. As an SNU student, I want "배고파" alone to work the same way, so that I get a Restaurant on my way to the next Class.
10. As an SNU student, I want the Plan to start from the Place of the Class I just left, so that I do not have to say where I am.
11. As an SNU student, I want the Plan to use where I am now when I have been in Free Time for a while, so that the walking minutes are right.
12. As a Friend, I want the Assistant to use my location only when the asker's map shows it, so that asking the Assistant reveals no more than looking at the map.
13. As a Friend who shows only my Timetable, I want the Place of my Class to be used only at the end of that Class and for 15 minutes after, so that no position is made up for me.
14. As a Friend, I want my course names and rooms never to reach the asker or the model, so that only the Place and the end time of a Class are shown.
15. As an SNU student, I want the answer to say what it rests on, so that I can check a time that looks wrong.
16. As an SNU student, I want to drag the time band and see the Plan recalculated at once, so that correcting the answer is faster than writing.
17. As an SNU student, I want to remove a Friend's chip and see the Plan recalculated, so that I can compare eating alone and together.
18. As an SNU student, I want a recalculation to give the same Plan as the first answer under the same conditions, so that the map and the words agree.
19. As a developer of the answer screen, I want the real answer for the Tuesday 11:50 example from the running server, so that I draw real data from the first day.
20. As a developer of invitations, I want a Plan to carry the title, the Sub Quests, and the people of the Quest it becomes, so that the Quest can be made from it without another calculation.
21. As a developer of the answer screen, I want the app's test data to be a copy of a real answer, so that the screen never meets a shape the server does not send.
22. As a User of an app that has not been updated, I want the Assistant to answer as before, so that an update of the server does not break my app.
23. As a developer on the team, I want every Plan's numbers to add up from the walking table, so that the measures of the design (everyone on time, time together) can be computed from the answers.

## Implementation Decisions

### The contract

The request to the Assistant gains an optional **request context**, and the reply an **answer**. Both are declared twice with the same shape: in the app's Assistant types and in the main server's Assistant DTOs. Times are Korea time with the offset, clock times are `HH:MM`, and walks are whole minutes.

```ts
interface Position { latitude: number; longitude: number }

// What the app knows when the User asks.
interface RequestContext {
  location: Position | null;                       // where the User is now
  viewport: { south: number; west: number; north: number; east: number } | null;  // the visible map area
  tapped: { kind: 'place'; placeId: string } | { kind: 'friend'; userId: string } | null;
  conditions: PlanInput | null;                    // the condition chips of the answer on screen
  planId: string | null;                           // the Plan on screen
}

// The conditions of a Plan: what a recalculation needs, and nothing the server can read itself.
interface PlanInput {
  kind: 'meal';
  date: string;                                    // YYYY-MM-DD in Korea
  meal: 'lunch' | 'dinner';
  people: PlanPerson[];                            // everyone of the Plan, the asker first
  window: { from: string | null; until: string | null };  // what the User fixed on the time band or in words
  placeId: string | null;                          // the Place the User fixed, or null
}
interface PlanPerson { userId: string; constraints: PersonConstraint[] }
// `source` says who set it: the asker (words, a tap, a drag) or the person it is about.
type PersonConstraint =
  | { kind: 'from'; placeId: string; source: 'asker' | 'person' }
  | { kind: 'notBefore'; time: string; source: 'asker' | 'person' }
  | { kind: 'leaveBy'; time: string; source: 'asker' | 'person' };

// An answer drawn on the map.
interface AnswerReply {
  input: PlanInput;                                // send it back, changed, to recalculate
  chips: ConditionChip[];
  plans: Plan[];                                   // the Assistant's pick first; the arrows browse the rest
  dropped: DroppedPlace[];                         // considered, but they do not fit
  noPlan: { reason: 'no-menu' | 'no-shared-time' | 'no-fit'; lines: AnswerLine[] } | null;
}
interface ConditionChip { kind: 'origin' | 'until' | 'person'; text: string; userId: string | null }
type AnswerLine = { text: string; strong: boolean }[];
interface PlacePoint { placeId: string; label: string; latitude: number; longitude: number }
interface DroppedPlace { place: PlacePoint; reason: string }

interface Plan {
  id: string;                                      // unique within the answer
  title: string;                                   // the title of the Quest the Plan becomes
  place: PlacePoint;
  startAt: string;                                 // when everyone is there
  endAt: string;                                   // when the first must leave
  togetherMinutes: number;
  meeting: { place: PlacePoint; at: string; userIds: string[] } | null;   // the Merging Point
  parts: PlanPart[];                               // each person's part of the Plan, the asker first
  subQuests: { at: string; placeId: string; title: string }[];           // the Sub Quests of that Quest
  lines: AnswerLine[];                             // at most two
  basis: string[];
  scene: MapScene;
  band: TimeBand;
}
interface PlanPart {
  userId: string;
  name: string;
  me: boolean;
  origin: { place: PlacePoint; basis: 'timetable' | 'location' | 'chosen' } | null;  // null: position unknown
  leaveAt: string | null;                          // when they set out to be there at startAt
  walkMinutes: number | null;
  leaveBy: string | null;                          // null when nothing follows
  next: { startAt: string; place: PlacePoint | null } | null;
}

// What the map draws, by meaning. The app decides colours, camera, and label sides.
interface MapScene {
  people: { userId: string; name: string; me: boolean; at: Position; source: 'exact' | 'timetable'; tag: string | null }[];
  places: { place: PlacePoint; role: 'pick' | 'candidate' | 'dropped' | 'next' | 'meeting'; tag: string | null }[];
  routes: { userId: string; role: 'me' | 'friend' | 'next'; from: Position; to: Position; minutes: number }[];
  flags: { at: Position; text: string; role: 'place' | 'meeting' }[];
}
interface TimeBand {
  range: { startAt: string; endAt: string };
  now: string;
  lanes: { userId: string; name: string; busy: { startAt: string; endAt: string }[] }[];
  startAt: string;
  endAt: string;
  text: string;
}
```

- The app says it can draw an answer with a new client capability, `answer`. Only then does the Assistant plan a meal on the map; otherwise it answers with Restaurant cards as before. The reply always carries `answer`, null when there is none; an app that does not know the field ignores it.
- `PlanInput` holds only what the User or a person decided. Timetables, locations, menus, and walking times are read by the server at each calculation, never taken from the app.
- The first person of `people` is the asker. A request whose first person is another User is refused.
- A constraint's `source` is carried from the start, so that a constraint an invited person sets can be added later. Only the asker sets constraints for now.
- The server writes the answer's words: the chips, the two lines, the basis, the flags, the reason a Restaurant was dropped, and the title and the Sub Quests of the Quest the Plan becomes. A recalculation therefore words the answer as the first answer did. The model's own sentence stays in the reply's text.
- A Plan carries everything a Quest is made from: its title, its Sub Quests, its Place, its start, and its people.
- Everyone is at the Plan's Place at its start. A person's part says when they set out to be there then, and how long they walk.

### The gathering calculation

A pure module: it takes the people, the candidate Places, the meal's window, the time now, and the walking times, and returns the candidates that fit in order, with those it dropped. It knows nothing of the database, the model, or the wording.

- **Who is free when.** Each person's Free Time on the day comes from their Classes and the timed Sub Quests of the Quests they hold. The Plan lies in the earliest stretch, inside the meal's window and from now on, that everyone shares and in which at least one Restaurant fits. Lunch is 11:00 to 14:30, and dinner 17:00 to 19:30.
- **Where a person sets out from.**
  1. A person who is busy until the shared stretch starts sets out from the Place of that Class or Sub Quest (basis: Timetable).
  2. A person who is free now sets out from the Place of their location: for the asker the location of the request, and for a Friend the position the asker's map shows.
  3. Without one, from the Place of the item that ended at most 15 minutes before now (basis: Timetable).
  4. Otherwise the position is unknown. No walk is counted for that person and no route is drawn; only their next item limits the Plan.
- **Minutes.** A walk is the walking table's seconds between two Places, rounded up to whole minutes for each leg. Every time is a whole minute, so that the times shown add up. A walk inside one Place is 0 minutes. Only walking is counted.
- **The earliest arrival.** The time a person is ready, plus the walk.
- **The Merging Point.** A Friend whose way to the Restaurant passes the asker's starting Place meets the asker there: going by that Place takes the Friend at most one minute longer than going straight. They walk the rest together, and can arrive once the last of them has reached the Merging Point. There is no Merging Point when the Restaurant stands at the asker's or at that Friend's starting Place, and never one between two Friends.
- **Leave-by.** The start of a person's next item, minus the walk from the Restaurant to its Place. An item without a Place is reached at its start. A person with nothing after has none.
- **Together.** From the latest of the earliest arrivals, not before the meal's window opens, to the earliest leave-by, not after the window closes. A Restaurant fits when that is at least 15 minutes.
- **Setting out.** Everyone sets out as late as still has them at the Restaurant when the time together starts, and the Merging Point's time follows from that.
- **Order.** The longest time together first, then the earlier start, then the Restaurant's name.
- **Dropped.** An open Restaurant that does not fit is returned with the person who could stay the shortest and the minutes they would have.
- **Candidates.** The Restaurants that have a Place and are open for the meal that day.

The calculation follows the design's arithmetic: whole minutes, each leg rounded up, no further margin before a Class, and no rounding of the start. The Restaurant cards keep their own rules (a one-minute margin and a start rounded up to five minutes), which their evaluation froze.

### The wording

- The condition chips are read from the calculation: where the asker sets out from, the asker's next item, and each Friend, marked when their position is unknown.
- A Plan's time band reaches from the half hour at or before the later of now and one hour before the Plan's start, to the half hour at or after 30 minutes past its end. Each person's lane holds their Classes and held Sub Quests in that range, without their names.
- When no Restaurant can be planned, the answer says which of three things it is: no Restaurant is open for the meal that day, the people share no Free Time then, or no Restaurant leaves 15 minutes together.
- A building is called by its number with 동 when its Place has one, and by the Place's name otherwise, as the app does. A Restaurant is called by its name.

### The Assistant

- A tool of the chat plans a meal. It takes the day, the meal, and the Friends, as the resolver returned them, and answers the model with the Plans in words and minutes: Restaurant names, clock times, walking minutes, and where people meet. It gives the model no coordinates, no course names, and no rooms.
- The tool and its prompt fragment join the chat only for an app with the `answer` capability, in place of the Restaurant card tools and their rules. The rest of the chat is unchanged.
- The asker's location reaches the tools through the request context.
- A Friend's position is read in one place, through what the asker's map shows today. When the per-Friend levels exist, that one place reads them.
- One service plans from a `PlanInput`. The tool, the recalculation endpoint, and the making of a Quest from a Plan all call it, so the three agree.

### Recalculation

An endpoint takes a `PlanInput` and the asker's location, and answers with an `AnswerReply`, without calling the model and without counting against the User's daily messages. It honours the input's window, fixed Place, and constraints.

## Testing Decisions

A good test states a behaviour a User or another package depends on, through a public seam, with expected values that come from the design's worked example or from numbers chosen by hand, never recomputed the way the code does.

- **The calculation, unit tests.** The seam is the pure function. The worked example of the design's section 6.1 runs on the real walking table read from the seed: alone, with one Friend, with another Friend, and with both. Each boundary gets its own small walking table: a walk of 60 and of 61 seconds; together for 15 and for 14 minutes; a detour of one and of two minutes; a Class that ended 15 and 16 minutes ago; an arrival before the window opens and a leave-by after it closes; no shared time; nobody on time; a Friend whose position is unknown; and two Restaurants that tie.
- **The wording, unit tests.** The seam is the function from a calculated gathering to its answer: the lines, the basis, the scene, and the band of the worked example.
- **The endpoint, integration tests.** The seam is the Assistant's endpoint over the started server with the scripted model, the real walking table, and the seed's Places, as the existing Assistant tests do. They cover the worked example end to end, what the model is given, a Friend's position used only when the asker may see it, an app without the capability, a refused context, and a day without menus.
- **The app, unit tests.** The copy of the real answer passes the app's check of a reply, and the mock client returns it.
- Prior art: the Assistant's free-time tests and their stage, the candidate-fit unit test, and the app's API answer tests.
- **No evaluation suite in this task.** The location question set, its reference solver, its baselines, and its thresholds are frozen in one commit of their own before any result. This task adds nothing under the server's evaluation folder, does not run the engine against a question set, and writes no reference solver from the engine's own logic.

## Out of Scope

- The answer screen, invitations and the making of a Quest from a Plan, and notifications and bookings: the other three packages.
- The flows of today's app. The Assistant's free-time meals and Quests, the search for Global Events and recruiting Quests, Friends, and location sharing stay as they are: an app that does not send the `answer` capability gets the prompt, the tools, and the reply it gets today.
- The shuttle in a Plan's Travel Time, a Restaurant's own closing time, and the per-Friend levels of location.
- Plans other than a meal: a study group, an event, and a recruiting Quest.
- A constraint set by an invited person, planning again after a decline, and a late Holder.
- The location question set and its two baselines.

## Further Notes

- The Restaurants of the worked example are 301동식당, 302동식당, 학생회관식당, 3식당, and 자하연식당. The design's table for one Friend names 301동식당 first, with 27 minutes from 12:18. The calculation finds one more candidate ahead of it: 302동식당, at the Place of the Friend's Class, with 28 minutes from 12:15. With both Friends it finds a third candidate after the design's two, 3식당 with 19 minutes. Every time and every count of minutes the design gives is reproduced.
- With the shuttle counted, the Friend's own way from 302동 to 자하연식당 is 16 minutes against 19 on foot, which can change the order of that example once the shuttle is added.
- A Plan shows the Place of a Friend's Class and the time the Class ends. The requirements that say a Friend's Classes are never shown (US-AI-07, NFR-06) and the acceptance test document change together with this work.
