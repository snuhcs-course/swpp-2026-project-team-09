# 01: Profile: 학번, 학적상 이름, 소속

Parent: [P06 spec](../spec.md) ("Profile: 학번, registered name and 소속")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User can enter their 학번, their 학적상 이름 (the name the library knows) and their 소속 (학부, 대학원 or 교환학생) on the 내 정보 edit screen, and sees them again there. Nobody else sees the 학번 or the registered name anywhere: not Friends, not Quests or Parties, not search, not the Assistant. The privacy text says what the new items are for (a group-study-room booking, with consent each time) and that the library session stays on the phone.

This is the base other tickets read: the tutorial's eligibility reads `affiliation = exchange` (ticket 02), the Assistant reads `affiliation = graduate` (ticket 07), and the room request reads the 학번 and registered name (ticket 09). JS only, with no native change.

## Acceptance criteria

- [x] `User` gains `studentNumber String?`, `registeredName String?` and `affiliation` (`undergraduate | graduate | exchange`, nullable), with a Prisma migration. Existing Users keep working with all three empty.
- [x] The profile update accepts a 학번 matching `^\d{4}-?\d{5}$` and stores nine digits without a hyphen; anything else is a 400 with a field error. An empty value clears it.
- [x] An empty registered name is read as `name` wherever the registered name is needed. The stored value stays empty.
- [x] The User's own profile reply carries the three fields. No other reply carries `studentNumber` or `registeredName`: the Friend list, Friend search, Quest, Party and invitation replies are checked in an integration test that seeds a User with both and asserts neither value appears in those bodies.
- [x] No log line of the profile endpoints holds the 학번 or the registered name, checked by capturing the logger in an integration test.
- [x] The 내 정보 edit screen has the three fields (학번 with the format hint, 학적상 이름 with "비워 두면 이름을 써요", 소속 as a three-way choice). It shows the server's error for a bad 학번. Onboarding does not change.
- [x] The privacy text (`legal-documents.ts`) names 학번, 학적상 이름 and 소속, their one use, consent per booking, and that the library session stays on the phone.
- [x] Tests, named by ADR 0007:
  - unit: the 학번 format and normalisation (with and without hyphen, wrong lengths, letters);
  - integration (server): saving, clearing and reading the fields; the 400; the absence checks above;
  - integration (app): the edit screen saves the three fields and shows the error, against its mocks (prior art: the `profile-edit` integration test).
- [ ] No native file changes (CLAUDE.md § The app's native files); the app-fingerprint CI job reports no native change. (No native file or dependency changed; the CI job has not run yet.)

## Comments

### Implementation notes (2026-11-01)

- Server: `users` gains `student_number`, `registered_name` and `affiliation` (migration `20261101235429_add_student_number_registered_name_affiliation`, with checks that a stored 학번 is nine digits and a registered name is not empty). `PATCH /users/me/profile` takes the three fields; an empty text or `null` clears the 학번 and the registered name. Onboarding's schema leaves them out. `registeredNameOf` in `src/users/dto/profile.dto.ts` gives the name when the registered name is empty, for ticket 09.
- The Lobby's `profile` is the same reply as `GET /users/me/profile`, so it carries the three fields too. It is the User's own.
- App: 프로필 편집 gains a 도서관 예약 정보 card (학번, 학적상 이름, 소속 as 학부/대학원/교환학생). The wireframe has no frame for it yet, so it follows the screen's other cards. The 학번 field's screen-reader label is "도서관 예약 학번", so it does not clash with the admission-year field, also labelled 학번. A 400 that names `studentNumber` marks the field; other failures keep the toast. Once a 소속 is chosen, the screen cannot clear it (the server can, with `null`).
- The privacy text says 소속 also picks the tutorial and the 열람실 offered (tickets 02 and 07), not only the booking, since that is what it is used for. The other two documents are still placeholders.
- The app's profile guard now requires the three fields. If an app update reaches phones before the server with this migration is deployed, the Lobby would be refused, so the server should go out first.

### Agent usage (2026-11-01)

- Agent time: about 1 hour 30 minutes (estimate), one session, no subagents.
- Tokens: not measured in the session. Estimated at about 4.5M input, mostly cache reads (about 4.3M) with about 200k cache writes, and about 60k output.

### From ticket 03 (2026-11-02)

- The profile save in `mobile/src/screens/me/profile-edit-screen.tsx` (`useSave`) invalidates `TUTORIAL_KEY` after a save, so a changed 소속 or 학번 refreshes the tutorial's `eligibleByDefault`. The `profile-edit` integration test checks it.
