# 54: The ☆ beside an event's title stands level with the title's first line

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

The user on 2026-11-28, on the 행사 tab: "별 위치가 아쉬운데 텍스트 첫줄과 높이를 맞출 수 있을까?" On his phone the ☆'s centre was about 3 points above the first line's centre.

- **행사 row** (`mobile/src/screens/events/event-row.tsx`). The ☆'s touch area of 44 stood at the row's top edge (`top: 0`), while the title's first line starts below the row's 12 of padding.
- **Event detail sheet** (`event-detail-sheet.tsx`). The ☆ had a fixed `marginTop: -6` beside the title.

## What to build

- `FavoriteToggle` takes `besideLine`, the height of the line it stands beside. Its touch area of 44 reaches as far above that line's box as below it, so that the star's centre is the line's. The touch area keeps its size.
- The 행사 row puts it where the title's first line starts (the row's padding) with `besideLine` = the row title's line height. The detail sheet uses the sheet title's line height.

## Checked, not changed

| Place                                   | Trailing icon         | Why it is not this fault                                                |
| --------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| 행사 card (`event-item.tsx`)            | ☆                     | in the top row beside the badges, not beside the title                  |
| Map card of one event (`main/card.tsx`) | ☆ beside ✕            | at the ✕'s height on purpose, above the sub-label, not beside the title |
| 내 파티 card (`mine-card.tsx`)          | crown and count       | in the top strip, not beside the title                                  |
| 초대 card (`invites-tab.tsx`)           | none beside the title |                                                                         |
| 알림 rows (`notifications-screen.tsx`)  | chevron or time       | `ListRow`'s trailing slot, centred on a one-line row                    |
| Quest list (`main/quest-list.tsx`)      | flag and expand       | one-line titles                                                         |

## Acceptance

- [ ] The 행사 row's ☆ and the detail sheet's ☆ are centred on their title's first line box (integration test, failing before).

## Comments

### Agent usage (2026-11-28)

- Agent time: about 18 minutes in the app-fixes session, measured from its transcript (an estimate). That session worked on several tickets at once, so its time and tokens are split by which ticket each step named. Pauses longer than five minutes are not counted.
- Tokens: output 41k; input 41.2M, of which 41.2M cache reads, 78k cache writes and 144 uncached. No subagents.
