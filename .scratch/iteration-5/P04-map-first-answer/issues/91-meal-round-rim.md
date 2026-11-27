# 91: A meal candidate's round without its white ring

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

On the user's phone, a meal candidate's numbered round reads as three circles: a white ring with its shadow, the coral rim, and the soft coral ground. The round is 20 points across, ring included, and its number is 11 points inside a 13-point ground.

## What to build

The user's words: keep the coral rim, drop the extra outer ring, and give its room to the round and its number.

- A meal candidate's round has no white ring and no shadow. Its coral rim is its outside edge.
  - It stays 20 points across, the room that round and ring took before. Capsules and label placement do not move.
  - Its soft ground is 17 points across. Its number grows from 11 to 13 points.
- Inside a capsule, the capsule's own white is the separation from the map.
- A bare round on the map relies on its coral rim alone to stand off the pale ground and the path lines. This was checked on the emulator at font scale 1.0 and 1.3.
- The chosen round keeps its white ring. It is one solid coral disc inside a single white edge, with no rim, so it does not read as a double edge.
- Every other answer's candidate keeps its white ring around a navy fill.
- The meal list's badges keep their size: no outer ring, 22 points across, larger than the map's round. Their number goes from 11 points to the map's 13 at the map's weight, so the two read as the same mark (the orchestrator's addition). One constant, `MEAL_NUMBER`, holds the size for both.
- Mark pictures are made at run time and named by role, number, and `meal`. The name stays the same.

## Acceptance criteria

- [x] A meal candidate's round, alone or in its capsule: 20 points across, a coral rim of 1.5, a soft ground, no white ring, no shadow.
- [x] Its number fills the 17-point inside at 13 points.
- [x] The chosen meal round and another answer's candidate keep their white ring.
- [x] The meal list's badge number is the map's: 13 points, bold.
- [x] Emulator screens at font scale 1.0 and 1.3, with a bare round over a path line.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 40 minutes in the p04-58 session, from 09:48 UTC to the push, an estimate. It includes the emulator screens at font scale 1.0 and 1.3. It leaves out the merge of 5.0/Main into PR 600 (ticket 90), about 16 minutes in the same stretch. No subagents.
- Tokens, from 09:48 UTC to this entry, the merge for PR 600 left out: input 204 uncached, with cache reads 27,176,389 and cache writes 120,543; output 59,292.
