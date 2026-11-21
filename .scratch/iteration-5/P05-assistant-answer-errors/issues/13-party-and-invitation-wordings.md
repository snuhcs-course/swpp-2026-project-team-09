# 13: Small wordings of 파티 and invitations

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None. (It was listed after ticket 07 for the recruiting lines; the line it changes, the new 파티's band, is not one ticket 07 touches.)

Native files: none. Releases: an app OTA update and the main server.

## What happens now

- A 파티 with one step shows "민수랑 학생회관에서 만나기 · 학생회관": the step takes the 파티's title, which already holds the place.
- The model writes a description under the 파티's table that repeats the table.
- A new recruiting activity with no end is given 30 minutes: "19:00–19:30 · 30분".
- The sheet after a first invitation says "내 파티에 처음 들어왔어요", naming nobody, about a Friend only invited.

## What to build

- A 파티 card's next step that takes the 파티's own title shows its place alone ("학생회관", not "민수랑 학생회관에서 만나기 · 학생회관").
- The rules give a closed 파티 (비공개, or only for named Friends) no description unless the User wrote one: its card already shows who, where and when.
- A new recruiting activity with no end of its own has a band of its start alone ("17:10부터"), not the shortest stay the plan gives it ("17:10–17:40 · 30분").
- The sheet after a first invitation says "처음 초대한 친구예요": the Friends were invited, not joined, and the title under it names them.

## Acceptance criteria

- [x] A one-step 파티 does not repeat its place. (Unit test, fails before the fix.)
- [x] A recruiting answer for an activity with no end has no "30분" in its band. (Unit test, fails before the fix.)
- [x] The sheet says the Friends were invited. (Integration test, fails before the fix.)
- [ ] An evaluation case for a closed 파티's description: not written. The evaluation's proposal expectations have no description field, so the rule is checked by review only.
- [x] Lint, format and types of the app and the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 3 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 10k; input 11.2M, of which 11.2M cache reads, 19k cache writes and 42 uncached. No subagents.
