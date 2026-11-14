# 02: An invitation shows the invitee's own way

Parent: [P03 spec](../spec.md) ("The invitee's own way", "The app")
Status: ready-for-agent
Blocked by: none

## What to build

An invited User opens an invitation, and the main server answers with the Quest, its steps, and the invitee's own way to where everyone gathers: where they set out from, when, how long they walk, their Merging Point when it lies on their way, and when they must leave for what follows. The way is calculated for the invitee from their own Timetable and the location their phone gives, and reaches nobody else. The app has the typed call and a stored copy of a real reply.

## Acceptance criteria

- [x] `GET /quest-invitations/:id`, with the optional query `latitude` and `longitude`, answers the invitation's card to the invited User only. Anyone else, the Leader included, gets 404 `QUEST_INVITATION_NOT_FOUND`.
- [x] The card holds the Quest as the list of invitations gives it, the Holders' names with the Leader first, the steps in order, the gathering, and the invitee's own way.
- [x] The destination step and a meeting step are found from the Sub Quests alone, by the spec's rule.
- [x] Where the invitee sets out from follows the gathering calculation's rule with the invitee in the asker's place, called as it is: the Class or Sub Quest right before, else the request's location, else an item that ended at most 15 minutes ago, else unknown.
- [x] The invitee takes the Merging Point when the meeting step's Place lies on their way (at most one minute longer) and they can be there by its start, and goes straight otherwise.
- [x] An invitee who cannot make the start is told when they arrive. An invitee off campus with no Class before is told that no way can be drawn. An invitee with no Free Time then is told so.
- [x] The words and the scene are the spec's. The scene holds the invitee, the destination, what follows, their routes, and their flags, and no other person.
- [x] Reading the card stores nothing and sends no signal.
- [x] Unit tests of the pure function for the worked example and each boundary the spec lists; integration tests of the endpoint: the worked example, the request's location, the refusals, and no signal.
- [x] The app declares the contract, has `getInvitationCard(invitationId, location)` with a check of the reply, and its mock answers from a stored copy of the real reply for 민수 in the worked example.

## Comments

### Decisions (2026-11-14)

- The gathering's and the way's times are Korea time with the offset, as an answer's are; `sentAt` and the steps' times stay as the Quests' routes give them (UTC ISO), so a step reads exactly as a Holder reads it.
- A step is "ahead" when the Quest's own `ended` is false at the time now, rounded up to a whole minute as the meal Plan rounds it. Only a step whose Place is a Place of the list (`placeId` set) counts; a point or words alone do not.
- The meeting step's "next step" is the next step ahead in the order of starts that has a start and a Place of the list.
- The Place label follows the engine's rule (number with 동, else the name). The engine keeps it as a method of its `Naming` class, which needs a whole meal answer's arguments, so `plans/own-way.ts` has its own two-line `placeLabel` with the same rule instead of reshaping the engine.
- "Set out the moment a Class ends" wording is used when a Class of the invitee's day ends exactly when they set out; a Sub Quest ending then gets the plain "HH:MM에 나서면 돼요." line.
- When the invitee cannot make the start, the late line wins over the other way lines; a late way of 0 minutes leaves out "걸어서 0분".
- The first sentence of a way line is strong and the walking minutes plain; the off-campus, busy, same-building, and leave-by lines are plain.
- The leave-by line is given whenever something follows, also when the origin is unknown or the phone is off campus, since it needs no origin.
- The scene's pick and the Merging Point carry no tag, as their flags already say the time and the step; what follows is tagged as the meal scene tags it ("13:00 수업 · 8동"). A busy, unknown, or off-campus way keeps the destination's pick and flag, and the place and route of what follows.
- An off-campus phone gives no Place of its location to the calculation; an item that ended at most 15 minutes ago still gives a Timetable origin then, as the calculation's rule says, and the status is `ok`.
- The invitee's name comes from the User table; the Leader's from the Quest. Holders are listed by `QUEST_INCLUDE`'s order (when they entered) with the Leader moved first.
- The mock answers the stored card under whatever invitation id it is asked for, and ignores the location. Its User ids are the meal answer copy's (유상 `11ca538e…`, 민수 `35976b5c…`); its Place ids are the seed's.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5). The session that wrote the spec, reviewed each ticket, and opened the pull requests is counted once, under ticket 07.

- Agent time: about 58 minutes, an estimate from the transcript's timestamps; it includes waits for the machine's shared test lock.
- Tokens: output 107,703; input 31,128,933, of which 30,576,477 were cache reads, 552,186 cache writes, and 270 uncached. Without cache reads: 660,159.
