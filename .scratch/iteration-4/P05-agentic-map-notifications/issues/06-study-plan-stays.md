# 06: A study room's plan survives a decline, and the booker is told

Parent: [P05 spec](../spec.md) ("Part 2", "A study room's plan stays")
Status: ready-for-agent
Blocked by: 04 (the kinds and words of a Notification as that ticket leaves them)
Native files: no

## What to build

A booker has asked three Friends to a 관정 group study room. One of them declines. Today the room request and its Booking Party are gone and everyone gets "파티 구성원이 제안을 거절했습니다". From this ticket the plan stays: the booker is told who cannot come, the request says how many more people the room needs, and the booker can ask one more Friend into it. When everyone left has consented and the room's minimum is met, the booker is told that all agreed and the booking card is ready, as today.

## Behaviour

- **A companion out.** A decline, a withdrawal after consenting, leaving the Booking Party, a cancelled invitation, and an ended friendship with the booker each take that companion out of the request: their consent row goes, and for a Booking Party they are no longer invited or a Holder. The request stays `gathering` (a `ready` one goes back to `gathering` when it falls below the room's minimum).
- **What still ends a request**: the booker cancels it or leaves the Quest, the Quest is deleted, its time comes unbooked (`expired`), or no companion is left.
- **Ready** is: every remaining companion consented and is a Holder, and the booker and the companions are at least the room's minimum and at most its maximum.
- **Asking one more Friend.** A new route, the booker's only, takes a Friend's id while the request is `gathering`: the Friend gets the Booking Party's invitation and a consent row, the Booking Party's capacity grows when it must, and the request answers who is asked. More people than the room holds, a User who is not the booker's Friend, and a companion already in it are refused in the words the making of a request uses.
- **The request's answer** gains, for the booker's card: each companion with their state (asked, consented), who went out with the reason's word (거절), and how many more people the room needs.
- **The deadline.** For a request whose meeting is on a later day, a companion who has not answered by 20:00 on the day before counts as out. It is applied when any room request is read, as expiry is today.
- **Notifications** (kinds of the notification service, each opening the Booking Party's card): the booker gets "<name>이 못 온대요" with the line "<room> · N명 더 필요해요" or "<room> · 계획은 그대로예요" when a companion goes out; the booker gets "모두 동의했어요" with the line "<day> <start>–<end> <room>" when the request becomes ready; every Holder gets "10분 뒤 끝나요" with the line "<room> · <end>에 끝나요" for 10 minutes before the end of a booked room.
- **The app's room card** shows the new states in the lines it has: who consented, who is out, and how many more are needed, with a button that opens the Friend picker to ask one more.
- The notice "파티 구성원이 제안을 거절했습니다" is no longer sent for a companion going out. The notices of a request that ends stay.

## Must not change

- The consent's need for a Student Number, the companions' route, and what the phone reports after booking.
- `main-server/prisma/schema.prisma`.
- A request made with an existing Quest never deletes that Quest.

## Acceptance criteria

- [x] With a booker and three Friends asked for a six-person room (minimum 4): one decline leaves the request `gathering` with two companions asked or consented, the Booking Party in place, and the booker's Notification "…이 못 온대요" with "1명 더 필요해요".
- [x] Asking a fourth Friend then, and all three consenting, makes the request `ready`, and the booker gets "모두 동의했어요".
- [x] With four Friends asked, one decline with the other three consenting makes the request `ready` at once: the minimum is met.
- [x] A withdrawal after consenting, leaving the Booking Party, a cancelled invitation, and an ended friendship each take only that companion out.
- [x] The booker leaving, and the last companion going out, end the request as today, and the Booking Party made for it is deleted.
- [x] At 20:00 on the day before the meeting, a companion who has not answered is out at the next read; a request for today or made after 20:00 for tomorrow is not touched.
- [x] The new route refuses a non-Friend, a companion already in the request, a request that is not `gathering`, and anyone but the booker.
- [x] A booked room schedules "10분 뒤 끝나요" for each Holder at its end minus 10 minutes, and a cancelled booking cancels it.
- [x] The app's room card shows a declined companion and the count still needed, and asks one more Friend through the route.
- [x] The README's "Group study room requests" says the new rules in place of the old.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass.

## Comments

### Decisions (2026-11-15)

Details the ticket left to the implementation, listed so that any of them can be vetoed.

1. **A companion out** keeps their consent row with `consented` false, as the record of who was asked: answered when
   they declined or a change took them out, unanswered when the deadline passed. The answer's `companions[].state` is
   `asked`, `consented`, `declined`, or `unanswered`. A companion out gets 404 on consent and decline, is left out of
   the inbox's asks, and can still read the request.
2. **The room's name in the words** is the catalogue's name without "그룹스터디룸" and the rooms counted after it:
   "관정 4층 6인실".
3. **The deadline** is each companion's own, counted from when they were asked (`room_consents.asked_at`, by the
   Quests' clock): a companion asked at or after 20:00 the day before, by "친구 한 명 더 부르기" or as a Holder who
   joined the Quest, has no deadline, as a request made that late has none. The migration fills the column of the
   consents kept before it with their request's making.
4. **The last companion going out** ends the request with today's notice to everyone it asked; no "못 온대요" is kept
   then.
5. **Asking one more Friend** is for a request made for booking. A request made with an existing Quest refuses it with
   409 `ROOM_REQUEST_OF_QUEST`: a Friend who joins that Quest is asked, as today. The checks run in this order: 403,
   409 for the status, 409 for the Quest, then the 400s. A Friend who went out before is asked again.
6. **"10분 뒤 끝나요"** is kept for every Holder of the booked room's Quest but a companion out of the request; a
   cancelled booking forgets it for every Holder.
7. **`moreNeeded`** is 0 once the request is neither gathering nor ready.
8. **More people than the room holds** still ends a request, when a Holder joining its Quest makes it so. Fewer than
   the minimum keeps it gathering.
9. **Taking a companion out of a booking party** happens in the request's transaction: their invitation and their
   holding go, the leadership moves to the booker if they had it, and `quests-changed` goes to them and the Holders
   left.
10. **A companion declining the booking party's invitation** tells the booker once, by the room request's "못 온대요"
    with the room's count; the Leader's `declined` of an invitation is not kept for a party that a gathering or ready
    room request was made with.
11. **The room card's words**: "<name>님이 동의했어요", "<name>님의 답을 기다리고 있어요", "<name>님은 못 와요", "<name>님은
    답이 없어요", one line for each state in that order, and "N명 더 필요해요" while gathering. When everyone still in has
    consented and only the room's minimum is short, the status reads "친구를 더 불러 주세요" instead of the count of
    answers awaited.
12. **"친구 한 명 더 부르기"** opens the party form's Friend picker for one Friend, for a request made for booking while it
    gathers, and only from a main server that sends `companions`. A refusal shows the server's words under the open
    picker.
13. **The app's room request client** moved its mock to `mobile/src/api/mock/room-requests.ts`, for the file-length
    limit.

### Agent usage (2026-11-15)

Two implementing subagents (Opus 5.5): one for the main server, one for the app. The app's subagent then built ticket
07's app part, and its totals are given here once.

- Agent time: about 32 minutes for the main server and 53 minutes for the app (with ticket 07's app part), an estimate
  from the transcripts' timestamps; much of it was waiting for the shared test lock.
- Tokens, main server: output 121,641; input 25,491,892, of which 25,215,257 were cache reads, 276,395 cache writes,
  and 240 uncached. Without cache reads: 398,276.
- Tokens, app (with ticket 07's app part): output 135,328; input 38,675,826, of which 37,443,067 were cache reads,
  1,232,403 cache writes, and 356 uncached. Without cache reads: 1,368,087.
