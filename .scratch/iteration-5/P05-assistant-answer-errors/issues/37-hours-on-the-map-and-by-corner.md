# 37: An hours answer shows the Restaurant on the map, and a corner's times are said as times

Parent: [P05 spec](../spec.md), after [36](36-restaurant-hours-answered.md); the released app (`26.11.23-3`) on the user's phone
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server; the app draws it as it is.

## What happened

- "학생회관 식당 지금 열었어?" was answered in words over an empty map: `restaurantHours` drew nothing.
- 예술계식당's answer was vague: "점심은 정확한 종료 시간이 기록되어 있지 않아요 … 확인해 보시는 게 좋아요". On the Co-op page its lunch cell gives each corner its time as a note after the corner's dish line: "※ 운영시간 : 11:30 ~ 14:00" after `<A코너>…`, and "※ 운영시간 : 11:30 ~ 13:00" after `<B코너>…` (`<C코너>` has none). It is neither a weekday rule nor a typo. The collector gives a cell with several hours lines no hours (P02 ticket 16), so the tool said "not recorded" and passed the notes as prose.

## What changes

- **On the map**, without a meal plan on the screen, the reply's Lookup (kind `place`) picks the Restaurant out, with the camera on it. The label's second line is its state now: "지금 영업 중 · 14:00까지", "지금 닫음 · 08:00 아침", or "지금 닫음 · 오늘 영업 끝"; on another day, each meal's span. This reuses how the menu Lookup draws its Restaurant: the pick's tag, and a `place` flag at the same point whose words after the name the map writes as the label's second line. So the app needs no change. The card's basis lists each meal's hours, and its action guides there. With a meal plan on the screen, the re-plan keeps the plan, as before.
- **Times in the notes**: a meal served without kept hours whose notes give a time range answers `byCorner`, each time with the corner of the dish line the note follows. A single time with no corner is the meal's `opensAt` and `closesAt`. The rules say them as times attributed to their corners, never "not recorded" beside them, and give no advice to check with the Restaurant unless nothing at all is known.

## Acceptance criteria

- [x] An hours answer without a plan on the screen has the Restaurant as the pick and the place flag "<name> · <state>"; with a plan on the screen, the plan and no Lookup. (Unit tests.)
- [x] The state at 00:40, 09:00, 10:30, 14:00, and 19:00 with breakfast, lunch, and dinner; a lunch by corner closing at its latest corner; another day's spans. (Unit tests.)
- [x] 예술계식당's lunch lines of 2026-10-01 read as A코너 11:30–14:00 and B코너 11:30–13:00. (Unit test.)
- [x] Eval case for 예술계식당's lunch written, not run. README updated. Lint, format, and types of the main server pass.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 20 minutes of one session. An estimate from the transcript's timestamps.
- Tokens: input about 15.7 million, of which about 15.6 million cache reads and 0.04 million cache writes; output about 22,000. No subagents. Measured from the session's transcript at the time of the pull request.
