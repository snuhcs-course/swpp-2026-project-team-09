# 06: The HE data on swpp-a, checked end to end

Parent: [P15 spec](../spec.md) ("The HE seed", "Testing Decisions": the manual end to end)
Status: done
Blocked by: 03, 04, 05

## What to build

swpp-a holds the HE data, and the HE APK is checked against it on the emulator, as an evaluator would use it. The Mac doing this must be on the SNU network.

## Steps that wait for the PM's word

1. **Push:** pushing the commits with the seed. The deploy timer redeploys once CI passes.
2. **Seed:** running `he-seed` on swpp-a.

## Acceptance criteria

- [x] **Seed on swpp-a:** swpp-a runs a commit that holds 03. `he-seed` reports what it created, and a second run creates nothing.
- [x] **First run:** with the HE APK on the emulator against swpp-a, a round account signs in, passes consent and Onboarding with its persona suggested, and reaches the map.
- [x] **Friend Request:** one is sent between the two accounts of a round, with the other side played through the API with its key. It is accepted and shows in both friend lists.
- [x] **Joining:** an Open recruiting Quest is joined from the 파티 tab.
- [x] **Assistant:**
  - Asked through the API with the account's token, it answers who can have dinner on Wednesday 11-04 with the Friends the spec expects. The API is used because adb types no Korean.
  - In the app, an example request of the empty chat is answered with its cards.
- [x] **Socket:** the socket connection stays up for over five minutes.
- [x] **Campus data:** menus, events and the shuttle show in the app.
- [x] **Record:** the ticket's Comments record each check's result and anything not checked.

## Comments

- **Done on the PM's word (2026-11-03).**
  - **Push:** the PM let the branch be pushed without asking. `d0a4ed5`, with ticket 03, was deployed at 17:36.
  - **Seed:** `he-seed` failed once at 17:38 on `users_google_subject_key`. Before the seed, someone had signed in with the keys `he-s1` and `he-s2`, which made two Users with no name. Nothing was written, since the seed is one transaction. On the PM's word those two Users went, with their Sessions and refresh tokens. The seed then wrote 7 Users, 8 friendships, 29 Classes and 8 recruiting Quests, and a second run wrote nothing. A sign-in by key before the seed always breaks it this way.
- **The checks used the spares, on the PM's word (2026-11-03).** A round account that finished Onboarding, or a round pair that became Friends, would no longer start the HE at its first run, and the seed never overwrites. So the PM chose to run the checks with 이도현 (`he-s1`) on the emulator and 박서진 (`he-s2`) over HTTP, and to put both back afterwards. The round accounts and 오세린 were never signed in.
  - **First run:** pass. The list gave consent, then Onboarding with 이도현 / 경영학과 suggested, then the location explanation and the map. Consent showed only after one sign-out, because the emulator kept it from an older SNU Now install. The APK replaces an install and keeps its data, so each phone needs SNU Now removed before the HE APK goes on.
  - **Friend Request:** pass. 박서진 sent it by HTTP to `HESA2345`, and 이도현 accepted it in the app under 내 정보 → 알림. Both friend lists then show each other.
  - **Joining:** pass. #8 면접 스터디 was joined from 파티 → 전체 보기 → 진로 게시판, and it shows 멤버 2명.
  - **Assistant:** pass.
    - Over the API with `he-s1`'s token, asked who can have dinner on Wednesday 11-04: 정민재 can, both free 17:00–18:00, and 박서진 is not offered, as the spec's Timetables give.
    - As 박서진, it answered that his own dinner time is not free, because of the lab from 17:00 to 19:50.
    - In the app, the example 파티 찾기 was answered with 3 Quest cards.
  - **Socket:** pass. The app's connection to socket-server stayed established from 17:56:51 to past 18:03:15, over six minutes. A sign-in by HTTP then showed 「다른 기기에서 로그인했어요」 within 4 s, an event that comes over the socket. A Mac client's WebSocket also held 330 s on one socket id.
  - **Campus data:** pass. 행사 lists the events, the map shows the shuttle route, its vehicles and the restaurant pins, and 메뉴 shows 11-03's menus.
  - **Put back:** in one transaction, the two spares' Sessions, refresh tokens, friendships, holders, Classes and Users went, with their four Quests (#2, #6, #7, #8). The SQL refuses if anyone else holds, asks to join or is invited to those Quests. A rolled-back run checked it first. `he-seed` then wrote 2 Users, 4 friendships, 8 Classes and 4 Quests, and a second run wrote nothing. Afterwards all seven accounts match the snapshot taken right after the first seed, and none has finished Onboarding.
- **Found in the checks (2026-11-03), not fixed on the HE branch.**
  - **Location Accuracy loop:** on a phone with Google Location Accuracy off, Google's dialog opens on the map. No thanks or Back closes it, the app comes back to the front, `watchPositionAsync` starts again, and the dialog opens again. Every close sent a new `CHECK_SETTINGS` in logcat. The cause is expo-location's default `mayShowUserSettingsDialog: true` in `mobile/src/position/`, code from 3.0/Main, not the HE branch. Fixing it was left out because it is outside the spec and the APK was already built. The PM turns on location and Google Location Accuracy on both phones before the HE, and the dialog then never opens. The fix belongs to Iteration 4.
  - **Seeded post times:** today the seeded Quests show 「11/04 08:52」 and 「방금」 for their post time. They read right on 11-04.
- **Not checked:** the app's socket connection under a round account, and the time-bound effects at 2026-11-04 15:30, which the seed's integration test checks with the clock fixed.
