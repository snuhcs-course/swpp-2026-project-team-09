# 27: A Lookup with no words comes with no stand-in sentence

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server.

## What happens now

The app now shows a reply's words as the dock's one line. When the model writes nothing beside a menu, a study area, a day, the Tutorial Quests or a Friend, the server puts its fixed sentence there ("아래에서 확인해 보세요."), which then shows in place of the Lookup's headline. Ticket 22 stopped it for a way and a place only. The shuttle's Lookup is a way's, so it has no sentence already.

## What the released app does with no words

Checked at `snunow/all/26.11.22-6` (native 1.0.3, the JavaScript every installed APK takes):

- The dock's line, the headline over the keyboard, the open card and the earlier turns draw a Lookup's lines, and fall back to the reply's words only when the Lookup has no line.
- A reply is sent back as its Lookup's lines (`shownText`), and as its words only when those lines are empty.
- A reply's `text` is checked as a string, so `""` passes.

Every Lookup a chat reply carries has a line: a day's date and counts, a menu's Restaurant and time, a study area's building, the Tutorial Quests' end, a Friend's place, a way's minutes. A place Lookup has none, but it comes from a pressed Place, never a chat reply. So no kind needs the sentence on the released app. A Lookup with no line would be sent back as an empty Assistant message, which the server refuses, so that case keeps the sentence.

## What to build

- A reply that shows only a Lookup with a line, and no refusal, has `text: ""` when the model wrote nothing, whatever its kind.
- Anything else shown with no words, and a Lookup with no line, keeps the fixed sentence.

## Acceptance criteria

- [x] A menu, a study area, the shuttle, a day, the Tutorial Quests and a Friend with no words are each replied with `text: ""` (`assistant-answer-reply.unit.test.ts`; five of the six failed before the change, the shuttle already passing as a way).
- [x] A Lookup with no line still has the fixed sentence.
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 10 minutes (estimate: gaps under 5 minutes between transcript entries, summed).
- Tokens: input 8,860,171 (cache reads 8,712,557, cache writes 147,502, uncached 112); output 34,907. Without cache reads, 182,521.
