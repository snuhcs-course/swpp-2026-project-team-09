# P12: Connect admin event creation and editing

Status: ready-for-agent

## Problem Statement

Events collected from the university site have times and places written as free text. Rules read only some of them, and none come with coordinates. If they went straight to Users, the map would show events at wrong times or without a place. Events that organizers send to the team have no way into the system at all.

## Solution

An admin site where an Administrator reviews each Draft, corrects its time and place, sets its position on the map and publishes it. The Administrator can also create a Global Event by hand and cancel a published one.

## User Stories

1. As an Administrator, I want to sign in with my SNU Google account, so that I need no separate account.
2. As an SNU student who is not an Administrator, I want to be refused by the admin site, so that only the team manages events.
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

## Implementation Decisions

### Admin site

- The admin site is a Next.js project using the App Router, a source folder and Tailwind.
- It has no data of its own. It reads and writes through the main server's administrative API.
- Pages fetch from the main server on the server side and forward the Administrator's token taken from a cookie.
- Sign-in uses Google on the web. The main server verifies the ID token exactly as for the app and issues its tokens.
- Access checks are made where data is read or changed. A check in the request proxy alone is not relied on.
- The position picker shows a Kakao map through Kakao's JavaScript SDK. This is a web page on a registered domain, which is the use that SDK is meant for.

### Administrative API

- The API lives in the main server under its own routes. Every request is checked against the Administrator list from P04.
- Operations: list Drafts and published events, read one, create, edit, publish, cancel, discard a Draft, read the collection status.
- State changes allowed: Draft to published, Draft to discarded, published to cancelled. A published event can be edited without leaving the published state.
- Publishing requires a title, a start time and a position.
- An edit carries the version the Administrator loaded. The main server refuses it when the stored version is newer.
- Publishing, editing and cancelling send a signal as described in P08, and the attending Sub Quests of affected Quests follow as described there.
- Creating a Global Event by hand requires the key described in P04. The admin site makes the key when the Administrator confirms the form and sends the same key on a retry.
- How Global Events are stored and which states exist is defined in P07.

## Testing Decisions

- A good test calls the administrative API as an Administrator or as an ordinary User and checks the response and what Users can then see.
- API tests run with Vitest against a real database: refusal for a User who is not an Administrator, each allowed and each forbidden state change, the publishing requirements, the version check, and that a published event appears in the User-facing list while a Draft does not.
- Admin pages are tested at the page level against a fake API: the Draft list, the edit form's validation messages, the publish button's disabled state.
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
- The admin site's address must be registered at Kakao for the JavaScript key. On a laptop this is the local address.
- Next.js renamed its middleware to proxy in version 16. Examples written for older versions use the old name.
