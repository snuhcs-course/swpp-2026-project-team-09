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
