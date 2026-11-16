# 14: A Tutorial question in words first, then the way there and back

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md); design section 6.5
Status: ready-for-agent
Blocked by: nothing (13 and package C's P02-10 are merged)

## What to build

"학생증 어디서 받아?" is answered in words first, with no map change: the place, how to apply, and the opening hours, from the Tutorial content, with the button "가는 길 보기" (board q11). Pressed, the button shows the way there and back before the next Class: the shuttle weighed against walking, the time at the place, and the walk on to the Class (board q12: "셔틀로 가면 12:08 도착 / 13:00 수업 전에 다녀올 수 있어요").

## Acceptance criteria

- [x] The text answer comes from `getTutorial` as today, and the reply offers "가는 길 보기" through package C's reply `offers`.
- [x] `findWay` takes a stay at the Place (`stayMinutes`). The way then goes on to the next item, and the lines say whether the User is back in time.
- [x] Unit and integration tests.

## Notes

The button needs a reply that carries buttons without being a refusal. When package C's P02-10 lands, this ticket is triaged against its `offers` shape.

## Comments

### Triage and decisions (2026-11-16)

1. **The reply's buttons.** Package C's offers (P02-10) live only in a refusal, and P02-13's answer offers only open screens. A reply that draws nothing now carries its own `offers?: ReplyOffer[]` beside its text, asks only (`{ kind: 'ask', label, text }`), left out when there are none. The server keeps them only without an answer, a Lookup, or a refusal: a run that also drew a way keeps the way. The app draws them under the model's words with the refusal's button cells.
2. **When.** `getTutorial` puts 가는 길 보기 under the reply for an app that draws answers, when it answers one quest by its `questKey` and that quest is done at a place. The button sends "{title} 가는 길" ("학생증(S-CARD) 발급받기 가는 길"), since the content has no short names. The board's second button, "학생처 안내", is not built: no offer opens a link, and the model's words already cite the quest's links.
3. **`findWay` takes `quest`**, a quest's key, rather than a bare `stayMinutes`. The server reads the quest's first place (as ticket 13, decision 4), its floor or point label, its hours, and its note, which the flag and the basis need. The stay is ticket 13's 10 minutes (`STOP_MINUTES`). findWay's description lists the quests done at a place by key and title, so the model maps the button's words to a key without calling getTutorial again.
4. **The way** is findWay's: the shuttle weighed against the walk, from where the User is. The stay starts at the arrival, or when the place opens. The next item is the User's next item of any kind, as in ticket 13; the walk on is added only when that item has a Place.
5. **The lines.**
   - First: "셔틀로 가면 **12:08** 도착", "걸어서 가면 **11:58** 도착", or "지금 **NH농협두레문예관 2층**에 있어요".
   - Second, the first that holds:
     - "**13:00 수업 전**에 다녀올 수 있어요";
     - "다녀오면 **13:00 수업**에 17분 늦어요";
     - "10분 머물면 **14:29**에 끝나요", with no next item;
     - "오늘은 17:50에 닫아요", or "오늘은 열지 않아요" on a day without hours.
6. **The basis.**
   - "셔틀: 정류장까지 2분 · 11:55 셔틀 · 타기 9분 · 내려서 4분". With no shuttle reported, "기다림 약 4분" in place of "11:55 셔틀".
   - "걸으면 22분 · 12:12 도착이라 셔틀이 4분 빨라요", or the walk's own lines.
   - "09:00에 열어 12분 기다려요", when the User waits for the place to open.
   - "거기서 10분 · 24동까지 걸어서 8분 · 12:26 도착".
   - The quest's note.

   The board's "받는 데 10분" reads "거기서 10분", which fits every quest.
7. **The map.**
   - The way as findWay draws it: the walk, or the ride stretch by stretch with the walk faded.
   - The place as a pick tagged with its words.
   - The next item's Place as `next`, "13:00 수업 · 24동", with the walk on as a `next` route.
   - The flag "12:08 도착 · NH농협두레문예관 2층", `late` when the User would be late.

   No band. The one action is route guidance to the place; nothing completes the quest. The chips are "301동에서" and "13:00 수업까지".
8. **The pill** shows the button's words as the question, as for any ask offer; the board's pill keeps "학생증 어디서 받아?".

### Where the data differs from the board

- With a shuttle reported at 신소재공동연구소 at 11:50, the seed gives board q12's numbers: 12:08 by shuttle, 12:12 on foot, 4 minutes faster, and 12:26 at 24동. The ride is 9 minutes and the walk from the stop 4; the board says 7 and 6.
- The flag and the pick read "NH농협두레문예관 2층", the seed's name for 67동, not "2층 학생지원센터".

### Lines in other packages' files

- Package C, `screens/main/answer/refusal-reply.tsx`: `OfferCell` and `hasMain` are exported (two words).
- Package B:
  - `api/assistant-types.ts`: `AssistantReply.offers?` and the `ReplyOffer` type.
  - `api/server/assistant-client.ts`: the reply's check accepts asks.
  - `features/assistant/use-chat.ts`: the bubble carries the offers.
  - `screens/main/answer/answer-frame.tsx`: `Words` draws the words with their offers before the Plan's lines.

