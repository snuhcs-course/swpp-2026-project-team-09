# 07: The dev APK

Parent: [P04-05 spec](../spec.md)
Status: ready-for-human
Owner: 김태현
Blocked by: 06

Starts after the pull request is merged into `development` and ticket 06 is done. Outside the scope of agent implementation.

## What to do

Set the app's main-server and socket-server addresses to the Dev Server's, build the release APK the way the iteration-1 demo APK was built, name it `snu-now-dev-YYYY-MM-DD.apk`, copy it into the APK folder on the server with `scp`, and install it on a phone from `/apk/` in the phone's browser.

## Acceptance criteria

- [ ] `/apk/` lists the file from a phone, and the phone installs it from there.
- [ ] The installed app signs in with Google against the Dev Server and shows the Lobby.
- [ ] The runbook's "adding an APK" section matched what was done, or was corrected.
- [ ] The time it took is recorded under `## Comments`.
