# 12: Two counts: 오늘 counts what the User must do, the middle counts what the AI has ready

Parent: [A04 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: [10](10-today-tab.md), which makes 답할 것.

Native files: none. Releases: an app OTA update only.

## What happens now

From the proposal <https://claude.ai/artifact/UgGcW4Jx5G5doZhPnT89iK> ("두 숫자는 같은 것을 세지 않습니다"). Positions are as of `origin/5.0/Main` 9ea45c14.

- Only the 파티 tab has a count: the waiting rows other than friend requests (`usePartyBadge`, `features/notifications/use-notices.ts:105-107`).
- With the AI lowered or on another tab (ticket 09), the lines over the AI input are out of sight: the conversation to go on with (`screens/main/past-chats.tsx`) and the made Quests that wait for others' answers (`screens/main/made-quest-line.tsx`).

## What to build

- **오늘's count**: what the User must do, the rows of 답할 것 and the unread kept Notifications. A red badge, as the 파티 count is now.
- **The 파티 tab loses its count**: what it counted is in 답할 것.
- **The middle's count**: what the AI has ready, the conversation to go on with (1 while there is one) and each Quest the User made from a Plan that still waits for someone's answer. A small navy count on the button's edge, as the board draws it.
  - Shown only while the AI is lowered or another tab is in front. Raised on the map, the lines themselves show, so there is no count.
  - Zero shows nothing.
- **They never count the same thing.** An invitation the User received counts only in 오늘. A Plan the User sent that waits counts only in the middle; when a Friend accepts, the Notification counts in 오늘 and the Plan leaves the middle's count.
- Each count's screen reader words say what it counts ("답할 것 3개", "AI가 준비한 것 2개").
- Decided while building (2026-11-29):
  - 오늘's count is `useBellCount` (it moved onto the tab in ticket 09), said "오늘, 답할 것 N개".
  - A made Quest counts in the middle while any Friend it invited has not answered yet; one Friend's acceptance counts in 오늘 at once.
  - Asked by the user at the screen review: while the AI is lowered, "활성 파티" and the lines at the left (the tutorial's start, the line that asks for interests) go with its input, out of sight; the 편의기능 button, the zoom control and the first run's card stay.

## Must not break

- The counts update as the lists they read update, with no poll of their own.
- Tests: `shell`, `notifications*`, `party*` that read the 파티 count (`.integration`), `design-system/bottom-nav.unit`.

## Acceptance criteria

- [ ] 오늘's count is the waiting rows plus the unread Notifications, and 파티 has none. (Integration test, which fails before the change.)
- [ ] With a conversation to go on with and one made Quest waiting, the lowered middle reads 2, and raised it reads nothing. (Integration test.)
- [ ] An accepted Plan leaves the middle's count, and its Notification counts in 오늘. (Integration test.)
- [ ] Both counts on a phone with the mock build; the screens go to the user before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-29)

- Agent time: about 35 minutes in one session (`iter5-a04-09~12`), an estimate. It leaves out the waits for the shared heavy-job lock and for the user's answers.
- Tokens (Opus 5.5, the two review subagents included): input 368 and output 97,901; of the input, cache reads 107,542,420 and cache writes 299,870.
