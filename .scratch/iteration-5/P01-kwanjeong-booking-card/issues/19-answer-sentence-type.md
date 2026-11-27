# 19: Every line in the place of the answer's sentence is drawn in the sentence's type

Parent: [P01 spec](../spec.md); a fault from the user's phone on 2026-11-27, and the rule that a fault is fixed with every place of its kind
Status: ready-for-agent
Blocked by: none

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

"배고파" at 13:05 answered with no Plan: "점심 시간에는 비는 시간이 없어요", drawn large and semibold. Every other answer's sentence is regular and smaller.

- The server's lines (`AnswerLines`) and a refusal's first line (`ReplyLines`) are drawn in `text.title` (semibold 18/26).
- The model's words are drawn in `text.bodyLg` (regular 16/24), the meal frame's settled sentence.
- Other lines in the sentence's role are smaller still (`text.body`, regular 15/22):
  - the model's words over a meal's list;
  - the keyboard's headline;
  - a library card's outcome and empty lines.

## The class, surveyed

The class is text in the answer card that stands as the answer's sentence, or beside it as a note, failure line or label, in a type other than the settled one. The settled types:
- the sentence: `bodyLg` regular, ink;
- a note under it: `body` muted;
- a failure line: `body`;
- small print: `caption`;
- labels and chips: `label`.

**Changed**

| Place | Component | Was | Now |
|---|---|---|---|
| A Plan's line, a moving band's line, every no-Plan reason (no-menu, no-shared-time, no-fit); a Lookup's lines (facts, way, study, Tutorial); a made card's lines (invited, taken) | `answer/answer-lines.tsx` `AnswerLines` | title (semibold 18/26) | the sentence (bodyLg); strong words stay bold, key colour |
| A refusal's first line, and a failure's (`FailedLines`) | `answer/refusal-reply.tsx` `ReplyLines` | title | the sentence. Row 8's board drew it as a title; this fault's rule makes it the sentence |
| A refusal's second line when it stands over a Plan, a Lookup, or a made card | `AnswerLines` with `refusal` | title, as a sentence | the muted note (`body` muted), as `ReplyLines` draws it |
| The model's words over a meal's list, and opened under the Plan's line | `answer/plan-card.tsx` `words` | body (15/22) | the sentence |
| The keyboard's headline (the reply's question or first sentence) | `answer/card-questions.tsx` `TypingLine` | body | the sentence. Its comment promised the docked line's type, which is now the sentence |
| A library card's outcome, empty and loading lines ("예약을 취소했어요", "취소할 예약이 없어요", the study line when docked, BOOKING_CLOSED, NO_FREE_SEAT) | `library/library-parts.tsx` `Said` | body | the sentence |
| A library card's failure line | `Said tone="danger"` (`FailureNote`) | body, red | unchanged: body, red (the failure line) |
| A library card's site notes; a room's pledge | `library-parts.tsx` `note`, `room-parts.tsx` `pledgeWords` | hard-coded regular 12/17 | caption, muted |
| A library space's row title, a room list's cell name, a seats card's room name | `library-parts.tsx` `title`, `room-list.tsx` `cellName`, `seats-card.tsx` `roomName` | hard-coded semibold 14/20 | `text.label` (the same values) |

One style, `answer/sentence-type.ts` `SENTENCE`, now gives the sentence's type to the model's words and to every line in their place.

**Left as they are**

| Place | Component | Type | Why |
|---|---|---|---|
| The hint lines over a meal's list | `answer/answer-hints.tsx` | caption, muted | Hint lines (P04 ticket 86): one see-through line, not a note |
| The meal list's rows, over-price rows, menu view, quest steps | `meal-list.tsx`, `over-price-rows.tsx`, `meal-menu.tsx`, `quest-steps.tsx` | their own row types | List rows by their boards (P04 tickets 71, 85, 91, 92; board E4) |
| A received invitation's caption, title and way | `received-invitation-card.tsx` | caption, title, body | Its own frame (the invitation card), with no answer sentence |
| A room list's time, login and failure lines | `library/room-list.tsx` `basis` | caption, muted | Board 다: the list's own lines |
| The seat ticket's cells, room-list counts, seat-card times, booking rows, seat map numbers | `seat-ticket.tsx`, `room-list.tsx`, `seats-card.tsx`, `bookings-cards.tsx`, `seat-map.tsx` | hard-coded | Cells and rows, not lines beside the sentence; `bookings-cards.tsx` is rewritten by #646 |
| The done message's rows, kiosk and return sentences | `library/library-done.tsx` | body ink, hard-coded rows | #646 rewrites this file (the booked ticket); its room path is for after #646 |
| The leave row's outcome ("취소했어요") | `answer/leave-button.tsx` `said` | body, ink | The settled failure/outcome line beside a row; its colour is ink where library failures are red: listed for a decision |
| The Tutorial sheet's Assistant words | `tutorial/tutorial-said.tsx` | body | Not the answer card: the Tutorial sheet's boards (MainTutorialOk/Fail) |
| Restaurant cards and travel boxes in event cards | `chat-restaurant-cards.tsx`, `chat-travel-box.tsx` | hard-coded | Card content by board ② of 공강에 밥 |
| The low step's floor and the keyboard's least content | `answer/card-caps.ts`, `frame-card-parts.ts` | bodyLg lines; title's line height for the headline's least room | The low step counts bodyLg lines, now the lines' own type; the least room stays 2 points over the headline's line |

## Acceptance criteria

- [x] The server's lines, a refusal's first line, a library outcome, and a library failure are drawn in the sentence's or the failure line's type, and a refusal's second line as the muted note, wherever it stands. (Render tests, red first.)
- [x] The model's words over a meal's list and the keyboard's headline are the sentence's type. (Integration tests: the first red first, the second replaced its check of the old type.)
- [x] No test checks the old types.
- [ ] Before and after pictures at 1.0 and 1.3 of each kind that changed.

## Comments
