# 01: The Tour's frame: the start card, Practice, the 내 정보 chapter and the end

Status: ready-for-agent
Blocked by: None (can start immediately).

Native files: none. Releases: an app OTA update only.

Spec: [../spec.md](../spec.md). Decision: ADR 0016. Words: `GLOSSARY.md`, "The Tour".

## What to build

A new User who finishes Onboarding is offered the Tour. They can go through its one chapter so far, 내 정보, in Practice, and they end on 샤샤 cheering, from where the real app and the first run's cards follow. This ticket cuts the whole path once, so that the other tickets only add chapters and edges.

- **The start card.** It comes after Onboarding and before the first run's cards: "1분 둘러보기" or "건너뛰기". 건너뛰기, like finishing, records the Tour on the phone and lets the first run's cards follow.
- **The Tour's state.** A pure module decides, from what the phone keeps and what the app knows:
  - which card to show, if any;
  - the next chapter and step;
  - what 다음, 그만하기 and the end do.
- **Practice.** While the Tour is up, the app's one client answers from a Practice client.
  - The Practice client implements the same interface, keeps its data in memory and is built on the mock client's parts. It never calls the main server for what Practice shows or does.
  - **Passed through.** `uploadPosition` and `registerPushToken` go to the real client, so that the User's own position keeps reaching Friends and pushes stay registered during the Tour. Every other operation answers from Practice, `setMasterSwitch` included.
  - **Dated today.** Practice's data is made for the phone's day and time when the Tour starts (the sample Timetable, 샤샤's Timetable). A mock part is reused only after it is re-dated, because the mock's data and copies are for the frame's 1 October.
  - **Its own cache.** The Tour has a query cache of its own, used by the screens while Practice lasts. Socket events still invalidate the real cache only. When the Tour ends or is stopped, the Tour's cache is dropped and every real key is fetched again.
  - Its data includes 샤샤 as the User's one Friend, and a sample Timetable.
- **The band.** "연습 중 · 실제로 저장되지 않아요" with 그만하기 shows the whole time.
- **Pointing.**
  - A Tour anchor is a stable name a screen gives the element the Tour points at.
  - The step lights its anchor's element, dims the rest and blocks every press but the lit element and the bubble's buttons.
  - An anchor that is not found puts the bubble in the middle of the screen with nothing lit.
- **The bubble.** 샤샤's default picture stands beside a speech bubble of one or two lines, with 다음.
- **The script.** Chapters, steps, anchors and 샤샤's lines live in one place. This ticket adds chapter 4, **내 정보**, with these steps:
  - the Timetable's two ways;
  - the Friend's two ways;
  - Location Sharing (the Master Switch, three levels per Friend, Private Zones);
  - the 알림 bell;
  - "앱 둘러보기".
  
  Use the spec's lines.
- **The end.** 샤샤's cheering picture, "끝. 연습한 건 다 지워져. 이제 진짜로 써 봐." and "진짜로 시작하기". The button ends Practice, the real screens come back, and the first run's cards follow.
- **What goes.** The tour of the tabs and its stored flag go. Its 내 정보 row becomes "앱 둘러보기", which starts the Tour from its first chapter.
- **샤샤's pictures.** Cut the default pose (`references/shasha-default.png`) out to a transparent picture without its name tag. The cheering pose (`references/shasha-cheer.png`) is transparent already. Both are bundled assets, so the fingerprint does not change.

## Acceptance criteria

- [ ] After Onboarding the start card shows before any first-run card; 건너뛰기 brings the first run's cards at once, and the card does not come back.
- [ ] 1분 둘러보기 opens Practice: the band shows, and 내 정보 shows 샤샤 as a Friend and the sample Timetable, not the User's real data.
- [ ] Each step of the 내 정보 chapter lights its element, with 샤샤's line; presses outside the lit element and the bubble do nothing.
- [ ] A step whose anchor is missing shows its bubble in the middle and the Tour goes on.
- [ ] 그만하기 ends Practice at once and the real screens come back with the real data.
- [ ] The end shows the cheering 샤샤 and "진짜로 시작하기", which leads to the first run's cards.
- [ ] The fake main server receives no request from Practice during the whole Tour; the User's position uploads keep reaching it.
- [ ] After the Tour, the real screens show the fake main server's data, fetched again, and nothing Practice answered.
- [ ] The tour of the tabs is gone, and 내 정보 has "앱 둘러보기", which starts the Tour again.
- [ ] Unit tests of the Tour's state cover the start card, skipping, stepping, stopping and finishing.
- [ ] The app-level integration test replaces the tour of the tabs' test and covers the above. It fails when an anchor of a step is not found.

## Not in this ticket

Resuming a cut-off Tour, the one-time offer to existing Users and Android's back button (02). Chapters 1 and 2, and 행사 (03 to 06).
