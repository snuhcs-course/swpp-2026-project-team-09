# 70: 친구 추가 in three soft boxes, with 찾기 level with its field and a copy icon after the Friend ID

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

The team on 친구 추가 (`mobile/src/screens/friends/add-screen.tsx`): "찾기 버튼 정렬 등 조금 더 페이지를 다듬기".

- **찾기 out of line.** `find: { paddingTop: 24 }` pushes 찾기 down to meet a field under a label, and the 40 high `md` button sits beside a 48 high field.
- **A label that repeats its head.** The field's label "친구 ID" repeats the section's head "친구 ID로 추가".
- **Three button heights.** 복사 and 찾기 are `md` (40), 초대 링크 보내기 is `lg` (52).
- **No sections to see.** The three parts are text on white, told apart only by their small grey heads.

## What to build

Option B of the mockup, chosen by the user on 2026-11-28.

1. **Sections.** Each part keeps its grey head (`SectionHeader`): "내 친구 ID", "친구 ID로 추가", "초대 링크로 추가". Under it, what the part holds sits in a soft box: `color.surfaceSubtle`, `radius.md`, no border, padding 16, as the 파티 form's plan box (`plan-box.tsx`). The page stays white.
2. **내 친구 ID.** The Friend ID as now (display, bold, letter-spaced), with a navy copy icon (two overlapping sheets) right after it on its line.
   - A press copies it and shows the same toast "친구 ID를 복사했어요".
   - The icon is 20 with a touch area of 44 (`hitSlop`), and a screen reader hears "친구 ID 복사".
   - The 복사 button and the hint "친구 ID를 알려 주면 친구 요청을 받을 수 있어요" go.
   - The icon set gets `copy`, drawn on the same 24 grid with the same stroke as the others.
3. **친구 ID로 추가.** The field has no label; a screen reader still hears "친구 ID". The field and 찾기 stand side by side, both 52 high (`size.button`, the `lg` button's height), centred on one line, with no `paddingTop` hack. 찾기 stays `secondary`. A refusal still shows under the field, and the person found still shows below it, both inside the box.
4. **초대 링크로 추가.** 초대 링크 보내기 (`secondary`, full width, `lg`, so as high as 찾기) and the hint "링크는 한 사람만, 만든 뒤 24시간 동안 쓸 수 있어요" sit inside the box.
5. **Kept as they are.** What each part does, the toasts and every other state's words. No other screen changes and no shared component is restyled; only the icon set gains `copy`.

## Checked

- **The field without a label.** `TextField` always draws its label, so the field is a `TextEntry` styled as `TextField`'s input (border, radius, focus ring, danger outline) at 52 high, with the refusal drawn under the row as `TextField` draws it (the alert icon and the caption in `color.danger`).
- **A ninth letter.** `TextEntry` shows what was typed until its owner gives other words. Typing past 8 letters, or a dash, leaves the Friend ID as it was, so the field kept showing the extra letter ("YJ7A4Y6Zq"). `friends-add.integration.test.tsx`'s "takes letters and digits in capitals, at most 8" fails on `5.0/Main` for this. The field now refuses such words through `TextEntry`'s `takes`, as its comment asks.
- **Heights.** No `Button` size is 48, so the field takes the `lg` height (52) rather than 찾기 taking a new size.

## Acceptance

- [ ] "친구 ID 복사" copies the Friend ID and shows its toast (integration test).
- [ ] The field is named "친구 ID" to a screen reader with no visible label, and neither the hint nor 복사 shows (integration test, failing before).
- [ ] The field never shows more than 8 letters (integration test, failing on `5.0/Main`).
- [ ] The icon set has `copy` (unit test, failing before).
- [ ] The other 친구 추가 tests still pass.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 45 minutes, an estimate. One session in its own worktree, about 21:45 to 22:30 Korea time: the code, the tests, the ticket and the pull request. About 15 minutes of it waited for free memory and ran Jest and `tsc`. No emulator and no screenshots. The orchestrating session's time is not counted here.
- Tokens, this session alone (no subagents), an estimate since the session cannot read its own counter: input about 100 uncached, about 2,500,000 read from the cache and about 90,000 written to it; output about 25,000.
