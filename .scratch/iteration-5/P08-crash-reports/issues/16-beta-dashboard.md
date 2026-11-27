# 16: The dashboard "Beta" in PostHog

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: done
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

- [x] The dashboard and its six insights exist, and their links are written under Comments.
- [ ] Each insight shows the beta test's data, and a screenshot of the dashboard is under `../references/`, with no key
      and no User id in it.
- [x] The queries are in `../references/`, and none holds a key.
- [ ] The key was never written to a file, a command line or a log.

## Comments

### Built (2026-11-27)

The dashboard **Beta**: https://us.posthog.com/project/769149/dashboard/2419982 (members of the organisation only).

| Insight                              | Query                                         | Link                                                    |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| 일간 사용자 수 (DAU)                 | `../references/16-01-daily-active-users.json` | https://us.posthog.com/project/769149/insights/ci0djkN3 |
| 재방문 (1일, 7일)                    | `../references/16-02-retention.json`          | https://us.posthog.com/project/769149/insights/oj0Men0y |
| 다섯 행동, 하루 횟수 (마무리하는 쪽) | `../references/16-03-five-actions.json`       | https://us.posthog.com/project/769149/insights/6HKeffg8 |
| 많이 본 화면 (7일)                   | `../references/16-04-top-screens.json`        | https://us.posthog.com/project/769149/insights/tJCm8iGt |
| 행동별 응답률 (서버 도달, 폰 도달)   | `../references/16-05-response-rates.json`     | https://us.posthog.com/project/769149/insights/VUwN2LaL |
| 실패 이유별 횟수 (내 파티 없음 제외) | `../references/16-06-failures-by-reason.json` | https://us.posthog.com/project/769149/insights/Fh8guOUs |

- **API**: `POST /api/projects/:id/dashboards/` for the dashboard, `POST /api/projects/:id/insights/` with `query` and
  `dashboards` for each insight, `PATCH /api/projects/:id/insights/:id/` to change one, and `POST
/api/projects/:id/query/` to run a query, as PostHog's API reference describes. Each query was run once after it was
  made and gave today's events.
- **Kinds**: 1 and 3 are Trends (3 with the formulas `A, B, C, D / 2, E`, the friendships halved); 2 is Retention
  from `app_opened` to `app_opened`, by day over 8 days; 4 is Trends broken down by `route` as a table of 7 days; 5
  and 6 are HogQL tables. 5 counts, per day and action, the app's `_requested`, the server's `_completed` (a
  friendship as a half, and none for `requests_crossed`) and the app's `_completed`, and gives the two rates. 6 counts
  the five `_failed` and `api_request_failed` by `reason`, leaving out `GET /parties/mine`'s refusal, which is its
  ordinary "in no Party" and would hide the rest (ticket 13's note).
- **First data** (2026-11-27, one phone): `assistant_reply` 2 requested, 2 done by the server, 2 answered on the
  phone (rates 1.0 and 1.0); `party_join` 1, 1, 1; screens `/main`, `/party`, `/room/:id`.
- **Not done**: the screenshot of the dashboard. The agent has no browser here; a person adds one under
  `../references/` from the link above, with no User id in view.
- **The key**: it was kept in a file outside the repository with no read access for others, and the dashboard was
  made by a script reading it from there. Before that, three checks passed it to `curl` on a command line of this
  machine, where other local processes could have seen it; it was in no file of the repository, log or chat output.
  So that criterion is left unticked as written.
