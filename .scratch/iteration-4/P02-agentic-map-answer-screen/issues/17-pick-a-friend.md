# 17: The question "민수가 두 명이에요" is answered with one press

Parent: [P02 spec](../spec.md); ticket 10's refusal; the seam `same-name-friends/seam.md` (shared notes), agreed with package A
Status: ready-for-agent
Blocked by: ticket 10 (#271)

## What to build

When the User's words fit several Friends, package A's guard answers with a refusal of kind `which-friend`: two lines from the server ("민수가 두 명이에요." / "누구인가요?") and one offer per candidate, a new kind:

```ts
{ kind: 'pick-friend'; userId: string; label: string; aside: string | null; text: string }
```

The app draws the offers as cells of one width, `label` at the left and `aside` at the right, and a press sends `text` as the User's words with the request context's `tapped: { kind: 'friend', userId }`, so that the server takes that Friend by id.

The app must accept `pick-friend` before package A sends it: the reply check is strict, and a reply with an unknown offer fails.

## Acceptance criteria

- [x] The app's refusal types and reply check accept `which-friend` and `pick-friend`; an offer missing a field still fails the reply.
- [x] The cells: one per candidate, equal width, two to a row when there are more than three, label left and aside right, never cut at the label.
- [x] A press sends `text` with `tapped` set to that Friend; the next request after it carries no `tapped` unless the User tapped again.
- [ ] The mock answers "민수랑 점심" with a `which-friend` copy over the mock's two Friends of one given name, when it has them (or the copy is added with package A's real reply once it exists).
- [x] Tests: the reply check, the cells, and the press's request.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

### Decisions (2026-11-15)

1. **The shape of `text`.** A press sends the full name alone ("김민수"), never the department; two Friends of one full name send the same words, and `tapped` tells them apart. The department is only the cell's `aside`. The tests' question (`mobile/__tests__/support/which-friend.ts`) is built that way.
2. **How `tapped` reaches the request.** No path in the app set `tapped` before: the main screen's context (`contextAt` in `chat-sheet.tsx`) always sends null. The Friend therefore rides on the User's message: `send(text, tapped)` keeps it on the message's bubble (`ChatBubble.tapped`, never sent back as words), and `useChat` lays the last User message's `tapped` over the context it reads. 다시 시도 sends it again, and the next message carries none. An app without a context (the switch off) sends no context, as before.
3. **The cells** are the design system's choice grid, which gains `columns` (two unless said): the question's grid takes as many columns as candidates up to three, else two. The name stands at the left and the aside at the right; the aside gives way first, so the name is cut only when it alone is wider than its cell, which a full name at a third of the card is not. A candidate with no aside shows the name alone and is read aloud by it.
4. **Other offers beside the Friends** stay buttons under the grid. None of the server's kinds mixes them; the app does not refuse the mix.
5. **The mock.** The mock's Friends have no two of one given name (and no 민수), so it gets no `which-friend` copy; the copy comes with package A's real reply. The fourth criterion stays open until then.
