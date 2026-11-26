# 16: The dashboard "Beta" in PostHog

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: ready-for-agent
Blocked by: 15

Native files: none. Releases: none.

**The personal API key is a secret.** A person gives it to the agent's shell with `read -rs` into an environment
variable; it never goes into the repository, a ticket, a chat, a command line, a log or a screenshot. It is a
personal API key with Product analytics write and Events read, scoped to the organisation.

## What happens now

- After ticket 15, events arrive in the project from the app and the main server, with the names and properties of
  the spec's table.
- The project has no dashboard.

## What to build

A dashboard "Beta", made through PostHog's API with the personal API key, with six insights. Each insight's main
figure is taken from the side that closes the action, as the spec says.

1. **Daily active Users:** Trends, unique Users of `app_opened` per day.
2. **Retention:** Retention, from `app_opened` back to `app_opened`, showing day 1 and day 7.
3. **The five actions per day:** Trends, per day, of `assistant_reply_completed`, `party_creation_completed`,
   `party_join_completed` and `friendship_creation_completed` with `source = server` (the last halved, since the main
   server sends one for each of the two Users), and `seat_booking_completed` with `source = app`.
4. **Top screens:** `screen_viewed` broken down by `route`, as a table of the last 7 days.
5. **Response rate per action:** for each of the four server actions, two formulas per day: server `_completed` over
   app `_requested` (the request reached the main server and was done), and app `_completed` over server
   `_completed` (the answer reached the phone). For Friends, the server's count is halved and taken only for `how`
   `request_accepted` and `invite_link_accepted`, since the app has no stage for `requests_crossed`.
6. **Failures by reason:** the five `_failed` events and `api_request_failed`, per day, broken down by `reason`.

Each insight's query is kept as a JSON file beside this ticket (`../references/16-*.json`), with no key in it, so that
it can be made again. The way the API is called (the endpoints, and how a query is made) is checked against PostHog's
API reference and written under Comments.

## Must not break

- Nothing in the repository's code; only this ticket's folder gains files.
- The project's other settings, including "Discard client IP data".

## Acceptance criteria

- [ ] The dashboard and its six insights exist, and their links are written under Comments.
- [ ] Each insight shows the beta test's data, and a screenshot of the dashboard is under `../references/`, with no key
      and no User id in it.
- [ ] The queries are in `../references/`, and none holds a key.
- [ ] The key was never written to a file, a command line or a log.

## Comments
