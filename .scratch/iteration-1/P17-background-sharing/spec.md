# P17: Verify background sharing on one device

Status: ready-for-human

## Problem Statement

While the app is open, a User's position is sent every few seconds. A User walking to meet someone puts the phone in a pocket. If sharing stops when the screen goes dark, companions see an Avatar frozen at the place where the phone was locked. Android restricts what an app may do in the background, and the earlier prototype never confirmed this on a real phone.

## Solution

The app keeps sending the User's position while it is in the background, under a visible notification, and stops the moment the User turns sharing off. One team member verifies this on a physical phone by walking with the screen off and records what worked and what did not.

## User Stories

1. As an SNU student, I want my position to keep updating while my phone is in my pocket, so that my companions can find me.
2. As an SNU student, I want a permanent notification while my position is shared in the background, so that I always know it is happening.
3. As an SNU student, I want an explanation before the background location prompt, so that I understand why "allow all the time" is asked.
4. As an SNU student who allowed location only while using the app, I want sharing to work while the app is open, so that refusing the background permission does not break the app.
5. As an SNU student, I want background sharing to stop at once when I turn the Master Switch off, so that the switch means what it says.
6. As an SNU student, I want background sharing to stop when I sign out, so that nothing is sent after I leave.
7. As an SNU student, I want the app to send less often in the background, so that my battery lasts.
8. As an SNU student, I want sharing to continue after my session was renewed in the background, so that it does not stop after an hour.
9. As an SNU student who closed the app by swiping it away, I want to know that sharing has stopped, so that I am not mistaken about being visible.
10. As a viewer, I want a companion's Avatar to keep moving while their phone is locked, so that I can find them.
11. As the project manager, I want a written record of the verification, so that the design page of the Wiki can state what worked and what did not.
12. As an SNU student, I want background sharing on my old phone to stop when I sign in on another phone, so that my Avatar follows one phone.

## Implementation Decisions

- Background sending builds on the sending of P19, which uploads the position every 5 seconds while the Master Switch is on and the app is in front. It uses the same upload and follows the same answers from the server.
- Background sending uses the location and task modules that Expo provides, with a foreground service. It requires a development build.
- The app asks for the foreground permission first and for the background permission only when the User turns on background sharing.
- The interval is 30 seconds in the background against 5 seconds while the app is open.
- The background task reads the Master Switch before every upload and sends nothing when it is off.
- The background task renews the session by itself when the access token has expired.
- A User has one session (P04). When the server refuses the task with the code for a session replaced by a sign-in on another phone, the task stops as on sign-out and does not renew the session.
- The server address must be https. Android blocks plain connections, and the tunnel provides https.
- When Android ends the task because the User closed the app, nothing restarts it. The next time the app opens, it tells the User that background sharing had stopped.
- Verification runs on one physical phone with a second account watching on another phone or an emulator.

### Verification list

| Step | Expected |
|---|---|
| Turn sharing on, lock the screen, walk for 10 minutes | The watcher sees the Avatar move throughout |
| Switch to another app for 10 minutes | The Avatar keeps moving |
| Turn the Master Switch off from the notification or the app | The Avatar disappears from the watcher's map at once |
| Leave the phone locked for more than 1 hour, then walk | The Avatar moves; the session was renewed |
| Close the app by swiping it away | Sharing stops; the app says so when opened again |
| Sign in with the same account on another phone or an emulator | The first phone stops sharing and shows the sign-in screen with the reason |
| Refuse the background permission | Sharing works while the app is open only |
| Walk out of the Campus Boundary | The Avatar disappears; it returns on coming back |

## Testing Decisions

- The behaviour depends on the phone's operating system, so the main check is the verification list above, done by a person.
- The decision logic of the background task, whether to send and whether to renew the session, is kept free of device calls and tested with Jest.
- For each step the record states the phone model, the Android version, the result, and a screenshot or a short recording.
- Prior art: the location tests of P08 on the server side.

## Out of Scope

- Battery measurements. The schedule places them in Iteration 5.
- Verification on several phone models.
- Restarting sharing after the phone restarts.
- Publishing to the Play Store and its review of background location.
- iOS.

## Further Notes

- The schedule names 안진영 as the worker. The task is a test task; the background sending itself is built here as well, because no other task contains it.
- An agent can write the code. The verification needs a person with a phone on campus, which is why the status is ready-for-human.
- Phone makers differ in how aggressively they stop background work. One phone passing does not prove all phones pass.
- This task depends on P06, on P08, and on the Master Switch and the sending while the app is open of P19.
