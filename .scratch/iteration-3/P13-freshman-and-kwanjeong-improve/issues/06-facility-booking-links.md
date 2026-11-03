# 06: 시설 예약하기 on a made Proposal, and the plan for AI facility booking

Parent: [P13 spec](../spec.md) ("Facility booking links")
Status: ready-for-agent
Blocked by: none

## What to build

The Assistant cannot book facilities other than 관정. Until it can, a Proposal it made at a place with an online booking page carries a "시설 예약하기" button once the User makes it (만들기), opening that page: a per-facility deep link on athletics.snu.ac.kr where one exists, else its list page, and the index of ssims.snu.ac.kr (예약하샤) for the colleges' study rooms. The links come from a server table; the model is not told about them, so no prompt changes. A research and design document records how the Assistant could book facilities later.

## Acceptance criteria

- [ ] `main-server/seed/facility-booking.json` holds the spec's entries: the athletics deep links (`https://athletics.snu.ac.kr/facility/list?mode=view&facility_idx=N` for 1, 2, 17, 18, 19, 20, 24, 27, 30, 35), the list page for a Place with several facilities (71-1동), and `https://ssims.snu.ac.kr/index.do` for 58, 44-1, 300 and 301. Each entry names a Place of the seed by number, or by name where the seed has no number; a facility the seed does not hold is left out and listed in the PR.
- [ ] `ProposalPlace` (`main-server/src/assistant/proposal.ts`) gains `booking: { label, url } | null`, filled in `tools/propose-quest.ts` from the table. `questProposalSchema`'s `place` accepts an optional `booking`, which proposeQuest ignores and fills again.
- [ ] `mobile/src/api/assistant-types.ts` and the mocks follow. `chat-proposal-card.tsx` shows a full-width secondary "시설 예약하기" under 수정 and 만들기 only when `making` is `made` and the place has `booking`, and opens `booking.url` with `expo-web-browser`.
- [ ] `references/ai-facility-booking.md` (the TODO plan): for athletics.snu.ac.kr and ssims.snu.ac.kr, the login, whether a phone-side session as in ADR 0012 works, the requests that book and cancel and what they need, the terms of use, and the tools and cards the Assistant would need; from public pages only, with no login or booking.
- [ ] Tests, named by ADR 0007: `main-server/test/facility-booking-file.unit.test.ts` (the file parses; every URL is on athletics.snu.ac.kr or ssims.snu.ac.kr; every Place exists in the seed); `main-server/test/assistant-proposals.integration.test.ts` extended with the scripted model (종합운동장 → its deep link, 301 → the ssims index, 63 → `null`; a Proposal sent back with `booking` is accepted); `mobile/__tests__/chat-proposal-card.integration.test.tsx` (no button before 만들기 or without `booking`; after 만들기 it opens the URL).
- [ ] By hand, in the PR: each athletics deep link opens its facility in a browser.
- [ ] A screenshot of a made card with 시설 예약하기, from the web target, in the PR.
- [ ] No native file changes (CLAUDE.md § The app's native files; `expo-web-browser` is already a dependency).

## Comments
