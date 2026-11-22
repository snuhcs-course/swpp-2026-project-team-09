# 39: A Merging Point never makes anyone later than their own way by the shuttle

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server only. The answer keeps its shape; the app draws the legs it is sent.

## What happens now

From the checklist item "중간 합류 시나리오", investigated read-only (notes: `meal-checklist/item-5.md` in the session notes).

- A meal's Friends whose walk passes the asker's starting building meet the asker there and walk on together: the Merging Point (`meetingOf`). A Friend may take a detour of at most one minute.
- That choice is made on walking minutes alone, and a merged way is forced on foot.
- PR 486 put the shuttle into each person's own leg and left the merged way on foot.
- A throwaway test showed the cost. Take a Monday lunch at SK경영관 (58동), the asker from 301동, a Friend from 302동:
  - With the merge, both walk 25 and 28 minutes, and the meal starts at 11:28.
  - Each on their own, both take the shuttle, 13 and 15 minutes, and the meal starts at 11:15.
- So the Plan is later, it sinks in the order (`plan-order.ts` counts those minutes), and the words say "같이 걸어서 25분".

## What to build

- The meeting on the way is kept only for those it gets to the place no later than their own leg by the shuttle would:
  - an asker whose own shuttle is sooner meets nobody, and everyone goes their own way;
  - a Friend whose own shuttle is sooner goes their own way, and the other Friends still meet the asker;
  - with no Friend left, there is no meeting and no meeting flag.
- **The comparison is only with an own leg by the shuttle.** A merge on foot stays as before, with its one-minute detour and its wait at the meeting point. Comparing it with the own walk would drop merges that exist today.
- Two people riding the same shuttle from the same stop is not planned here. The PR says it is left out.
- The order of the Plans and the reply's words follow the legs taken, as they already read `walkMinutes`, `by` and `meeting`.
- `meetingOf` moves with the new rule to `merging-point.ts`. `gathering.ts` was at its line limit and re-exports `DETOUR_MINUTES`.

## Case table

| Row | Case | Merging Point | Where tested |
| --- | --- | --- | --- |
| 1 | The merge gets the Friend there as soon as their own shuttle (12:16 either way) | kept | `gathering-merging-shuttle.unit.test.ts` |
| 2 | The asker's own leg by the shuttle is faster (6 minutes against 15 on foot) | none; the asker by the shuttle, the Friend on foot | the same file |
| 3 | The Friend's own leg by the shuttle is faster (6 minutes against 15 through the asker) | none; the asker on foot, the Friend by the shuttle | the same file |
| 4 | Two Friends, one whose own shuttle is faster | the other Friend still meets the asker | the same file |
| 5 | The reported case: a Monday lunch at SK경영관, the asker from 301동, a Friend from 302동 | none; both by the shuttle, 13 and 15 minutes, the meal at 11:15 instead of 11:28 | the same file, on the seed's walking table and shuttle timing |
| 6 | A day without the shuttle (Saturday), the same people and place | kept, on foot, as before | the same file |
| 7 | A walk under 10 minutes, which never weighs the shuttle | kept, as before | the same file |
| 8 | A merge on foot with a one-minute detour | kept, as before | the same file; `gathering.unit.test.ts` |

## Acceptance criteria

- [x] Rows 2 to 5 fail on 5.0/Main and pass after; rows 1 and 6 to 8 hold on both.
- [x] The worked example (Tuesday 2026-11-17, on the seed's shuttle timing) changes only at 자하연식당:
  - 민수 takes the shuttle there, 16 minutes against 19 on foot through 301동, so nobody meets on the way.
  - The meal there starts at 12:31 instead of 12:35, with 민수 and with both Friends.
  - Board a7 (자하연식당 pressed) follows: 12:31–12:55, 24 minutes. 나 arrives at 12:07, 민수 at 12:31 by the shuttle and 지은 at 12:18.
  - The case of a meeting that moves with the start now plans 3식당, where 나 and 민수 still meet at 301동, at 12:47.
  - 3식당 and 학생회관식당 still merge, and the order of the Plans is unchanged.
- [x] The README's meal ways say when a meeting on the way is kept.
- [ ] Eval: not run. The run needs the team's model key, which this worktree does not have.
- [x] Lint, format and types of the main server pass.

## Comments
