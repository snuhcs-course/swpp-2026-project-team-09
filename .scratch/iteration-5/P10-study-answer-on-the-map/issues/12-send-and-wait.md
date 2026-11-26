# 12: Sending the consent requests and waiting for them

Parent: [P10 spec](../spec.md) § With Friends; design `group-study-design` 나, `group-study-resume` 2 and 3 가
Status: ready-for-agent
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
- **Cancelling a sent request** is today's: the requester ends the booking party. Where the card offers it is the plan's open question.

## Acceptance criteria

- [ ] "동의 요청 보내기" posts `POST /library/room-requests` with the group's key, the three Friends' ids and the use picked, once, with an idempotency key. (Integration test with the mock server.)
- [ ] Right after it, the ticket is locked and the line says "동의 0/3 · 다 받으면 알려 드려요. 닫아도 돼요.", with "모두 동의하면 예약" dimmed. (Integration test.)
- [ ] With one consent the line names the two who are awaited. (Integration test, the polled request.)
- [ ] A decline shows the three-person sentence, the dimmed ticket and "+ 같이 한 명 더". Asking one more uses today's companions call. (Integration test.)
- [ ] The time card's "같이" does not open the picker once sent. (Integration test.)
- [ ] Whole lint, format and types.

## Comments
