# 31: The tab bar's "+" opens 파티 만들기

Parent: [P02 spec](../spec.md); the smoke test of the Release `snunow/all/26.11.16-1`, row 35 (the centre slot is a dead end)
Status: ready-for-human
Blocked by: nothing

## What to build

The centre slot of the tab bar, "+" (올리기), says "준비 중이에요" and opens nothing. A press on it opens 파티 만들기 instead.

- It opens the existing form (`/party-form`, `src/screens/party/form/`), empty, the same form that the 파티 tab's "만들기" and an event's "같이 갈 사람 찾기" open.
- The form stands above the tabs, so 뒤로 shows the tab "+" was pressed on.
- The toast and the comment that says the slot belongs to another task go. The slot keeps its look.
- The form's own words stay as they are.

## Acceptance criteria

- [x] "+" on 지도 and on 행사 opens 파티 만들기 with an empty title, and 뒤로 shows that tab again.
- [x] No "준비 중이에요" after "+".
- [x] The tests that pressed "+" only to raise a toast raise it another way, and still check where the toast sits.
- [x] The app's README says what "+" does.

## Decisions for review

1. A press opens the form with `router.push('/party-form')`, as the 파티 tab's "만들기" does, not a new screen or a choice of kinds.
2. The tests that measured the toast's place used "+" as any toast. They now use "내 위치로 이동" or "길찾기" before the phone has a position ("위치를 찾는 중이에요"), and "빈 시간 말하기" on 내 정보, which still says "준비 중이에요".

## What the form makes with 비공개 and no Friend (checked, not changed)

- 비공개 with no Friend chosen cannot be sent: "파티 만들기" stays disabled (`isReady` in `src/features/party/making.ts`: a new private Quest needs a title and a Friend; `party-form.integration.test.tsx`, "a private 파티"). So the form never makes a private Quest held by one User on purpose.
- A private Quest is still held by one User after it is made, until an invited Friend accepts, and for good when every invitation is refused or fails ("…명은 초대하지 못했어요"). Its toast says "비공개 파티를 만들었어요", and the form then opens 파티 › 내 파티, which lists it under 비공개 as a 파티.
- 공개 with no Friend posts a recruiting Quest held by its Leader alone ("파티를 올렸어요"). It is listed in 찾기 and 내 파티.
- For the rule that a Quest held by one User is no 파티 (2026-11-16): leaving out every one-Holder Quest would also hide these two from their own maker, and the recruiting one from 찾기, where nobody could join it.

## Comments

### Checked on an emulator (2026-11-16)

The debug build on the headless AVD with the mock API: "+" on 지도 opens 파티 만들기 with every field empty, and 뒤로 shows 지도 with the same map. "+" on 행사 does the same and 뒤로 shows 행사.

### Agent usage (2026-11-16)

- Agent time: about 12 minutes, one session and no subagents. An estimate from the transcript's timestamps.
- Tokens: input 9,292,745, of which 9,146,687 cache reads and 145,942 cache writes; output 34,531.
