# 45: The order's words say the 30 minutes and the next item

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server only. The answer keeps its shape; only planMeal's result to the model and the meal rule change.

## What happens now

Reported on 2026-11-23 just after Release 26.11.23-12. "배고파" at 13:05 from home, the first Class over at 10:45 in 301동, the next at 15:30 in 302동. The reply said the places were ordered by nearness to 302동, yet 3식당 came first.

- **The order follows its rule.** With the asker's origin unknown (ticket 42), the plans where everyone has 30 minutes or more come first. In each tier, the plans come by the least walking on to the User's next item.
- At 13:05, 301동식당 and 302동식당 close at 13:30, so they have 25 minutes and fall into the second tier. 3식당 (to 14:00) and 학생회관식당 (to 14:30) lead.
- Walking on to 302동, from the seed's walking table: 302동식당 0 minutes, 301동식당 3, 3식당 15, 학생회관식당 17.
- **The words do not follow it.** planMeal's `order` (ticket 40) said only "ordered by the least walking on to the User's next item at 302동". It left out the 30 minutes, and named the item by its Place alone. The model said "302동과 가까운 순서", which the list contradicts.

## What to build

- `orderWords` says the order as it is:
  - where the User sets out from is not known;
  - the plans where everyone has 30 minutes or more come first, then the shorter ones;
  - in each, by the least walking from the Restaurant on to the User's next item, named by its time and Place ("15:30 302동 수업"), or by the earliest start, then the longest time to eat, when nothing follows;
  - never 가까운 순서.
- A new `fellBack` names the plans with less walking than the first that the 30 minutes put after it, and why, as words to say: "302동식당과 301동식당은 13:30에 닫아 25분뿐이에요". The end is "에 닫아" when the Restaurant closes, or "엔 나서야 해서" when someone must leave then.
- **The meal rule:**
  - with `order`, never call the order 가까운 순서 or nearest to a Place, and give the true reason from `order`;
  - with `fellBack`, say it as it is before that sentence.
- The order itself is unchanged.

## Case table

| Row | Case | `order` | `fellBack` |
| --- | --- | --- | --- |
| 1 | 13:05, no position, next 15:30 in 302동; 301동식당 and 302동식당 close at 13:30 | the 30 minutes first, then the walk on to "15:30 302동 수업" | "302동식당과 301동식당은 13:30에 닫아 25분뿐이에요" |
| 2 | No position, nothing ahead | the 30 minutes first, then the earliest start and the longest time to eat | none |
| 3 | The origin known | none | none |
| 4 | No plan | none | none |

All four are in `order-words.unit.test.ts`, through the real planner on the seed's walking table. Row 1 also checks that the order stays 3식당, 학생회관식당, 302동식당, 301동식당.

## Acceptance criteria

- [x] Rows 1 to 4. Row 1's words fail on 5.0/Main, and its order passes on both.
- [x] The meal rule forbids "가까운 순서" for this order and says `fellBack` as it is.
- [ ] Eval: not run. The run needs the team's model key, which this worktree does not have.
- [x] Lint, format and types of the main server pass.

## Comments
