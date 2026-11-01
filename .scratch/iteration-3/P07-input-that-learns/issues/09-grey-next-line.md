# 09: The next line in grey after an answer

Parent: [P07 spec](../spec.md), "Ticket 09: the next line in grey"
Status: ready-for-agent
Blocked by: 04, and 02 for the chosen candidate

## What to build

The grey suggestion shows once, when the chat opens. Claude Code and Codex predict the next turn after each answer and show it in the empty input, which typing dismisses (research note 12 §1). This ticket does the same with no model call: when an answer leaves an obvious next request, the input shows it in grey and 채우기 puts it in the input, where the User can change it and send it as any message.

Server: `src/assistant/suggestions/next-line.ts`, the templates on the reply; `next-lines.service.ts`, which scores, draws and logs them; `nextLine` on `AssistantReplyDto`; `suggestion_impressions.moment` and one migration.

App: `nextLine` on the reply and the bubble, the placeholder, 채우기 in the AI input, the outcome, the chosen candidate sent with an unchanged line, and a mock next line.

Not here: grey text while typing, which needs a trial on both phones first, and moving the chat-open row into the input, which changes how a dismissal is told.

## Acceptance criteria

- [ ] A reply with a Proposal, an upcoming event card or a 식당 map button carries a next line as the spec's table; a reply with chips, or with none of these, carries none.
- [ ] No next line holds text someone else wrote: an event is named 이 행사 or 첫 번째 행사, with its id as the chosen candidate, which the server checks again.
- [ ] Each next line writes one row with `moment` `answer`, its propensity and receptiveness; a reply with nothing eligible writes none; a failure is logged and the reply stands.
- [ ] A next line shows from a score of 0.05. Ten in a row not taken within a day silence next lines for that User, and a held-back account never. A dismissal's cooldown holds them back too.
- [ ] The chat-open gate, the acceptance of its templates, the missed needs and the openings of `pnpm eval:suggestions` read `open` rows only.
- [ ] App: the line shows as the placeholder while the sheet is open and the input empty, 채우기 fills the input and tells `accepted`, an unchanged line sends its chosen candidate, a changed one none, and a new message or 새 대화 takes it away.
- [ ] Each template's sentence, sent to the real model, does what it says: benchmark cases in `eval/cases/next-lines.yaml`.
- [ ] README and GLOSSARY paragraphs; `pnpm lint`, `pnpm typecheck` and the touched tests pass in both packages.

## Comments

### Built (2026-11-01)

- Server: `next-line.ts` holds the three templates on plain data, and `next-lines.service.ts` scores, draws and writes the row. The reads shared with the chat opening moved to `impression-reads.ts`. `AssistantService.reply` asks for the line last, so that a failure there costs only the line.
- App: `nextLine` on the reply and the bubble, `Chat.nextLine` while the last bubble holds one and no answer is on its way, 채우기 in `AiInput`, `tookNextLine` for the outcome. `send` compares the text with the line, so that a changed line goes as an ordinary message.
- Benchmark: a User's turn takes `chosen`, and `eval/cases/next-lines.yaml` holds one case per sentence, outside `FIXED_SET`, so that no earlier score moves.

Decisions where the spec left room:

- **채우기 and no tap on the grey text.** A tap on the field must still bring the keyboard up, and a phone has no Tab key.
- **The chat opening keeps its row.** Moving it into the input would take away × and the reason line, and the cooldowns read ×. It is the next thing to look at, once the input's look has been seen on a phone.
- **No row for a reply with nothing eligible**, unlike the chat opening, whose silent rows count missed needs. No need is measured here, and a row per message would say nothing.
- **Only three templates.** A Quest card has its own join button, a shuttle answer leaves nothing obvious, and a Restaurant card has its own 파티 만들기. A line almost nobody takes is worse than none.
- **The lines are not personal yet.** A template's acceptance is everyone's in the bucket, as at the chat opening. What the User taught reaches the lines only when typing is added, where the same words can complete a prefix.

Tests: `next-line.unit`, `next-lines.integration`, `eval-replay-curves.unit` on the server; `chat-next-line.integration` and `answers-next-line.unit` in the app.

**On the real model.** `pnpm eval --yes --budget 1 --category next-lines`, Haiku 5.5, one run: 5 of 5 sentences did what they say, USD 0.015. Five runs of one are not a rate; they show that the sentences work.

### Agent usage (2026-11-01)

- Agent time: about 40 minutes (estimate), one Opus 5.5 session, waiting on no person: the ticket, both halves, the look at the local web build, the benchmark's cases, and the PR bodies of the stack.
- Tokens (estimate): about 91.5M input, of which about 91.1M cache reads, 412k cache writes and 0.2k uncached, and about 299k output. With cache reads excluded, about 0.7M. The reflector made no call; the benchmark's five cases cost about USD 0.015.
