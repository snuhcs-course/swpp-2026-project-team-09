# 17: The question "민수가 두 명이에요" is answered with one press

Parent: [P02 spec](../spec.md); ticket 10's refusal; the seam `same-name-friends/seam.md` (shared notes), agreed with package A
Status: ready-for-agent
Blocked by: ticket 10 (#271)

## What to build

When the User's words fit several Friends, package A's guard answers with a refusal of kind `which-friend`: two lines from the server ("민수가 두 명이에요" / "누구와 먹을까요?" at a meal) and one offer per candidate, a new kind:

```ts
{ kind: 'pick-friend'; userId: string; label: string; aside: string | null; text: string }
```

`label` is the candidate's full name and `aside` their department; names are full names everywhere. The app draws the offers as the choice grid's cells, the full name with the department under it in small muted text and a mark at the end that opens the Friend's profile, and a press anywhere else on a cell sends `text` as the User's words with the request context's `tapped: { kind: 'friend', userId }`, so that the server takes that Friend by id.

The app must accept `pick-friend` before package A sends it: the reply check is strict, and a reply with an unknown offer fails.

## Acceptance criteria

- [x] The app's refusal types and reply check accept `which-friend` and `pick-friend`; an offer missing a field still fails the reply.
- [x] The cells: one per candidate, the choice grid's, of one width and two to a row, the full name with the department under it in small muted text, and at the end the mark that opens the Friend's profile without picking.
- [x] A press sends `text` with `tapped` set to that Friend; the next request after it carries no `tapped` unless the User tapped again.
- [x] The mock answers "민수랑 점심" with a `which-friend` copy over the mock's two Friends of one given name, when it has them (or the copy is added with package A's real reply once it exists).
- [x] Tests: the reply check, the cells, and the press's request.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

### Decisions (2026-11-15)

1. **The shape of an offer.** `label` and `text` are the candidate's full name ("김민수") and `aside` their department; no label is computed. A press sends the full name alone, never the department; two Friends of one full name send the same words, and `tapped` tells them apart. The tests' question (`mobile/__tests__/support/which-friend.ts`) is built that way, with the server's lines at a meal, "민수가 두 명이에요" and "누구와 먹을까요?".
2. **How `tapped` reaches the request.** No path in the app set `tapped` before: the main screen's context (`contextAt` in `chat-sheet.tsx`) always sends null. The Friend therefore rides on the User's message: `send(text, tapped)` keeps it on the message's bubble (`ChatBubble.tapped`, never sent back as words), and `useChat` lays the last User message's `tapped` over the context it reads. 다시 시도 sends it again, and the next message carries none. An app without a context (the switch off) sends no context, as before.
3. **The cells** are the design system's `ChoiceGrid` (P02-18), unchanged: the full name as the name, the department as `sub` under it, no value at the right, and `more` at the end, read as "김민수 프로필", which opens the Friend's profile over the answer card the way a person chip does (`useOpenFriendProfile`) and picks no one. The grid stands two to a row, so three candidates take two rows; that is the grid's rule, not this ticket's. Outside the answer frame there is no profile to open, and the cells have no mark. A press anywhere else on the cell picks; it is read aloud as "김민수, 컴퓨터공학부", or the name alone when there is no aside.
4. **Other offers beside the Friends** stay buttons under the cells. None of the server's kinds mixes them; the app does not refuse the mix.
5. **The mock.** The mock's Friends have no two of one given name (and no 민수), so it gets no `which-friend` copy; the copy comes with package A's real reply. The fourth criterion stays open until then.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5), resumed four times (the full-name cells, the choice grid left as it was, and the cells moved onto P02-18's grid). This session's review and the pull request are counted under P03 ticket 07.

- Agent time: about 52 minutes, an estimate from the transcript's timestamps; it includes waits for the Mac's shared check slots.
- Tokens: output 101,867; input 25,892,194, of which 25,272,878 were cache reads, 619,040 cache writes, and 276 uncached. Without cache reads: 721,183.

### Mock copy (2026-11-16)

- Package A's real reply (P01-20, #304) to "배고파, 민수랑 같이" over two Friends 김민수 (컴퓨터공학부) and 이민수 (경영학과) is kept in `mobile/src/api/mock/data/refusals.json`, so that a mock build shows the question. Its two ids are not the mock's Friends, so a press sends words the mock answers in general.
