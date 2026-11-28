# 55: The 새내기 튜토리얼 floats over the map in the 행사 tab's muted tone, cuts no words, and has twelve quests

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update, and the main server (its `content/tutorial.yaml`).

## What happens now

The team asked on 2026-11-28 for the freshman tutorial to be polished: some of its words are cut off, and its look is foreign next to the newer UI (the A04 glass layer, the 행사 tab). The team also asked for three quests to go: 성적평가방법 선택제(S/U) 신청하기, ChatGPT Edu 무료로 쓰기 and 캠퍼스 라이선스 소프트웨어 받기. The tutorial goes from 15 quests to 12.

Positions are as of `origin/5.0/Main` 66a96169, under `mobile/src/screens/main/tutorial/`.

- **Cut words.** The guide's bar holds the quest's title on one line (`tutorial-guide.tsx:60`, `numberOfLines={1}`), so a long title such as "서울대 미술관/파워플랜트 관람" ends in "…" beside 🌐 and ✕. The steps' tabs hold their names on one line in equal parts (`guide-panel.tsx:66`, with `flex: 1` at `:149` and `flexShrink` at `:171`). An online step's rows and a step's chips are a fixed 34 and 30 high (`guide-parts.tsx:226`, `:260`), which a large font overflows.
- **Two links for one site.** A quest's sheet has 🌐 in its head with the quest's links (`tutorial-sheet.tsx:199`) and the same links again as buttons in its body (`tutorial-places.tsx:68–80`).
- **A look of its own.** The list is a white card centred over a dark scrim, the sheet a white bottom sheet over the whole screen, and the guide's bar, bubble and panel are white cards. Each Tutorial Category has its own colour (orange, blue, violet, green, pink, `tutorialCategoryTones`), the start button and the 내 정보 row are cream and brown (`tutorialTone`), a completed quest and ✓ 완료 are a saturated green, and 지도에서 보기 drops a red pin.

## What to build

The approved wireframe of 2026-11-28 (40 states of the tutorial, with its brief of exact values) is the reference. Behaviour and flows stay as they are.

1. **Floating glass over the map.** The list and a quest's window are glass panels (the A04 `panel` level) docked 12 above the navigation and 12 from the sides, radius 24, over a light dim (`rgba(14, 19, 48, .12)`) that leaves the map in sight, in place of the centred card and the bottom sheet. The guide's bar, bubble and panel, and the start button, are glass panels on the map; the start button is a pill 44 high with the flag on a light blue round. 내 정보's row stays on 내 정보.
2. **The 행사 tab's tone, muted.** The accent is navy (`color.snuBlue`) alone, for the buttons, the pins, the ✓ and the progress; the words and the greys come from `color`. The five category colours, the red pin, the green ✓ 완료 and progress, the brown and the strong blue go. 완료 and 확인됨 are tags in the 행사 tab's "내 파티" colours (`Badge` `friend`). Categories are told apart by their names and the quests' line icons.
3. **The list.** Its categories are the 행사 tab's word tabs (`ChipRow`), which scroll sideways rather than squeeze. Each quest is a card (radius 16, 1 px `color.border`) with its icon on a light blue tile, its title with its tag (다음, 완료, 진행 중), and its brief under it. "n / n" says that every quest is done, with the segments all navy.
4. **No cut words.** The guide's bar shows "새내기 튜토리얼 · {category} · n/N" over the title, which takes a second line when it needs one. A step's tab name takes a second line rather than being cut. The fixed heights become minimum heights. Buttons have radius 12.
5. **One link each.** The sheet's 🌐 goes; its places and links stand in one box, each link once. The guide keeps its 🌐.
6. **Three quests fewer.** The three quests and their guides leave `main-server/content/tutorial.yaml` and the app's mock copy, and the later quests' `order` closes up (행정관 셔틀 is 6, 관악산 12). A User's progress is kept by key, and rows of keys no longer in the file are already left out, so no migration is needed. Every test that named them is retargeted; a quest done online, at no place, which the content no longer has, is a test quest of its own where a test needs one.

## Must not break

- Every press, label and flow of the list, the sheet, the guides and 내 정보's row.
- The Assistant's tutorial order, and its answer for a quest done online (the tool's code stays; its tests use a test quest).
- The A04 glass: Android draws the panel's dense white without a blur, iOS 26 its Liquid Glass.

## Acceptance

- [ ] `content/tutorial.yaml` holds the twelve quests in order (unit test).
- [ ] The app's mock copy of the guides matches the file (unit test).
- [ ] The list shows "0 / 12", its category tabs are word tabs, and a completed quest's tag reads 완료 (integration tests).
- [ ] A quest's sheet has no 🌐 and opens each link from its row (integration test).
- [ ] The Assistant's answers for a quest done online stay as they were, with a test quest (unit and integration tests).
- [ ] Screenshots before and after of the start button, the list, a quest's window, a guide with a long title, and "n / n".

## Comments
