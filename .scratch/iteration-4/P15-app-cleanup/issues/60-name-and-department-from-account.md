# 60: The name and the department come from the SNU account and cannot be changed

Parent: [P15 spec](../spec.md), item 60; found by a teammate using the Production app on a phone on the night of 2026-11-18, read in the code of `4.0/Main` at `04898aed`; no board on the team canvas: the request names the change in words, and the screens keep their layout
Status: ready-for-agent
Owner: fyoon46
Blocked by: none. No other open pull request adds a database migration.

Native files: none. Releases: the main server (a data migration), then an app OTA update.

## What is on screen now

- Onboarding fills the name and the department in from the SNU account's Google name, which reads `홍길동 / 학생 / 컴퓨터공학부`, with a "Google 계정에서 가져옴" badge. The User can change both. A department that is not in the app's list is left empty for the User to pick.
- 프로필 편집 lets the User change both at any time, and the main server stores whatever is sent.
- The service runs on real names: the search and the Assistant reach a person by name, so a changed name hides them.

## What changes

- **A field the account gives is fixed.** The main server reads the name (first part) and the department (third part) from the Google name, under the profile's limits. Each one it gives is shown in onboarding and in 프로필 편집 as a field that cannot be edited, with a lock, and one grey line under it: "이름과 학과는 SNU 계정에서 가져와요", or "이름은 …" / "학과는 …" when the account gives one of them.
- **A field the account does not give stays the User's.** An account that gives a name but no department (a name without `/`, or a form that differs) asks for the department in onboarding, from the list as before, and keeps it editable in 프로필 편집. The same holds for the name. Since only undergraduates' Google names are confirmed to carry the department, this keeps every other kind of account working.
- **The main server keeps the account's values whatever the app sends.** A name or a department sent for a field the account gives is ignored, not refused: an older bundle that sends them still saves the other fields of its edit, and its onboarding still completes. One the account does not give is still required in onboarding (400 naming the field).
- **A User who already changed theirs** gets the account's back: a data migration sets every onboarded User's name and department from the stored Google name, and every later sign-in of an onboarded User stores them again, so a change of the account's Google name reaches the profile too. Before onboarding both stay empty, as before.
- The profile answer carries `fromAccount: { name, department }`, which says which of the two are fixed.
- With the department fixed, onboarding does not ask the course level (학부생 / 대학원생), which only picks the department list.
- The onboarding head says what is left: "확인하고 바로 시작해요" when the account gives both.

## What stays as it is

- Every other field of 프로필 편집: admission year, hashtags, 학적상 이름, 학번 and 소속. 학적상 이름 is still the name the library knows when it differs.
- The sign-in, the onboarding guard and the suggestion's shape (`{ name, department }`, `null` for a part not given).
- The `@` mention of a Friend in the Assistant's chat, which the same report asks for, belongs to the Assistant's batch.

## Acceptance criteria

- [x] Onboarding shows a name and a department the account gives as fixed fields, with the grey line, and saves with nothing more to fill in.
- [x] Onboarding asks for a department the account does not give, and keeps the account's department even when the list does not hold it.
- [x] 프로필 편집 shows the account's name and department fixed with the grey line, and a save sends neither; the other fields stay editable.
- [x] `POST /users/me/onboarding` and `PATCH /users/me/profile` store the account's name and department over the ones sent, and save the rest.
- [x] Onboarding without a field the account does not give is refused with 400 naming that field.
- [x] A later sign-in of an onboarded User stores the account's name and department again; before onboarding they stay empty.
- [x] The migration replaces an onboarded User's own name and department with the account's, and leaves a part the account does not give as it is.

## Tests

- Main server: `test/onboarding.integration.test.ts` (the account's values kept over an older app's, nothing more needed, a department asked for when the account gives the name alone), `test/profile.integration.test.ts` (an older app's edit keeps the account's values and saves the rest, a later sign-in follows a changed Google name and replaces a name the User chose), and the profile shapes in `test/lobby.integration.test.ts`.
- App: `__tests__/onboarding.integration.test.tsx` (fixed fields and the line for each case), `__tests__/profile-edit.integration.test.tsx` (fixed fields, the line, a save without them), `__tests__/api/answers-users.unit.test.ts` (`fromAccount` parsed), and the mock's edit in `__tests__/api/mock-me.integration.test.ts`.
- The migration's SQL was run on sample rows in a throwaway PostgreSQL 17: a nickname replaced, a name without `/` kept with its typed department, an empty Google name and parts over the limits left alone, spaces around the parts dropped.

## Comments
