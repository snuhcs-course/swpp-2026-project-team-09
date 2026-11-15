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

- [ ] The app's refusal types and reply check accept `which-friend` and `pick-friend`; an offer missing a field still fails the reply.
- [ ] The cells: one per candidate, equal width, two to a row when there are more than three, label left and aside right, never cut at the label.
- [ ] A press sends `text` with `tapped` set to that Friend; the next request after it carries no `tapped` unless the User tapped again.
- [ ] The mock answers "민수랑 점심" with a `which-friend` copy over the mock's two Friends of one given name, when it has them (or the copy is added with package A's real reply once it exists).
- [ ] Tests: the reply check, the cells, and the press's request.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.
