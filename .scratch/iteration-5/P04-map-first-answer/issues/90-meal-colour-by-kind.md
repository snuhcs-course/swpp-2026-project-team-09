# 90: A meal answer in coral whether or not menus were posted

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

A meal answer whose Plans carry no menu (no Restaurant posted one, as for a day more than a week ahead, or the stored answer without the location) draws its pick gold and its candidates navy on the map, while its list's badges are coral.

- The map keys the meal's look to `drawsMeal`: the kind is a meal and some Plan has a menu.
- The list keys coral to the kind alone.

## What to build

The colour follows the answer's kind (the orchestrator, 2026-11-26).

- Any meal answer's pick and candidates are coral on the map: a separate `coral` flag of the scene, set from `input.kind === 'meal'`.
  - The rounds: the pick solid coral, a candidate soft coral, as with menus.
  - The labels: a menu-less answer's candidates keep their name tags (P04 ticket 13), with a coral edge and a soft coral number badge with a coral number. The pick's label gets a coral edge, and a solid coral number badge where its round is not drawn.
- `drawsMeal` stays as it is. It decides more than colour: the capsules, the pick's two-line label, the meal's route lines, the placement rules, the first camera, the walks, and the press that opens the menu.
- A booking, a proposal, a pressed place, and every other answer's pick stay gold.

## Acceptance criteria

- [x] A meal answer without menus: every drawn round and every label of its pick and candidates is a meal's.
- [x] Its name tag has a coral edge and a soft coral number with a coral number; its pick's label a coral edge.
- [x] A meet answer's picks carry no meal flag.
- [x] Emulator screens of the stored answer without the location at font scale 1.0 and 1.3.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 50 minutes in the p04-58 session, from 08:40 UTC (after ticket 89's PR) to the push, an estimate. It includes the emulator screens at font scale 1.0 and 1.3. No subagents.
- Tokens, from 08:40 UTC to this entry: input 338 uncached, with cache reads 106,009,940 and cache writes 1,037,196; output 82,615.
