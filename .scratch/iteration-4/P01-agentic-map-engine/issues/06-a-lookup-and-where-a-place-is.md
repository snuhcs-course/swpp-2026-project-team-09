# 06: A Lookup, and where a Place is

Parent: [P01 spec](../spec.md) ("The contract", "The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The User asks "문화관이 어디야?" and the Assistant answers on the map: the Place picked out, the User's way to it, and the minutes on foot, with two lines in the card (wireframe row 7, board q1). The server works everything out; the model only finds the Place and calls the tool.

An answer like this has no Plan: nobody else is in it, it is not recalculated, and it never becomes a Quest. It is carried by a new part of the contract, the **Lookup**, beside the reply's `answer`.

## Acceptance criteria

- [x] The contract declares a Lookup on both sides (`main-server/src/assistant/dto/answer.dto.ts`, `mobile/src/api/assistant-types.ts`), with the same shape, reusing the answer's condition chips, lines, map scene, and time band.
- [x] The Assistant's reply carries `lookup`, null when there is none, beside `answer`. A tool that draws a Plan clears the Lookup, and one that draws a Lookup clears the answer: the last one drawn is the one on the map.
- [x] For an app with the `answer` capability, a tool finds the way from where the User is to a Place. "문화관이 어디야?" from building 301 on a Tuesday at 11:50 answers with the Place picked out, the way, and "걸어서 18분" (the walking table's value), and the lines "**문화관(73동)**은 여기예요" and "지금 있는 301동에서 걸어서 18분".
- [x] Where the User sets out from: a Place the User named; else the Place their location is in, or the nearest Place within 150 m; else the Place of their last item today that has ended. With none of these the tool answers none, and the model says it needs the location.
- [x] An app without the capability gets today's prompt, tools, and reply (plus `lookup: null`).
- [x] The app checks a reply's Lookup and keeps it; the mock answers with a copy of a real Lookup.
- [x] Unit tests for the Lookup's words and scene; integration tests at the Assistant's endpoint with the scripted model; the app's reply-check test.

## Decisions (2026-11-15)

These are the details the design leaves open. Any of them can be vetoed.

1. **The contract.**

   ```ts
   // An answer drawn on the map that has no Plan: where a Place is, the way and the time to it, a Friend, or a menu.
   interface Lookup {
     kind: 'way' | 'friend' | 'menu';
     chips: ConditionChip[];   // the conditions it used; a Lookup is not recalculated
     lines: AnswerLine[];      // at most two
     basis: string[];
     scene: MapScene;
     band: TimeBand | null;    // when a time matters; it has no handles
     actions: LookupAction[];  // the card's buttons, the main one first
   }
   type LookupAction =
     | { kind: 'guide'; to: PlacePoint }           // 길 안내
     | { kind: 'remind'; at: string; text: string } // a leave-by notification at `at`
     | { kind: 'meet'; userId: string };           // 만나고 싶다
   ```

   The reply carries `lookup: Lookup | null` beside `answer: AnswerReply | null`. A Plan and a Lookup are not merged into one type: a Plan holds a `PlanInput` that is recalculated, people's parts, and the Sub Quests of the Quest it becomes, and a Lookup holds none of these.
2. **The tool** is `findWay` (the design's route tool). It takes the Place to go to (`to`, from `resolvePlace` in this message, or the tapped Place), and optionally a Place to set out from (`from`). It joins the chat only for an app with the `answer` capability. Its reply to the model gives Place names and minutes, never coordinates.
3. **How a Place is called.** The Place asked about is called "name(N동)" when it has both a name and a number ("문화관(73동)"), since the User asked for it by one of them; every other Place is called as the spec's wording says ("301동").
4. **The scene.** The User at the start (their location when it is the start, else the start's Place), the Place as the pick, the User's way to it, and one flag at the Place: "문화관(73동) · 걸어서 18분".
5. **The action** is `guide` to the Place.
6. **No time band and no deadline** for a Place that is not the User's next item (ticket 07 adds them).
7. **The chips**: where the User sets out from ("301동에서").
8. **The words of the start** in the second line: "지금 있는 301동에서" when the start is the User's location, "301동에서" otherwise.

## Comments

### Decisions taken in the build (2026-11-15)

1. **The start's last item** is the item that ended last before now, by its end. When it has no Place, there is no start: an item without a Place later than a Class means the Class's Place is no longer where the User is. An item going on now does not count.
2. **The nearest Place within 150 m** is the nearest Place point within `NEAREST_PLACE_METRES` (150 m), read only when no Place holds the location (`PlaceLookup.at`, 20 m). `PlaceLookup.nearTo` became public for it.
3. **The basis** calls the Place asked about as decision 3 does: "301동 → 문화관(73동) 걸어서 18분 · 앱의 도보표". Board q1 writes "301동 → 문화관".
4. **The particle** after "문화관(73동)" follows the name outside the parentheses: "문화관(73동)은".
5. **The scene** draws the User with the tag "나" (the flag carries the minutes), at their location ("exact") when it is the start, else at the start's Place ("timetable"), as the meal's scene does. The way starts at the start's Place, which is what the walking table measures. The pick's tag is the Place's label, as a Plan's pick's is.
6. **The map buttons.** findWay clears them, and showOnMap adds none beside a Lookup, as with a Plan: a Lookup takes the map.
7. **What the model is given**: `from` and `to` as labels, `fromIs` (where the User is now, the Place the User named, or the Place of the User's last item today), and `walkMinutes`.
8. **How Places are called** is shared: `Naming`'s Place half became `PlaceNaming`, which the meal's words and the way's both use.
9. **The app's chat** keeps a reply's Lookup in its bubble (`lookup`), as it keeps the answer. The mock answers a message holding "어디" sent with a context with the copied Lookup, after the words it already knows.
10. **The copy of a real Lookup** (`mobile/src/api/mock/data/way-lookup.json`) was written by the server's `wayAnswer`, the function the endpoint's `WayService` calls, over the seed's Places and walking table, for board q1 on Tuesday 2026-11-17, with the asker's id of the meal copies.
11. **A Place named exactly the User's words.** `resolvePlace` answers the one Place whose name is the words, ignoring case, or whose number they are, when there is exactly one such Place; otherwise every Place that holds the words, as before. So "문화관" is 문화관(73동), not also 해동학술문화관, and board q1 needs no question back. The preference sits in `resolvePlace` only (`exactlyNamed`): `PlacesService.search` also serves the app's search of Places (`GET /places/search`), where typing "문화관" should still list 해동학술문화관.

The walking table gives 301동 → 문화관 1,066 seconds, 18 minutes as the board says.

The endpoint's integration tests (`assistant-way.integration.test.ts` and the six endpoint tests that now expect `lookup: null`) were written but not run on the build machine, whose lock for runs with containers was held by another session; GitHub CI runs them.

### Agent usage (2026-11-15)

Tickets 06, 07, and 08 together, one pull request: this session (the triage of ticket 05, the tickets, the reviews, and the pull request) and two implementer subagents (06 with 07, then 08 with the resolver fix).

- Agent time: about 2 hours 8 minutes, an estimate from the transcripts' timestamps (the union of active stretches, gaps over 5 minutes left out).
- Tokens: output 435,467; input 105,796,401, of which 104,395,504 were cache reads, 1,400,131 cache writes, and 766 uncached. Without cache reads: 1,836,364.
