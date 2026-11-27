# 56: A plan chosen in words opens its Restaurant as a press on its row does

Parent: [P05 spec](../spec.md); the user's phone (2026-11-26, Release 26.11.26-3): "2번으로 할게" chose plan 2 and kept the list and its numbers (P05 ticket 51), but the card said "2번 두레미담으로 골랐어요." as a paragraph. He expected the screen a press on 2 in the list gives, the Restaurant's own card, "so that pressing another number from there carries the story on naturally"
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the app's JavaScript. The main server and the wire are unchanged.

## What happened

- The app showed the chosen plan with `show`, which moves the map's pick but opens nothing.
- The reply had no answer of its own, so its words were the card's content (`wordsKindOf` gave `own`).

## What changes

- A plan chosen in words ends as a press on that row of the list does. It goes through the same `openMenu` the row uses (as `useMenuRaising` gives it): the plan shown, its Restaurant opened in the answer with its menu rows, "‹ N곳 목록" and the meal tabs, the map's pick on it, and the card raised. This holds for the answer kept on screen, and for the reply's own new answer, such as a dish asked or a Friend added with the choice.
- A reply that chose a plan on screen is that plan's card (`wordsKindOf`), with no paragraph of its words. The history list keeps them.
- An app before this ticket shows the sentence over the answer, with the plan chosen (ticket 51).

## Acceptance criteria

- [x] "3번으로 할게" opens the third Restaurant's menu view with "‹ N곳 목록", and the reply's sentence is not on screen. (Integration test against the fake main server, failing before the change.)
- [x] A reply with a new answer and `select` opens that answer's chosen Restaurant. (Integration test.)
- [x] Whole lint, format and types of the app.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 25 minutes of one session, after ticket 55's pull request (the two came in one request, about 52 minutes together). An estimate from the transcript's timestamps, gaps over 5 minutes left out.
- Tokens, the two tickets together, of which ticket 55's share is in its own Comments: input about 58 million, of which 57.9 million were cache reads, 110,000 cache writes and 178 uncached; output about 67,000. No subagents.
