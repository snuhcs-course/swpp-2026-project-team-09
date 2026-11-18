# 10: An Invite Link reaches its accept screen from a stopped app and from a browser

Parent: [P15 spec](../spec.md), item 10; the cold start was found by P11-03's device run on 2026-10-23 and is the ticket [`fix-invite-link-cold-start`](../../../iteration-2/fix-invite-link-cold-start/issues/01-invite-link-on-a-cold-start.md), which this ticket takes over; the browser's answer was read on Production on 2026-11-18; no board on the team canvas, since no screen of the app changes and the page's words are in this ticket (decided by 김태현 on 2026-11-18)
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none
Release: the page needs a Release of the main server, and the app's part ships over the air. No native file changes and no database migration. Merging, tagging and releasing are 김태현's and are not part of this ticket

## What happens now

- **Sending works.** 친구 추가's "초대 링크 보내기" makes an Invite Link, `https://api.snunow.com/invite/<token>`, and opens the share sheet. The link lasts 24 hours and is used once.
- **Android, the app running:** the link opens the app at the accept screen, "…님의 친구 초대", with 수락 and 거절.
- **Android, the app stopped:** the link starts the app, the loading screen passes, and the map shows. The accept screen never shows, and the token is not kept, so a relaunch shows the map too. P11-03's device run showed this each time.
- **A User who is signed out** when the link starts the app goes the same way through the code. This was not run.
- **In a browser** the link's address answers 404 with the server's JSON, `Cannot GET /invite/…`. That is what these people see:
  - someone whose messenger opens links in its own browser;
  - someone on an iPhone, whose build declares no link that opens the app;
  - someone without the app.
- `mobile/README.md` says the main server has a page there that opens `snunow://invite/<token>`. It does not.

## The cold start's cause

Read on 2026-10-24 with a Jest model of the start, not on a device. It is to be confirmed in the code, not reproduced on a device first (decided by 김태현 on 2026-11-18).

- On Android the router gets the address the app was started with as a promise, later than its first render. On iOS and in the existing Jest tests it has it at once, which is why those pass.
- So the signed-in place's guard, which keeps an Invite Link's token before it leads a User away, renders first with no address. It sees no Invite Link and keeps nothing.
- The guard then leads to the start of the app, and the address is gone.
- The earlier ticket guessed at a 150 ms race in the router. The model showed the same symptom whether that race is won or lost.
- A fix that passed the model: the router's own hook for an address the system starts the app with keeps the token on the phone before the router starts, and gives the address back unchanged. The guard's other half, which opens the accept screen of a kept token once the User is in the signed-in place, then shows it. Giving back another address from that hook did not work in the model. The implementation checks this against the installed router's code and may fix it another way if the code says otherwise; it says so under Comments.

## What changes

**In the app**

- A stopped app started by an Invite Link shows the link's accept screen after the loading screen, for a signed-in User.
- For a User who is signed out, or who has not finished the consent or Onboarding, the accept screen shows once they have.
- This holds for both forms of the link: the https address, which Android opens through App Links, and `snunow://invite/<token>`.

**On the main server**

- `GET /invite/<token>` answers a page, without a sign-in, in place of the 404.
- The page shows the app's wordmark, the title "SNU Now 친구 초대", one button "SNU Now에서 열기", and under it the line "앱이 설치돼 있어야 열려요."
- The button opens `snunow://invite/<token>`. The page does not try to open the app by itself: a browser often blocks that without a press.
- The page does not look the token up. It shows no sender and no status; the app's accept screen does. A token nobody made, a used one and an expired one get the same page.
- The token goes into the page only when it has an Invite Link token's form. For any other, the page says "찾을 수 없는 초대 링크예요" and has no button.
- The page has no link to an APK.
- The page loads nothing from another host, reads well on a phone's width, and asks search engines not to index it.

## What stays as it is

- Making a link, its 24 hours and its one use; the accept screen and its words; the link opened while the app runs.
- Android's App Links: the build's declaration and the server's `assetlinks.json`. A phone that verified the link still opens the app at once, without the page.
- The API's `/invite-links` routes, which still need a sign-in.
- iOS gets no link that opens the app directly. That needs the Associated Domains entitlement, which the free team that signs the iOS build cannot sign. An iPhone goes through the page's button. No iOS build is made or checked for this ticket.
- A tapped push, which is opened by the same place of the app after the same wait.

## Acceptance criteria

- [ ] A signed-in User's stopped app, started by an Invite Link, shows that link's accept screen after the loading screen, and 수락 makes the two Friends.
- [ ] A signed-out User's stopped app, started by an Invite Link, shows the accept screen after the sign-in, and after the consent and Onboarding where they are still owed.
- [ ] The kept token is dropped once its accept screen has shown: a later plain start of the app shows the map.
- [ ] A link opened while the app runs, and a tapped push at a cold start, do what they do today.
- [ ] `GET /invite/<token>` with a well-formed token, without a sign-in, answers 200 with a page that has the words above and a button to `snunow://invite/<token>`.
- [ ] With a token of any other form it answers a page with "찾을 수 없는 초대 링크예요" and no button, and nothing of the address appears in the page unescaped.
- [ ] The page is the same for a token nobody made, a used one and an expired one, and names no sender.
- [ ] `/.well-known/assetlinks.json` and the `/invite-links` routes answer as before.
- [ ] Tests, by ADR 0007:
  - a test of the app that takes Android's way of getting the first address fails before the fix and passes after it, for a signed-in and for a signed-out start;
  - the main server's integration test asks for the page with a well-formed token, a malformed one, and one that tries to carry markup;
  - the existing tests of Invite Links and of a tapped push still pass.
- [ ] After the fix, the device run's M2 on a cold start passes on the emulator, and M1 and M2 on a warm start still pass. This is the check on a device; the bug is not reproduced on one before the fix. The run is recorded under this ticket's Comments.
- [ ] `mobile/README.md` no longer says that M2 on a cold start fails, and what it and the main server's README say of the page is true of the code.
- [ ] The earlier ticket gets a comment that says this ticket fixed it, with the cause as it was confirmed.
