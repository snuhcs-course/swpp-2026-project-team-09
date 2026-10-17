# 07: Resolvers and Closed Proposals: inviting Friends, the Place and the related Global Event

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06

## What to build

A User writes "내일 저녁 301동에서 비공개로 민수랑 지은이 초대해서 밥 먹는 파티, 축제 관련으로". The Proposal card shows a Closed Quest with the right Friends to invite, the right Place and the right Global Event. When "민수" could be two Friends, or "축제" two events, the Assistant asks which one. When a name matches nothing, it says so. 만들기 then invites the Friends and links the Global Event as the party form does.

These are the resolvers, the part of the spec that most decides accuracy. The model passes the User's words exactly as written. The server decides what they refer to and returns candidates, never a guess:
- **None.** The model asks or says there is none.
- **One.** The model uses its id.
- **Several.** The model asks, listing the names.

`proposeQuest` accepts only ids a resolver returned in this message, or ids in the last Proposal sent back with the history, and checks every one again. The model can never invent a Friend, a Place or an event.

This ticket also opens Closed Proposals. The form's readiness rule for a Closed Quest is written in the tool: no Board and at least one invited Friend.

**If time runs short.** P7 is planned at 10 hours. The Place and Global Event resolvers can move to Iteration 3 P5. The Friend resolver and Closed Proposals must stay together, since a Closed Proposal cannot pass without an invited Friend. An implementing agent that has to cut should finish the Friend resolver and Closed Proposals, then stop at that edge and record what moved under Comments.

## Acceptance criteria

- [ ] **`resolveFriend`.**
  - It takes words and returns the matching Friends of the User only, by name, ignoring spaces, each with name and id.
  - It never returns a User who is not a Friend.
  - It never returns a location.
- [ ] `resolvePlace` takes words and returns the matching Places by name or building number ("301동", "제1공학관").
- [ ] `resolveGlobalEvent` takes words and optionally a period and returns matching published Global Events only.
- [ ] Each resolver returns none, one or several candidates. The system prompt tells the model to ask when none or several are returned.
- [ ] **`proposeQuest` also takes Closed, Friends to invite, a Place and a Global Event.**
  - A Closed Proposal has no Board and at least one invited Friend.
  - An id that no resolver returned in this message and that is not in the last Proposal is refused field by field.
  - Invitees must be Friends.
  - Invitees must fit the capacity.
- [ ] A Proposal with a Global Event and no time starts at the event's start. A meeting time before it is kept, as the party form keeps it.
- [ ] The Proposal card fills its 공개/비공개, 어디서, 관련 행사 and 초대할 친구 rows.
- [ ] **만들기 runs the full making sequence.**
  - With a Global Event: attend it, apply the settings, add the meeting step when the time moved earlier, then invite the Friends.
  - Without one: make the Quest, then invite.
  - Afterwards the app goes where the form goes.
- [ ] **End-to-end tests with the scripted fake and seeded Users, Friends, Places and Global Events:**
  - one, two and no Friends matching a name
  - a non-Friend never returned
  - a Place by building number
  - a Place matching several
  - a Global Event matching several
  - a Closed Proposal without an invited Friend fails on that field
  - a Closed Proposal with a Board fails
  - `proposeQuest` refusing an id no resolver returned
  - `proposeQuest` refusing invitees beyond capacity
  - a Proposal with a Global Event taking its start
- [ ] **Screen tests:**
  - a Proposal card shows the Friends, the Place and the event
  - 만들기 with a Global Event attends it and invites through the fake server
