# 32: A full 파티's 모집글 says so on its button

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- 찾기 leaves full 파티 out (ticket 10), but one opened from a link or 보낸 신청 says "8/8명" with 참여하기 or 참여 신청 still pressable (`mobile/src/screens/party/post-footer.tsx`); pressing it says "자리가 다 찼어요".

## What to build

- A 파티 with no place left shows its button as "정원이 다 찼어요", disabled, in `Button`'s disabled look (`surfaceSunken` ground, `inkMuted` words, `mobile/src/design-system/button.tsx`).
- A User who is a member or whose request waits sees their own state as now.

## Must not break

- The refusal when the 파티 fills while the post is open.
- Tests: app `party-post*` (`.integration`).

## Acceptance criteria

- [ ] A full 파티's 모집글 shows the disabled "정원이 다 찼어요". (App integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
