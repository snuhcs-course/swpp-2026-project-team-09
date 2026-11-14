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

- [ ] With a booker and three Friends asked for a six-person room (minimum 4): one decline leaves the request `gathering` with two companions asked or consented, the Booking Party in place, and the booker's Notification "…이 못 온대요" with "1명 더 필요해요".
- [ ] Asking a fourth Friend then, and all three consenting, makes the request `ready`, and the booker gets "모두 동의했어요".
- [ ] With four Friends asked, one decline with the other three consenting makes the request `ready` at once: the minimum is met.
- [ ] A withdrawal after consenting, leaving the Booking Party, a cancelled invitation, and an ended friendship each take only that companion out.
- [ ] The booker leaving, and the last companion going out, end the request as today, and the Booking Party made for it is deleted.
- [ ] At 20:00 on the day before the meeting, a companion who has not answered is out at the next read; a request for today or made after 20:00 for tomorrow is not touched.
- [ ] The new route refuses a non-Friend, a companion already in the request, a request that is not `gathering`, and anyone but the booker.
- [ ] A booked room schedules "10분 뒤 끝나요" for each Holder at its end minus 10 minutes, and a cancelled booking cancels it.
- [ ] The app's room card shows a declined companion and the count still needed, and asks one more Friend through the route.
- [ ] The README's "Group study room requests" says the new rules in place of the old.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass.

## Comments
