# 12: Sign-in, loading and the Session

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Design system), 02 (API client and fake API)

## What to build

A User opens the app, signs in, waits on the loading screen and arrives at the map; opens it again and arrives without signing in; and signs out. In Expo Go the sign-in is a fake one, so that every screen behind it can be seen; ticket 14 connects Google in a built app.

Sign-in lives behind one module with two operations, sign in and sign out. The screens are the frames `Login`, `LoginLoading`, `LoginError` and `Splash`. The main server's side exists (P04): its README records the sign-in, the refresh, the sign-out, the Lobby and their answers.

## Acceptance criteria

- [ ] A User who is not signed in sees only the sign-in screen. The screen has the frame's default, checking and refused states.
- [ ] Each ending of a sign-in shows what the spec's table says: tokens lead on, a 403 shows the refused state for an account outside SNU, a closed sheet returns to the default state, and any other failure shows the refused state with "잠시 후 다시 시도해 주세요".
- [ ] Each of the three legal documents opens on a screen of its own with a placeholder text and closes back to the sign-in screen.
- [ ] Tokens are kept in the phone's secure storage. An app started with stored tokens goes to the loading screen without the sign-in screen.
- [ ] The loading screen is the frame's: its bar fills while the Lobby is fetched, it stays for at least 0.5 seconds, and it leads to the main screen. When the Lobby cannot be fetched it says "불러오지 못했어요" and offers "다시 시도".
- [ ] A User who has not finished Onboarding is led to the Onboarding screen, by the sign-in's answer or by a 403 with `ONBOARDING_REQUIRED`. Until ticket 13 that screen is a placeholder.
- [ ] A replaced Session shows the dialog with the spec's words and then the sign-in screen.
- [ ] Sign-out ends the Session on the server, stops what the app sends, and clears the tokens, the fetched data and what the fakes stored. A sign-out that the server answers with 401, or does not answer, still signs the phone out.
- [ ] The sign-in module has a fake implementation, used in a build without the native modules: it signs in after a short wait, and a development setting makes it end in each of the other ways.
- [ ] Jest tests: each ending of a sign-in, the legal screens, a start with stored tokens, the loading screen's shortest time and its failure, the way to Onboarding, the replaced Session and sign-out.
