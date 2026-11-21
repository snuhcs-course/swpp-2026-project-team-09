# 10: The how-about comparisons compare like with like

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [06](06-free-stretch-not-a-meal.md), which changes the same meal lines.

Native files: none. Releases: an app OTA update and the main server.

## What happens now

- "같이 먹으면 식사가 28분 줄어요" compares each restaurant's time together with the User's best time alone at any restaurant. Removing a Friend left it at 28 minutes, and a restaurant with the same time together read as a loss.
- The app's note on a place the User pressed ("여기면 어때?") says "지금 계획과 같아요" when only the minutes together are equal: "12:32–13:45 함께 73분 · 지금 계획과 같아요" for another restaurant than the plan's.

## What to build

- The time lost by eating together is measured against eating alone at the same restaurant.
- The note says "지금 계획과 같아요" only for the plan's own place; another place with equal minutes says that the time is the same ("시간은 지금 계획과 같아요").

## Acceptance criteria

- [ ] A restaurant where the User alone could stay 10 minutes longer than together says 10 minutes, whatever another restaurant gives. (Unit test, fails before the fix.)
- [ ] Another place with the same minutes does not say "지금 계획과 같아요". (Unit test, fails before the fix.)
- [ ] Lint, format and types of the app and the main server pass.

## Comments
