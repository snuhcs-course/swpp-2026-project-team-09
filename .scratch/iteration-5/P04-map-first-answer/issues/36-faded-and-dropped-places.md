# 36: Fading says one thing, and candidates never vanish without a word

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([32](32-meal-card-list-and-menu.md), [34](34-meal-route-and-choosing.md), and [35](35-frame-navigation.md) are merged).

Native files: none. Releases: an app OTA update only.

## What happens now

From the user's phone on Release 26.11.22-17:

- In the raised list, some candidates are grey and nothing says why. A candidate is faded when it does not fit the time, or when its walk is over thirty minutes. A 36-minute walk inside a free stretch of three hours is greyed although it can be done.
- After "＋ 같이" with a Friend, the recalculated answer keeps one Plan and puts the other restaurants in `dropped`. The map then shows the pick alone, the caption has no "올리면 N곳 목록", and the raised card holds only the Friend's chip ("안진영 · 출발지 모름 ✕").
- The dock's line ends with "›", which raises a card the user did not expect.

## What to build

1. **Fading means one thing: it cannot be done in the time.** `fadedPlan` drops the thirty-minute rule; a candidate is faded only when it does not fit its band (arrival, the meal, and the walk on). The map's faded tags follow the same rule. In the list the faded candidates come last under one line: "시간 안에 다녀오기 어려운 곳".
2. **Candidates never vanish without a word.**
   - A meal answer with one Plan and places dropped is still listed, and the caption counts every place ("올리면 11곳 목록").
   - The raised list shows the Plan as a row. Under it, the dropped places stand under a line in the User's terms ("김태현과 시간이 맞지 않는 곳", or "시간이 맞지 않는 곳" alone), each with the server's reason ("김태현은 10분밖에 못 있어요"), faded and not pressable.
   - The dock says that one place alone fits ("김태현과 시간이 맞는 곳은 302동식당뿐이에요 · 11:30 · 걸음 2분") when the model's words are not about it.
3. **The raised card is one thing for a meal answer:** every person of the Plan as a row of chips at the top (✕ where one can be taken out), then the list. A meal answer with one Plan and nothing dropped shows its one row.
4. **"›" on the dock's line goes.** The caption's "올리면 N곳 목록" is the one way to raise the docked card.

The crowded mock gains two restaurants that open too late for the Class at 15:30 (감골식당, the 기숙사식당), and a recalculation with a Friend that keeps 302동식당 alone and drops the other ten with reasons.

## Decisions where the request is silent

- The dropped places are listed whatever kind of food is chosen: they have no menu to filter by.
- The map already draws a meal answer's dropped places from its scene; nothing in the map's files changes.

## Acceptance criteria

- [ ] A candidate far away but in time is not faded; one that cannot be done before the next Class is. (Unit tests.)
- [ ] The crowded list ends with the late candidates under "시간 안에 다녀오기 어려운 곳". (Integration test.)
- [ ] One Plan kept of three: the dock says it alone fits, with no "›"; the caption says "올리면 3곳 목록"; the raised card shows the Friend's chip, the row, and the two dropped places under "김민수와 시간이 맞지 않는 곳", not pressable. (Integration test.)
- [ ] Pictures with the crowded mock: the list with the late group, and a Friend added leaving one Plan (the map and the raised card). (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
