# 03: Chapter 1, 지도: what the map shows, and what the Assistant does

Status: ready-for-agent
Blocked by: 01.

Native files: none. Releases: an app OTA update only.

Spec: [../spec.md](../spec.md).

## What to build

The Tour's first chapter, without its ★ step (04).

- **What the map shows.** 샤샤 points at the User's own marker, 샤샤's marker, a Practice 파티 and a place.
- **The layers.** It points at the 식당, 셔틀 and 공부공간 layers.
- **The Assistant's bounds.** A step shows two short lists in the app's 해요체:
  - "가능해요": 밥 · 약속 · 파티 찾기 · 행사 · 길찾기 · 공부 자리 · 관정 예약 · 셔틀;
  - "못 해요": 캠퍼스 밖 · 과제 · 친구 대신 수락 · 관정 외 도서관;
  - and the line "AI가 제안하면, 실행은 내가 눌러서".
- **Example chips.** Two chips the User presses in turn:
  - "배고파" gets a meal Plan on the map from the Practice client;
  - "과제 도와줘" gets the Assistant's own refusal for homework ("과제는 도와 드릴 수 없어요.").

  Nothing is typed; the input accepts only the chips.
- The chapter is first in the Tour. It sets up its own Practice data at its start.

## Acceptance criteria

- [ ] The Tour starts with this chapter; each step lights its element, with the spec's 샤샤 lines.
- [ ] The two lists and the line show as written.
- [ ] "배고파" shows a meal Plan on the map, and "과제 도와줘" shows the homework refusal, both from Practice.
- [ ] Nothing of this chapter reaches the fake main server, and no Assistant message is sent to it.
- [ ] Resuming at this chapter (02, if merged) starts it from its first step.
- [ ] The app-level integration test covers the chapter.

## Notes

03, 05 and 02 each change the Tour's script; merge the integration branch before the pull request.
