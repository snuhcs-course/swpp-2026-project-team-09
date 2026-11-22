# 29: A meeting whose every Friend declined is changed in place and asks them again

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server.

## What happens now

The User leads a meeting made from a meet's Plan, and every Friend of it declined. Asked to meet the same Friends that day, the planner sets it aside as the same meeting ([17](17-own-meeting-set-aside.md), row 6 as amended) and names it in `planSet` as changeable. But 바꾸기 (`PUT /plans/:questId`) compares the plan's people with the Leader, the other Holders and the waiting invitees, so it answers 400 `PLAN_PEOPLE_CHANGED` on every press. Making it anew (`POST /plans`) answers 409 `PLAN_ALREADY_SET`. The User can neither change it nor make another.

## What to build

- `PUT /plans/:questId` takes a plan for the Quest's own people, as now, or, when nobody but the Leader is left in it, for the Leader and every Friend who declined (row 6). It changes the Quest in place and invites those Friends again: their decline gives way to a waiting invitation, and each is sent the invitation's push.
- A plan for only some of the declined, or for a declined Friend while others are still in it (row 7), is refused as now.
- The model's rule for `setAside` says that changing such a meeting asks the Friends again, in row 6's words.

## Acceptance criteria

- [x] A meeting whose only Friend declined is set aside as changeable, and the plan of the answer changes it at `PUT /plans/:questId` with the Friend invited again (`assistant-own-meeting.integration.test.ts`, which answered 400 before the change).
- [x] The existing refusal of a declined Friend while another is still in the Quest stays (`better-plan.integration.test.ts`).
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 10 minutes (estimate: gaps under 5 minutes between transcript entries, summed, up to the PR).
- Tokens: input 7,115,741 (cache reads 6,982,108, cache writes 133,543, uncached 90); output 30,527. Without cache reads, 133,633.
