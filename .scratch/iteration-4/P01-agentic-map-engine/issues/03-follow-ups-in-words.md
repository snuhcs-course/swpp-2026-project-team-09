# 03: The Assistant changes a Plan from words

Parent: [P01 spec](../spec.md) ("The Assistant", "The contract")
Status: ready-for-agent
Blocked by: 02

## What to build

While a Plan is on the screen, the User says "지은이도 불러 줘", "민수는 빼고", "12:30까지만", or "학생회관에서 먹자", and the Assistant answers with the Plan recalculated under the changed conditions. The model reads the conditions on screen from the request context, changes only what the User said, and says in one line what changed. A Friend or a Place the User tapped on the map is "이 사람" and "여기" of what they say.

## Acceptance criteria

- [x] The request context's `conditions` and `planId` reach the model as a line after the User's message that names the Plan on screen and its conditions, as a Proposal shown is given back today. Without them the conversation is given to the model as before.
- [x] A tapped Friend or Place in the request context reaches the model as a line of its own.
- [x] The meal tool takes the conditions back with a change: a Friend added or removed, a start or an end the User fixed, or a Place the User fixed. The constraints the conditions on screen hold for the people who stay are kept.
- [x] The tool accepts a Friend or a Place of the conditions on screen, or one the User tapped, without the resolver finding it again in this message, and still refuses an id that is neither.
- [x] The prompt fragment says how to change a Plan and what the tapped lines mean, for an app with the `answer` capability only. The chat without the capability is unchanged.
- [x] Unit tests for the lines; integration tests with the scripted model for each change, for the tapped context, and for the refusal. No evaluation suite is added, and the engine is not run against a question set (the spec's Testing Decisions).

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **The lines.** The Plan on screen reaches the model as one line after the User's new message, `[Plan on screen: {"plan", "date", "meal", "friendIds", "from", "until", "placeId"}]`, and a tapped Friend or Place as `[Tapped: friend …]` or `[Tapped: place …]`. They are added whenever the request context carries them, and a request without them gives the model what it gets today.
2. **What the tool takes.** A start, an end, and a Place beside the day, the meal, and the Friends. A person's constraints cannot be said by the model, so they come from the conditions on screen, while the day and the meal stay the same.
3. **Ids on screen or tapped** are accepted without the resolver finding them again. The service still checks that each person is the asker's Friend and that the Place exists.
4. **A context whose conditions start with someone other than the User** is refused with 400, before the message is counted.
5. **Where the asker sets out from is not changed in words.** The answer screen sends a `from` constraint to the recalculation when the User taps another Place.
6. **The other answers on the map** (where a Place is, the minutes to a Place, and a menu) are ticket 05.
7. **The prompt's rules are checked with the scripted model only.** No evaluation suite is added and no real model is run, as the spec's Testing Decisions say.

### Agent usage (2026-11-14)

Up to this ticket's commit. The same session as tickets 01 and 02, with one more subagent for this ticket.

- Agent time: about 7 minutes, an estimate from the transcripts' timestamps.
- Tokens: output 39,951; input 11,075,674, of which 10,902,549 were cache reads, 173,059 cache writes, and 66 uncached. Without cache reads: 213,076.

