# 01: Profile: 학번, 학적상 이름, 소속

Parent: [P06 spec](../spec.md) ("Profile: 학번, registered name and 소속")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User can enter their 학번, their 학적상 이름 (the name the library knows) and their 소속 (학부, 대학원 or 교환학생) on the 내 정보 edit screen, and sees them again there. Nobody else sees the 학번 or the registered name anywhere: not Friends, not Quests or Parties, not search, not the Assistant. The privacy text says what the new items are for (a group-study-room booking, with consent each time) and that the library session stays on the phone.

This is the base other tickets read: the tutorial's eligibility reads `affiliation = exchange` (ticket 02), the Assistant reads `affiliation = graduate` (ticket 07), and the room request reads the 학번 and registered name (ticket 09). JS only, with no native change.

## Acceptance criteria

- [ ] `User` gains `studentNumber String?`, `registeredName String?` and `affiliation` (`undergraduate | graduate | exchange`, nullable), with a Prisma migration. Existing Users keep working with all three empty.
- [ ] The profile update accepts a 학번 matching `^\d{4}-?\d{5}$` and stores nine digits without a hyphen; anything else is a 400 with a field error. An empty value clears it.
- [ ] An empty registered name is read as `name` wherever the registered name is needed. The stored value stays empty.
- [ ] The User's own profile reply carries the three fields. No other reply carries `studentNumber` or `registeredName`: the Friend list, Friend search, Quest, Party and invitation replies are checked in an integration test that seeds a User with both and asserts neither value appears in those bodies.
- [ ] No log line of the profile endpoints holds the 학번 or the registered name, checked by capturing the logger in an integration test.
- [ ] The 내 정보 edit screen has the three fields (학번 with the format hint, 학적상 이름 with "비워 두면 이름을 써요", 소속 as a three-way choice). It shows the server's error for a bad 학번. Onboarding does not change.
- [ ] The privacy text (`legal-documents.ts`) names 학번, 학적상 이름 and 소속, their one use, consent per booking, and that the library session stays on the phone.
- [ ] Tests, named by ADR 0007:
  - unit: the 학번 format and normalisation (with and without hyphen, wrong lengths, letters);
  - integration (server): saving, clearing and reading the fields; the 400; the absence checks above;
  - integration (app): the edit screen saves the three fields and shows the error, against its mocks (prior art: the `profile-edit` integration test).
- [ ] No native file changes (CLAUDE.md § The app's native files); the app-fingerprint CI job reports no native change.

## Comments

- From ticket 03 (2026-11-02): the profile save in `mobile/src/screens/me/profile-edit-screen.tsx` (`useSave`) now invalidates `TUTORIAL_KEY` after a save, so a changed 소속 or 학번 refreshes the tutorial's `eligibleByDefault`. #162 must keep that invalidation when it reworks the save; the `profile-edit` integration test checks it.
