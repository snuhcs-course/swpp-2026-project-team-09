# P12: Connect admin event creation and editing

Status: ready-for-agent

## Problem Statement

Events collected from the university site have times and places written as free text. Rules read only some of them, and none come with coordinates. If they went straight to Users, the map would show events at wrong times or without a place. Events that organizers send to the team have no way into the system at all.

## Solution

An admin site where an Administrator reviews each Draft, corrects its time and place, sets its position on the map and publishes it. The Administrator can also create a Global Event by hand and cancel a published one.

## User Stories

1. As an Administrator, I want to sign in with my Google account, so that I need no separate password.
2. As a person who is not a registered Administrator, I want to be refused by the admin site, so that only the team manages events.
3. As an Administrator, I want a list of Drafts ordered by start time, so that I handle the nearest events first.
4. As an Administrator, I want to see which Drafts could not be read fully, so that I know where work is needed.
5. As an Administrator, I want to open a Draft and see its source link and original text, so that I can check it against the original.
6. As an Administrator, I want to edit the title, description, start time, end time and place name, so that the event is correct.
7. As an Administrator, I want to choose the place from the building list, so that the event gets coordinates without typing them.
8. As an Administrator, I want to set the place by pointing on a map, so that events outside listed buildings can be placed.
9. As an Administrator, I want publishing to be refused until the event has a title, a start time and a position, so that incomplete events never reach Users.
10. As an Administrator, I want to publish a Draft, so that Users see it on their map.
11. As an Administrator, I want to create a Global Event by hand, so that organizers' submissions can be entered.
12. As an Administrator, I want to edit a published Global Event, so that a changed time or place reaches Users.
13. As an Administrator, I want to cancel a published Global Event, so that Users are not sent to an event that will not happen.
14. As an Administrator, I want to discard a Draft that is not an event, so that the list stays clean.
15. As an Administrator, I want to be warned when someone else changed the event while I was editing, so that I do not overwrite their work.
16. As an Administrator, I want to see when each source was last collected and whether it failed, so that I notice a broken source.
17. As an SNU student, I want a published or changed Global Event to appear on my map without restarting the app, so that the map is current.
18. As a Holder of a Quest for a Global Event, I want my Quest to follow the Administrator's changes, so that my plan is correct.
19. As an Administrator, I want to register and remove Administrators, so that the team changes without a change to the server's settings.
20. As an Administrator, I want to sign out from any page, so that nobody else uses my session on a shared computer.

## Implementation Decisions

### Admin site

- The admin site is a Next.js project using the App Router, a source folder and Tailwind.
- It has no data of its own. It reads and writes through the main server's administrative API.
- Pages fetch from the main server on the server side and forward the Administrator's token taken from a cookie.
- Sign-in uses Sign in with Google on the web, with the admin site's own Google client, and Google's automatic sign-in stays off. The main server verifies the ID token on the Administrator's sign-in route (P04) and issues an Administrator's access token, valid for 8 hours and without a refresh token. An Administrator is not a User and appears nowhere in the app.
- One cookie holds the token. It is named with the `__Host-` prefix and is `HttpOnly`, `Secure`, `SameSite=Lax` and `Path=/`, without `Domain` or an expiry. The token is never passed to Client Components.
- Every change goes through a Server Action. No Route Handler changes data.
- A 401 from the main server sends the person to sign-in and then back to the same page. It comes when the token expired, when the Administrator signed out in another browser, or when they were removed.
- Every page has a sign-out control. It ends every token of that Administrator on the main server, in every browser, and then deletes the cookie.
- There is no idle timeout. Signing in again takes one click while the person's Google session lasts, so an idle timeout would prove nobody's presence and would not limit a stolen token.
- An Administrators screen lists the Administrators, with each one's email address and whether they have signed in yet. On it an Administrator registers an email address of any Google domain and removes an Administrator, themselves included. The main server keeps the last one.
- Access checks are made where data is read or changed. A check in the request proxy alone is not relied on.
- The position picker shows a Kakao map through Kakao's JavaScript SDK. This is a web page on a registered domain, which is the use that SDK is meant for.

### Administrative API

- The API lives in the main server under its own routes, below `/admin`. Every request needs an Administrator's access token and checks the Administrator, as P04 sets up; a User's access token is refused.
- Operations: list Drafts and published events, read one, create, edit, publish, cancel, discard a Draft, read the collection status.
- State changes allowed: Draft to published, Draft to discarded, published to cancelled. A published event can be edited without leaving the published state.
- Publishing requires a title, a start time and a position.
- An edit carries the version the Administrator loaded. The main server refuses it when the stored version is newer.
- Publishing, editing and cancelling send a signal as described in P08, and the attending Sub Quests of affected Quests follow as described there.
- Creating a Global Event by hand requires the key described in P04. The admin site makes the key when the Administrator confirms the form and sends the same key on a retry.
- How Global Events are stored and which states exist is defined in P07.

## Testing Decisions

- A good test calls the administrative API as an Administrator, or with a User's access token to see it refused, and checks the response and what Users can then see.
- API tests run with Vitest against a real database: refusal of a User's access token, each allowed and each forbidden state change, the publishing requirements, the version check, and that a published event appears in the User-facing list while a Draft does not.
- Admin pages are tested at the page level against a fake API: the Draft list, the edit form's validation messages, the publish button's disabled state and the Administrators screen.
- The session is tested at the page level as well: the cookie's attributes, the token absent from what reaches the browser, a 401 leading to sign-in and back to the same page, sign-out, and a Server Action posted from another origin refused.
- The map picker is checked by hand.
- Prior art: the API-level tests of P04 and P07.

## Out of Scope

- Accounts for organizers. Only the team's Administrators use the site.
- Reading a poster into an event.
- Codes for check-in, rewards and participation counts.
- Starting a collection by hand.
- Managing Users, Parties or Quests from the admin site.

## Further Notes

- The schedule names 함재현 as the worker. The task was written as screen work. The administrative API was added here because the restart left it without a task; a backend member opens that pull request first.
- The admin site's address must be registered at Kakao for the JavaScript key, and among the JavaScript origins of the admin site's Google client. On a laptop this is the local address.
- Next.js renamed its middleware to proxy in version 16. Examples written for older versions use the old name.
