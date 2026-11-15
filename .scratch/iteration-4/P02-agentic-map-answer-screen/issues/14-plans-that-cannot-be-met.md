# 14: Conditions that cannot be met give the nearest plan and say what was relaxed

Parent: [P02 spec](../spec.md); the design's row 8, boards n10, n11, n11b, n12, n23, principle 3
Status: ready-for-agent
Blocked by: package A's review of the seam (`row-8-seams.md`, ticket 14); ticket 16 for n12

## What to build

- **n10, alone, the first stretch too short.** The plan moves to the next stretch and says so: "수업까지 10분이라 식사는 어려워요" / "수업 끝나고 **{시각}** {식당}", the until chip marked relaxed, and the basis "5분이 안 되는 길이라 나설 알림은 없어요" for a walk under 5 minutes.
- **n11, together, no shared time now.** "지금" is a condition (`window.now`), and with it no stretch fits now: no pick, the lines "지금은 셋이 먹을 때가 없어요" / "{지은}이 **12:00**에 다시 수업이에요", and buttons that relax one condition each: "{지은} 빼고 보기" and "{13:00} 이후".
- **n11b, the relaxed plan.** "13:00 이후" recalculates with `window.from`; the lines "**13:00 자하연식당** · 셋이 55분" / "지금 대신 13:00으로 미뤘어요", a from chip "13:00 이후" marked relaxed, and "처음으로". Pressing the relaxed chip or "처음으로" goes back to n11.
- **n12, a place about to close.** A Restaurant that closes before the asker can eat is faded with "14:00 닫아요" and the lines name it: "**자하연식당** · 13:50 도착" / "학생회관식당은 14:00에 닫아요".
- **n23, a Friend whose position is unknown.** Words only: "**301동식당** · {하은}의 길은 빼고 정했어요" / "{하은}은 지금 어디 있는지 몰라요", the basis "{하은}은 시간표만 보여요. 10:45에 수업이 끝나 지금 자리는 몰라요" and "{하은}의 길은 {하은}의 초대장에 떠요. 나에게는 수락과 거절만 와요", open at first.

## Acceptance criteria

- [ ] Each board's lines, chips, and buttons as above, from the server's answer; the relaxed mark on `ConditionChip`; `noPlan.relax` for n11.
- [ ] The relax buttons and the relaxed chip use the existing recalculation (`withoutPerson`, `withBound`), without the model.
- [ ] Tests on both sides with the worked examples; the real server's replies kept as the app's mock copies.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- This changes how package A's engine plans (`gathering.ts` takes the next stretch silently today) and its answer words. It is built last, after package A has seen the seam.
- Decision to review: n11's time chip "지금" relaxes the plan when pressed, as the board's play shows, while P02's rule says the time chip focuses the band; "지금" is not a time on the band, so it relaxes.
- n10's "16:48" is an example value: the next meal is dinner, whose window opens at 17:00, unless the Restaurant's own hours (ticket 16) open earlier.
