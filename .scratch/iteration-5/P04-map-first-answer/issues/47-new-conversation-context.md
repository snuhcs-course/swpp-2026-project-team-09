# 47: A new conversation's first message carries none of the answer before it

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

The user asked for tomorrow's lunch, went back with "←", typed "예술계 점심" on the main map, and got tomorrow again.

- A request's context comes from `contextAt` (`mobile/src/screens/main/use-context-chat.ts`): the answer on screen's `conditions` and its Plan's `planId`, from the `shownNow` ref, which an effect sets after each render (`chat-sheet.tsx`).
- `sendNew` starts a new conversation and sends in the same moment (`conversations.ts`), before any render. So `shownNow` still holds the answer before, and the first message carries its `conditions` and `planId`. The server reads them as "[Plan on screen: …]" and keeps that day.

## What to build

- `contextFor` (`mobile/src/features/assistant/request-context.ts`), which `useChat`'s `ask` uses for every request, sends and retries alike. A conversation that holds no reply yet sends `conditions: null` and `planId: null`. It sits where the request is made, so no caller of `send`, `sendNew` or "＋ 새 질문" can get around it.
- `tapped` stays. It is the building pressed on the map now, and the effect that keeps it clears it when the press ends. A first message asked about a pressed building still needs it.

## Tests

- `mobile/__tests__/answer-new-conversation-context.integration.test.tsx`: a follow-up on a meal answer carries its `conditions` and `planId`. The first message on the main map after "←", and the one after "＋ 새 질문", carry neither, with `tapped` null and no earlier message.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 35 minutes in one session, no subagents (an estimate, 01:46 to 02:20 KST, the rename included).
- Tokens: about 5 M input, of which about 4.8 M cache reads and 0.2 M cache writes, and about 20 k output (an estimate).
