# 04: The time to leave stays in the list

Parent: [P05 spec](../spec.md) ("The notification service", "Further Notes")
Status: ready-for-agent
Blocked by: 01, 02, and the making of a party from a Plan (the invitations package's `POST /plans` and its reading of an invitation)
Native files: no

## What to build

A User who holds a party made from a Plan sees in "알림" when to leave for it: "12:18 나설 시각" with "학생회관식당까지 걸어서 15분" under it, from the moment the User is in the party. Once the time has come the row reads "지금 나서요". The row moves when the Plan changes and goes when the User is out of the party or the party is gone. Nothing rings a phone yet: until a kept Notification is sent at its time, the list is where the time to leave stands.

## Behaviour

- A new kind, `leave-by`: the party's Quest, when the User sets out, where to, and the walking minutes. It opens the party's card.
- It is scheduled for the Leader when the party is made, and for an invited User when that User accepts, each with that person's own time and walk as the Plan gives them. A person whose starting Place is unknown gets none.
- A walk alone of less than 5 minutes schedules none, as the design's rule for a leave-by notification says.
- A recalculated Plan replaces it; a User who leaves the party, a declined invitation, and a party that ends cancel it.
- The words follow the wireframe row "11. 알림 모음", boards t1, t2, and t19: the title "지금 나서요" once the time has come and "<HH:MM> 나설 시각" before it, and the line "<Place>까지 걸어서 <N>분".
- The Notification holds the User's own time and walk only, never another person's.

## Acceptance criteria

- [ ] Making a party from the design's example Plan keeps a `leave-by` for the Leader at the Leader's own time to set out, and none for anyone else.
- [ ] An acceptance keeps one for the accepting User at that User's own time.
- [ ] `GET /notifications` answers it with "<HH:MM> 나설 시각" before its time and "지금 나서요" from its time on.
- [ ] A changed Plan moves it, and leaving the party, a decline, and the party's end remove it.
- [ ] A walk alone of 4 minutes keeps none, and one of 5 minutes keeps one.
- [ ] "알림" shows the row with its time, and a press opens the party's card.
- [ ] Unit tests of the words; integration tests of each of the above through the routes.

## Comments
