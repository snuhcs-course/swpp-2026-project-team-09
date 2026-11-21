# 19: A made Proposal goes back with its 파티's id

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: P05's PR 425 (ticket 18) on the main server, which takes `proposal.madeQuestId`. Its schema is strict: a main server without it answers 400 to a message that carries the key, so this app's bundle is published after that server is on Production, as an `all` Release does.

Native files: none. Releases: an app OTA update only.

## What to build

From the user's feedback: after 만들기 made a 파티, "방금 만든 파티 19시로 수정해 줘" got a new Proposal card with 만들기, and a second 파티 was posted. The app sent the last Proposal back as if it were still only proposed.

- Once 만들기 on the card, or the party form that 수정 opens, made a Proposal into a Quest, the Proposal goes back with the Quest's id, `madeQuestId`. The main server then tells the model it was made: no new card, and the line says how to change it in its room.
- Before it is made, nothing is added.
- A made Proposal's card shows 만들었어요, never 만들기 (as today).

## What happens now

- The made state lives only in `use-proposal-making.ts`, keyed by the bubble; `messagesToSend` sends the Proposal without it.
- The party form tells the card that it made the Quest, without its id.

## What changes

- `SentProposal.madeQuestId?: string`; `sentProposalOf(proposal, madeQuestId)`.
- The chat's bubble keeps `madeQuestId`, set by `Chat.proposalMade(bubbleId, questId)`, which `useProposalMaking` calls when 만들기 or the form made it; 새 대화 forgets it with the conversation.
- The party form's `useSend` gives the made Quest's id with the outcome, and the held Proposal's `made` takes it.

## Must not break

- 만들기 and 수정 on a Proposal card (`answer-frame-proposal-card`, `answer-frame-proposal-edit`), the party form (`party-form*`), and the Proposal sent back by its values, the last one only.

## Acceptance criteria

- [ ] After 만들기, the next message sends the Proposal with `madeQuestId`. (Integration test.)
- [ ] After the form that 수정 opened made it, the same. (Integration test.)
- [ ] Before it is made, the Proposal goes back without the key. (Integration test.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 40 minutes in this session (an estimate from the transcript's timestamps: agreeing the field with P05, the code and tests, the sweep, and moving the branch onto `5.0/Main`), with no subagent.
- Tokens: output 38k; input 40.4M, of which 40.3M cache reads, 65k cache writes, and 126 uncached.
