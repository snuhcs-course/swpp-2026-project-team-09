# 23: The Board is asked back as chips

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server. The app already docks a reply's `ask` offers as chips under words that ask back (P04 ticket 05).

## What happens now

Found in use (feedback 2026-11-22, item 4): "코딩 스터디를 어느 게시판에 올릴까요? 진로와 취미 중 골라 주세요." came as words, twice in one conversation, with nothing to press. A coding study fits two Boards, so the rules have the model ask.

## What to build

- When proposeQuest refuses the Board alone, the reply's `offers` are the four Boards as `ask` offers (식사, 진로, 취미, 공연), each sending "<Board> 게시판으로 해 줘". The refusal tells the model the buttons are there, so that it asks in one short question without listing them.
- Any other field missing beside the Board gives no Board chips: the model asks for all of them in words. A Proposal made later in the same reply takes the Board chips away.
- planNewQuest never refuses the Board (it is 취미 when not given), so it is unchanged.
- A Place picked on the map and a time on a wheel need offer kinds of their own on both sides: ticket 24, not built here.

## Acceptance criteria

- [x] A 파티 refused for its Board alone carries the four Board offers and a note to the model. (`assistant-board-offers.integration.test.ts`, which fails before the change.)
- [x] Another field missing beside the Board, or a Proposal after the refusal, leaves no Board offers.
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-22)

Tickets 18 to 26 were done together in one session, 01:30–04:00 on 2026-11-22, with PRs 425 to 433; these figures are the whole batch's, not this ticket's alone.

- Agent time: about 2.2 hours (estimate: gaps under 5 minutes between transcript entries, summed).
- Tokens: input 220,838,000 (cache reads 220,158,000, cache writes 679,000, uncached 1,000); output 331,000. Without cache reads, 1,010,000.
