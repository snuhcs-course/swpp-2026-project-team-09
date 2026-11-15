# 17: The question "민수가 두 명이에요" is answered with one press

Parent: [P02 spec](../spec.md); ticket 10's refusal; the seam `same-name-friends/seam.md` (shared notes), agreed with package A
Status: ready-for-agent
Blocked by: ticket 10 (#271)

## What to build

When the User's words fit several Friends, package A's guard answers with a refusal of kind `which-friend`: two lines from the server ("민수가 두 명이에요" / "누구와 먹을까요?" at a meal) and one offer per candidate, a new kind:

```ts
{ kind: 'pick-friend'; userId: string; label: string; aside: string | null; text: string }
```

`label` is the candidate's full name and `aside` their department; names are full names everywhere. The app draws the offers as cells of one width, the full name with the department under it in small muted text, and a press anywhere on a cell sends `text` as the User's words with the request context's `tapped: { kind: 'friend', userId }`, so that the server takes that Friend by id.

The app must accept `pick-friend` before package A sends it: the reply check is strict, and a reply with an unknown offer fails.

## Acceptance criteria

- [x] The app's refusal types and reply check accept `which-friend` and `pick-friend`; an offer missing a field still fails the reply.
- [x] The cells: one per candidate, equal width, up to three in a row and two to a row when there are more than three, the full name with the department under it in small muted text, never cut at the name.
- [x] A press sends `text` with `tapped` set to that Friend; the next request after it carries no `tapped` unless the User tapped again.
- [ ] The mock answers "민수랑 점심" with a `which-friend` copy over the mock's two Friends of one given name, when it has them (or the copy is added with package A's real reply once it exists).
- [x] Tests: the reply check, the cells, and the press's request.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

### Decisions (2026-11-15)

1. **The shape of an offer.** `label` and `text` are the candidate's full name ("김민수") and `aside` their department; no label is computed. A press sends the full name alone, never the department; two Friends of one full name send the same words, and `tapped` tells them apart. The tests' question (`mobile/__tests__/support/which-friend.ts`) is built that way, with the server's lines at a meal, "민수가 두 명이에요" and "누구와 먹을까요?".
2. **How `tapped` reaches the request.** No path in the app set `tapped` before: the main screen's context (`contextAt` in `chat-sheet.tsx`) always sends null. The Friend therefore rides on the User's message: `send(text, tapped)` keeps it on the message's bubble (`ChatBubble.tapped`, never sent back as words), and `useChat` lays the last User message's `tapped` over the context it reads. 다시 시도 sends it again, and the next message carries none. An app without a context (the switch off) sends no context, as before.
3. **The cells** are drawn by the refusal reply itself (`FriendPicks` in `refusal-reply.tsx`): as many to a row as candidates up to three, else two, an odd last cell keeping its width. Each shows the full name in the label style and the department under it in the caption style, muted, left-aligned; neither is cut, and the cells of a row stand as high as the tallest. A press anywhere on the cell picks; it is read aloud as "김민수, 컴퓨터공학부", or the name alone when there is no aside.
4. **The move to the choice grid.** Package B's P02-18 adds to the design system's `ChoiceGrid` a line under the name (`sub`) and a trailing mark that opens the Friend's profile without picking (`more`); it is not on Main yet, so these cells have no profile mark, and `ChoiceGrid` is unchanged here. Once P02-18 is on Main, the cells move to `ChoiceGrid` with `sub` (the department) and `more` (the profile), and that move decides how the grid stands up to three in a row.
5. **Other offers beside the Friends** stay buttons under the cells. None of the server's kinds mixes them; the app does not refuse the mix.
6. **The mock.** The mock's Friends have no two of one given name (and no 민수), so it gets no `which-friend` copy; the copy comes with package A's real reply. The fourth criterion stays open until then.
