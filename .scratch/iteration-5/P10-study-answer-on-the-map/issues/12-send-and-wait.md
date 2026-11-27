# 12: Sending the consent requests and waiting for them

Parent: [P10 spec](../spec.md) § With Friends; design `group-study-design` 나, `group-study-resume` 2 and 3 가
Status: ready-for-human
Blocked by: 11

Native files: none. Releases: with ticket 16.

## What to build

The group answer gets a new face on today's room request logic (`screens/main/library/room-party.tsx`, `api/room-requests.ts`). The logic is not rebuilt.

- **Sending:** "동의 요청 보내기" makes the request through `usePartyRequest`'s `send`.
  - It sends `{key: group.key, friendIds, useDesc}`, the Friends being the Plan's people after the asker.
  - The request is bound to the answer's card place, so the polling of every 3 seconds and the consent states are today's.
- **Locked after sending:**
  - the ticket loses its chevrons;
  - "같이" can no longer change the people, the time or the room, so the slot shows the people without opening the picker.
- **The consent line**, from the request's consents and companions:
  - just sent: "동의 0/3 · 다 받으면 알려 드려요. 닫아도 돼요.";
  - then: "동의 1/3 · 박민수, 이서연 님을 기다려요";
  - the main action, dimmed: "모두 동의하면 예약".
  - The count leaves the asker out.
- **A Friend declines or drops out:**
  - the sentence "박민수 님이 빠져서 세 명이에요. 한 명만 더 부르면 돼요.";
  - the dimmed ticket with "3명" red;
  - "+ 같이 한 명 더", which is today's `AskOneMore` (`room-ask-more.tsx`).
- **Cancelling a sent request:** "요청 취소 ›" at the end of the consent line, in the place and style the booked ticket gives "예약 취소 ›". It ends the booking party as today, and the card returns to its state before sending.

## How it is built

- **The request:**
  - `usePartyRequest` (`room-party.tsx`) takes a narrow card, `PartyCard`: the key, the Friends or the Quest, and the study input.
  - `partyCardOf` (`study-group-request.ts`) gives it the group's key, the answer's Friends by their parts' names, and the input.
  - `RoomRequestMaking` carries `input` (P10 ticket 08's field). The polling every 3 seconds and the request states are today's.
- **Held after sending:**
  - the room ticket is `locked`;
  - `ShownAnswer.lock` keeps the answer as it is, so the time card's picking does not open and no change asks again;
  - the use line gives way to the request's line.
- **The words** (`study-group-request.ts`):
  - `consentWords`: "동의 0/3 · 다 받으면 알려 드려요. 닫아도 돼요.", then "동의 1/3 · … 님을 기다려요", then "모두 동의했어요";
  - `outWords`: "박민수 님이 빠져서 세 명이에요. 한 명만 더 부르면 돼요."
- **The main button** (`study-group-act.ts`): "보내는 중이에요", "모두 동의하면 예약" dimmed, "+ 같이 한 명 더", which opens today's one-more picker (`OneMorePicker`, now exported), and "예약하기" for ticket 14.
- **From #656's review:**
  - the card lets the lock go when it goes, so the next answer changes as before;
  - a locked change asks nothing and lets a moved band go back;
  - a request taken back or ended on the server can be sent again, with a new idempotency key;
  - a send that failed says the room card's words; "요청 취소 ›" works once at a time and only on a booking party's request;
  - every Friend still in consented while one more is needed: "동의 2/2 · 친구를 더 불러 주세요".
  - a held answer's band is held too: `busy` in `time-bar.tsx` counts `shown.locked`, so a handle stays where it is.
- **From #655's pictures (ticket 11's card, fixed here since #655 is approved):** at the lowest step the card cut the room ticket's top under the sentence. The low step shows two lines of an answer's words (`LOW_LINES`, `text.bodyLg`); the card's sentence was `text.body`, one line, so the ticket rose into them once the login line moved under it. The sentence is now an answer's words in `text.bodyLg`, in a block at least those two lines high, so the ticket starts under them, logged in or out.
- **Taking it back:**
  - "요청 취소 ›" is P01 ticket 15's `TicketLine` link;
  - `PartyRequest.cancel` ends the booking party (`POST /quests/:id/end`) and forgets the card's request, so the card is to send again.

## Acceptance criteria

- [x] "동의 요청 보내기" posts `POST /library/room-requests` with the group's key, the three Friends' ids and the use picked, once, with an idempotency key. (Integration test with the mock server.)
- [x] Right after it, the ticket is locked and the line says "동의 0/3 · 다 받으면 알려 드려요. 닫아도 돼요.", with "모두 동의하면 예약" dimmed. (Integration test.)
- [x] With one consent the line names the two who are awaited. (Integration test, the polled request.)
- [x] A decline shows the three-person sentence, the dimmed ticket and "+ 같이 한 명 더". Asking one more uses today's companions call. (Integration test.)
- [x] The time card's "같이" does not open the picker once sent. (Integration test.)
- [x] "요청 취소 ›" ends the booking party, and the card is again the one to send, unlocked. (Integration test.)
- [x] Whole lint, format and types.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 9 minutes in the p04-58 session, from 22:45 to 23:04 UTC on 11-26, an estimate. Restacking it on ticket 11's later fixes is counted under ticket 11. No subagents.
- Tokens: input 54 uncached, with cache reads 19,642,770 and cache writes 51,585; output 35,038.
