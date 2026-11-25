# 10: The how-about comparisons compare like with like

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: an app OTA update.

## What happens now

- "같이 먹으면 식사가 28분 줄어요" compares each restaurant's time together with the User's best time alone at any restaurant. Removing a Friend left it at 28 minutes, and a restaurant with the same time together read as a loss.
- The app's note on a place the User pressed ("여기면 어때?") says "지금 계획과 같아요" when only the minutes together are equal: "12:32–13:45 함께 73분 · 지금 계획과 같아요" for another restaurant than the plan's.

## What to build

- The note says "지금 계획과 같아요" only for the plan's own place; another place with equal minutes says "시간은 지금 계획과 같아요".

Left as it is: "같이 먹으면 식사가 28분 줄어요". The design defines it as what changes from eating alone, the User's best plan alone against the plan together ("eating time drops from 55 minutes to 22", the design's worked example). In the usage test the minutes were right: the Friend left in the plan was the one who limited it, so removing the other changed nothing. Measuring at the same restaurant would change the design.

## Acceptance criteria

- [x] Another place with the same minutes does not say "지금 계획과 같아요". (Unit test, fails before the fix.)
- [x] The plan's own place with the same minutes does. (Unit test.)
- [x] Lint, format and types of the app pass.

## Comments

The app's "여기면 어때?" card was removed by P04 ticket 66 (2026-11-25).


### Agent usage (2026-11-21)

- Agent time: about 2 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 8k; input 4.9M, of which 4.9M cache reads, 12k cache writes and 18 uncached. No subagents.
