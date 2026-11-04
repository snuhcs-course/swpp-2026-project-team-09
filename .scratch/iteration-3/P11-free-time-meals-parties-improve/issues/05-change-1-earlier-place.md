# 05: Change 1: a Place named one turn earlier makes the lunch a Proposal

Parent: [P11 spec](../spec.md) ("The chat: changes")
Status: ready-for-agent
Blocked by: 04

## What to build

A User asks for lunch at 학생회관 tomorrow, the Assistant offers to set it up and asks who comes, and the User answers "응 김지은이랑". Today the Assistant then shows Restaurants instead of making a Proposal for that lunch, in all 3 runs of P05's R1. After this change it makes the Proposal with `proposeQuest`, as the 공강 rules say: a request that names a Place is a 파티 to propose.

This is the change the PM promised on #160, and the first of at most four. The fix is in the two 공강 rules that lead to `findMealRestaurants`:
- they do not say that a Place named in an earlier turn counts as a Place named in the request;
- their follow-up rule says a follow-up calls `resolveFriend` and then `findMealRestaurants` again.

It works on ticket 04's branch, which goes into `3.0/Main` as one pull request at the end of ticket 06.

## Acceptance criteria

- [ ] **One change**, in those two rules. `follow-up-yes-after-menus`, its case and its label do not change.
- [ ] **One P4 suite run** follows, with the same set, world and settings as the before set, under ticket 04's run checks and budget rule.
- [ ] It is compared with the before set by `pnpm eval:compare`. A change that makes things worse is reverted, and the revert stays in the record.
- [ ] **`record.md`** gets one line: hypothesis → what changed → the cases that changed → kept or reverted, with the run's commit, date and cost. The run's result files stay local.
- [ ] The existing unit and integration tests of the Assistant, including the labels test, stay green.
- [ ] Whether the P19 case now passes is read in ticket 06's after set.

## Comments
