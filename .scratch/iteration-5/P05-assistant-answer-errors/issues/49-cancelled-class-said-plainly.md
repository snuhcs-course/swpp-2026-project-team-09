# 49: A Class the User says is cancelled is said to stay in the plan

Parent: [P05 spec](../spec.md); the user's phone (2026-11-26): "내일 1시 수업 휴강이야. 점심 뭐 먹을까?" was planned to end before the 13:00 Class, with no word about it
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server.

## What happened

- Nothing can leave a Class out of a plan. The meal's `from` and `until` only narrow the window, and every Class stays busy, so a time named inside the cancelled Class gives no plan.
- The rules said nothing about it, so the model planned as usual and kept quiet.

## What changes

- A rule in `PLAN_RULES`: when the User says a Class is cancelled or that they will skip it, the model calls planMeal as for any meal wish. Its one sentence says the plan still keeps that Class, then recommends the first plan: "1시 수업 휴강은 아직 반영하지 못해서, 13:00 302동 수업 전까지 가장 덜 걷는 301동식당을 추천해요." It never says the Class was left out.

## What leaving a Class out would take (not built)

- A constraint on the asker's MealInput, such as `{ kind: 'skip', at: '13:00' }` or the Class's ref. planMeal gets a `skip` input, and the conditions on screen keep it for follow-ups of the same day and meal.
- The planner treats that item as free. Where the User sets out from and the next-Class mark move to the item after it.
- The time bar draws the Class faded with "휴강", with a chip "13:00 수업 뺌 ✕" to undo it. About M–L.

## Acceptance criteria

- [x] The rule, with the eval case `meal-wish-class-cancelled` (P4 world, Tuesday's 11:00 Class). Not run: no model key on this machine.
- [x] Whole lint, format and types of the main server.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 15 minutes of one session, for tickets 48, 49 and 50 together (one pull request), including finding the causes. An estimate from the transcript's timestamps, gaps over 5 minutes left out.
- Tokens, for the three together: input about 27.2 million, of which 26.9 million were cache reads, 292,000 cache writes and 198 uncached; output about 63,000. No subagents. Measured from the session's transcript when the pull request was opened.
