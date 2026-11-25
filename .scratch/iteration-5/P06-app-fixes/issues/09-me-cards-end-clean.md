# 09: 내 정보's cards end without a line, and 관정도서관 로그인's button stands in the row's middle

Parent: [P06 spec](../spec.md)
Status: done
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-25, on their phone's 내 정보 tab: "관심사 아래 line, 탭 안내 다시 보기 밑에 line, 관정도서관 로그인 밑에 line 있잖아. 이거 해당 블록이 거기서 끝나는데 그 line들이 있을 이유가 없거든?" and "관정도서관 로그인 버튼, 지금 그 칸 기준으로 위에 붙어있잖아, 이거 중앙으로 맞추고 싶어." The agreed screen is `references/09-1-me-cards-mock-up.webp`: the phone's screen as it is, with red boxes, and the same screen with the three lines gone and the button moved down.

Positions are as of `origin/5.0/Main` ef2223aa.

- `ListRow` draws a line of 1 under every row (`mobile/src/design-system/list-row.tsx:114-120`, `borderBottomWidth: 1`). A card's last row draws it too, just above the card's own edge.
- On 내 정보 (`src/screens/me/me-screen.tsx:202-204`) three cards end with a `ListRow`: the activity card's 관심사 row (`activity-card.tsx`, the last of four `ActivityRow`s), `TabTourRow` (`tab-tour-row.tsx`, one row) and `LibraryCard` (`library-card.tsx`, one row). The 위치 공유 card above them ends with 위치 공유 보기, which is not a `ListRow`, and has no line: that is how a card ends.
- `LibraryCard`'s trailing `Button` (`variant="secondary"`, size `md`, 40 high) stands at the top of the 64-high row, as every `Button` hugs with `alignSelf: 'flex-start'` (`design-system/button.tsx:135`). `Button` already has `centred` (`:97`, `:137`), which puts it at `alignSelf: 'center'`.

## What to build

- The last row of each of the three cards draws no line under it: 관심사, 탭 안내 다시 보기 and 관정도서관 로그인. The lines between 친구 관리, 참여 중인 파티, 내 퀘스트 and 관심사 stay.
- `ListRow` keeps its line by default, so every other screen that uses it stays as it is. A way to leave the line out (a prop, for example) is used only by these three cards.
- The 관정도서관 로그인 row's button, 로그인 or 로그아웃, stands in the row's vertical middle, level with the book icon: `centred` on that `Button`. `Button` itself does not change.
- No words change.

## Must not break

- The rows' presses, labels and counts: 친구 관리 3, 참여 중인 파티, 내 퀘스트, 관심사, 탭 안내 다시 보기 (the tour from its first step), and 관정도서관 로그인's 로그인 / 로그아웃 with its busy state (`library-session.integration.test.tsx:146`).
- Every other `ListRow` (lists of Friends, 파티, notifications, interests, private zones) keeps its line.
- `Button`'s other users: its default `hug` stays.
- Tests: `me.integration.test.tsx`, `library-session.integration.test.tsx`, the catalogue test, and the tests `git grep` finds for `ListRow`, `ActivityCard`, `TabTourRow` and `LibraryCard`.

## Out of scope

- The 비공개 구역 card on the 위치 공유 screen (`private-zone-row.tsx`, one `ListRow` in a card) ends with the same line. The user named only 내 정보's three; it stays as it is.

## Acceptance criteria

- [x] On 내 정보, the 관심사, 탭 안내 다시 보기 and 관정도서관 로그인 rows have no bottom line; 친구 관리, 참여 중인 파티 and 내 퀘스트 keep theirs. (Test, which fails before the change.)
- [x] A `ListRow` given nothing new keeps its line. (Test.)
- [x] The 관정도서관 로그인 button is centred in its row (`alignSelf: 'center'`). (Test, which fails before the change.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

`ListRow` takes `last`, a card's last row, which draws no line under it; the line moved from `row` into its own style, `divider`, so leaving it out takes no override. The tests are in `__tests__/me-cards.integration.test.tsx`, not `me.integration.test.tsx`, which would pass oxlint's 300 lines with them, and in a second `describe` of `list-row.unit.test.tsx`.

### Agent usage (2026-11-25)

Estimates: agent time is the gaps under 5 minutes between transcript entries, summed, so waiting for a person or for CI is left out. No subagents. Counted up to the writing of this entry, so the commit and the pull request are left out.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 09 (test first, `ListRow`'s `last`, the three cards, checks) | about 15 minutes | 4,278,077 | 4,170,763 | 107,244 | 70 | 24,966 |

Without cache reads, the input is 107,314.
