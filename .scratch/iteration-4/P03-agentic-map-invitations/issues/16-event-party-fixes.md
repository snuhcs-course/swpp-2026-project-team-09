# 16: An event's parties are found at the event's place, and a new party does not repeat the event

Parent: [spec](../spec.md) ("Events and recruiting Quests answered on the map"); the smoke test of the Release on 2026-11-16, rows 13 and 14 (`smoke-1116/report.md` in the orchestrating session's notes); the user's "세 가지 고쳐" (about 21:55).
Status: ready-for-human
Blocked by: nothing (starts from `4.0/Main`)
Native files: no

## What to build

Two bugs the smoke test of the Release found in "같이 갈 파티" and "새로 모집" for a Global Event.

1. **Row 13.** "같이 갈 파티" for 밴드 동아리 정기공연 answered "제시간에 갈 수 있는 파티가 없어요", although the event's recruiting party "밴드 공연 앞자리 같이" (19:00, one minute's walk) existed.
   - A party is judged on its first step ahead with a start and a Place of the list (`quest-fit.ts`, `isTimed`).
   - The attending step of a Quest for a Global Event is written as the event's point and words, with no Place id. A step the party form writes for an event (`eventWhere`) is the same.
   - So such a party was never judged.
2. **Row 14.** A party made from "새로 모집" for an event had the event's step twice: the attending Sub Quest, and the Plan's own step with the same title and times.

## Acceptance criteria

- [x] A party of "같이 갈 파티" is judged on its steps that name a Place. When none does, it is judged on the steps its Holders wrote, at the Place their point or words are (`PlaceLookup.placeIdOf`, as an event is placed). When those have none either, it is judged at its event's place, by the attending step.
  - A party whose only step is attending the concert is planned at 18:00. That test fails before the fix.
  - A job fair party that meets at 14:20 at a point with no Place id is judged at 14:20, not on the attending step that started at 10:00.
  - The job fair's parties with named meeting steps keep their answers.
- [x] A new party's Plan leaves out the step that would only repeat its Global Event: one from the event's own start and not cut short by the asker's next item. A party alone then has no step of its own, and one with Friends has the meeting step only. The unit test fails before the fix.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file and no schema changed.

## Comments

### Decisions for review (2026-11-16)

1. **The fix is the server's, and the form is unchanged.** The rule that places an event (`placeIdOf`) finds a Place for a step's point or words. So parties made by the released 1.0.2 form, by attending, or by the seed are found too; a form that sent the Place id would fix only new parties. The step a Holder wrote keeps its own words.
2. **In that order: named steps, then written ones, then the event.** My first fix read every step's Place the new way, and the job fair's parties were then judged on their attending step, which had started at 10:00, instead of their 14:20 meeting step. The existing row-4 test caught it. A party says when to be there by the steps its Holders add, so the attending step counts only when no other step can.
3. **A step is the event itself** when the Plan starts at the event's own start and the asker's next item does not cut it short. A party that meets later than the event starts (the job fair at 14:00) keeps its step, which says when the party meets. A step cut short keeps its words "15:12까지 채용박람회 · 301동으로 나서기".
4. **Quests already made with the step twice** stay as they are; nothing rewrites them.

### Agent usage (2026-11-16)

- Agent time: about 35 minutes in this session, an estimate from the transcript's timestamps, between the solo-Quest PR's opening and this one's. No subagent took part.
- Tokens: counted with ticket 15's session total, in that ticket's own section, as the same session did both.
