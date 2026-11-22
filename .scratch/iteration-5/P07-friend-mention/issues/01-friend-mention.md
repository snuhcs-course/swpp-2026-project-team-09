# 01: "@" mentions a Friend in the Assistant's input

Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server and an app OTA update. The main server goes first: a server before it refuses a request that carries `mentions` (its request schema is strict), and the app sends the field only for a message that mentions someone.

## What happens now

A Friend is named in plain words ("민수랑 밥") and the Assistant finds them by name with `resolveFriend` (`main-server/src/assistant/tools/resolve-friend.ts`). Two Friends of one name make it ask which one. A Friend can also be added by a press ("＋ 같이", a face, a cell of the question), which goes by id.

## What to build

- **Both Assistant inputs.** The main map's input ("무엇이든 물어보세요") and the answer's input ("이어서 말하기") are one component, `mobile/src/screens/main/ai-input.tsx`. The mention lives in new files: `mobile/src/features/assistant/mentions.ts` (parsing and editing, pure), `mobile/src/screens/main/use-mentions.ts` (the input's state and the Friend list), `mobile/src/screens/main/mention-list.tsx` (the list).
- **The list.** "@" at the start or after a space opens the User's Friends just over the input, and so over the keyboard. The words after "@" filter by name (substring, any case). The list closes when nothing matches, so a space after a name no Friend has closes it. Each row is the face (photo or letters), the name, and the department under it, 52 high; five rows show before it scrolls. Only Friends (GET /friends) are listed.
- **Choosing.** A press puts "@이름 " in, drawn in the Friend colour. A backspace at its end or inside it takes the whole "@이름 " away. Any other edit inside it leaves the words as plain words. Several mentions are allowed, and the same Friend twice counts once.
- **Sending.** The request's `context` carries `mentions: [{ userId, name }]`, the Friends mentioned, each once, only when there is one. The words keep "@이름".
- **Server.** `context.mentions` is optional (at most 20, User ids). Before the run, every id that is not a Friend of the asker is dropped, and each name becomes the Friend's own (`main-server/src/assistant/mentions.ts`). The run's tools accept the mentioned ids from the start, as if a resolver had answered each alone. The model reads `[Mentioned with @: friend <id> <name>, …]` after the message, and a rule tells it to use those ids without `resolveFriend` and without asking which one. If it calls `resolveFriend` anyway, a mentioned Friend among the matches is the only one answered, as a tapped Friend already is.
- **Shown back.** The answer card's caption draws each "@이름" of a mentioned Friend in the Friend colour. The list of earlier questions keeps the plain "@이름" words.
- **Nothing else.** A mention sends no notification and no invitation, and changes nothing of the mentioned Friend.

## Not in this ticket

Mentions in other inputs (party forms, profile), places or non-Friends, Korean initial-consonant search.

## Tests

- `mobile/__tests__/mentions.unit.test.ts`: no "@", "@" inside a word, one match, two Friends of one name, a backspace over a mention, two mentions and the same Friend twice.
- `mobile/__tests__/ai-input-mention.integration.test.tsx`: "@" lists the Friends, "민수" narrows to the two 김민수 with their departments, a press puts one in, and the request carries its id; a message without a mention carries no `mentions`.
- `main-server/test/friend-mentions.unit.test.ts`: the schema, an id that is not a Friend dropped, the mentioned Friend over a same-named one in `resolveFriend`, the model's line, and the ids the tools accept.

## Comments
