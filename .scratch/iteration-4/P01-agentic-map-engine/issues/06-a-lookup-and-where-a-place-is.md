# 06: A Lookup, and where a Place is

Parent: [P01 spec](../spec.md) ("The contract", "The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The User asks "문화관이 어디야?" and the Assistant answers on the map: the Place picked out, the User's way to it, and the minutes on foot, with two lines in the card (wireframe row 7, board q1). The server works everything out; the model only finds the Place and calls the tool.

An answer like this has no Plan: nobody else is in it, it is not recalculated, and it never becomes a Quest. It is carried by a new part of the contract, the **Lookup**, beside the reply's `answer`.

## Acceptance criteria

- [ ] The contract declares a Lookup on both sides (`main-server/src/assistant/dto/answer.dto.ts`, `mobile/src/api/assistant-types.ts`), with the same shape, reusing the answer's condition chips, lines, map scene, and time band.
- [ ] The Assistant's reply carries `lookup`, null when there is none, beside `answer`. A tool that draws a Plan clears the Lookup, and one that draws a Lookup clears the answer: the last one drawn is the one on the map.
- [ ] For an app with the `answer` capability, a tool finds the way from where the User is to a Place. "문화관이 어디야?" from building 301 on a Tuesday at 11:50 answers with the Place picked out, the way, and "걸어서 18분" (the walking table's value), and the lines "**문화관(73동)**은 여기예요" and "지금 있는 301동에서 걸어서 18분".
- [ ] Where the User sets out from: a Place the User named; else the Place their location is in, or the nearest Place within 150 m; else the Place of their last item today that has ended. With none of these the tool answers none, and the model says it needs the location.
- [ ] An app without the capability gets today's prompt, tools, and reply (plus `lookup: null`).
- [ ] The app checks a reply's Lookup and keeps it; the mock answers with a copy of a real Lookup.
- [ ] Unit tests for the Lookup's words and scene; integration tests at the Assistant's endpoint with the scripted model; the app's reply-check test.

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
