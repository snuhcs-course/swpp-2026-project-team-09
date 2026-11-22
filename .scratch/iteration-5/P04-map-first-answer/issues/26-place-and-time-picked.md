# 26: A Place picked on the map, a time on a wheel

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [25](25-made-party-changed-in-place.md), whose pull request this one builds on. The main server's side (P05 ticket 24) is merged.

Native files: none. Releases: an app OTA update only.

## What happens now

When the Assistant asks where or when, the User types the answer. The main server can now add a picker under the question, but only for an app that sends `pick`: `{ kind: 'pick-place', label, text }` and `{ kind: 'pick-time', label, date, free }`.

## What to build

- Send `pick` with every request that sends the capabilities. The guard, the types, and the mock API take both offers.
- The question docks as its line, with each picker as a chip in the chip row.
- 지도에서 고르기 turns the map into picking: the line says "지도에서 건물을 눌러 주세요" and the chip becomes 그만 고르기. A tap on a building sends the offer's `text` ("여기서") with `tapped: { kind: 'place', placeId }`, and picking ends. A tap where no building is found sends nothing. 그만 고르기 or a new message ends picking.
- 시간 고르기 opens a sheet titled with the day ("내일(수) 몇 시에?") holding a wheel of times every 10 minutes: from the next one on today, else from 07:00, to 23:50. Free Time rows are blue with "빈 시간"; the rest are grey and still pickable. It opens on the first free time. Its button names the time in the middle ("19:30에") and sends it as the User's words. The app has no native time picker, so the wheel is a snapping list in JavaScript.

## Acceptance criteria

- [ ] The app sends `pick`. (Integration test.)
- [ ] 지도에서 고르기 then a tap on a building sends "여기서" with that Place tapped; 그만 고르기 stops it, and a tap then sends nothing. (Integration test.)
- [ ] 시간 고르기 opens on the day's first free time with the Free Time marked, and its button sends "HH:MM에". (Integration test.)
- [ ] The mock build answers "모임 장소 정해줘" and "모임 시간 정해줘" with the pickers, and the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 25 minutes in the same session as tickets 24 and 25 (an estimate from the transcript's timestamps): the pickers, the wheel, the tests' capability constant, and the two fixes from the code review. No subagents.
- Tokens: about 30% of this session's use, an estimate: output about 35k; input about 13.5M, almost all cache reads (about 13.4M), with about 110k cache writes.
