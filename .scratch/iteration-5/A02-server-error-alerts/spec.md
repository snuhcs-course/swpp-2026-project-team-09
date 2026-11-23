# A02: The main server's warnings and errors are posted to Slack

Status: ready-for-agent

## Problem Statement

Nobody learns that a server failed until someone runs `kubectl logs`. A Release or a restart replaces the pods, and their logs go with them (infra README: "Logs last as long as their pod"). The servers print plain text through NestJS's default logger, so no tool can pick the warnings and errors out of the rest: the main and socket servers alone print about 10,000 info lines every two hours. Nothing tells the team that a failure happened. There is also no way to check such a tool short of breaking something on purpose.

The plan was agreed with its author on 2026-11-23 (`server-logging-guide.ko (1).pdf`, outside the repository). Its first draft put Fluent Bit in `snunow`, whose Pod Security baseline forbids the hostPath volume Fluent Bit reads the logs through. The agreed version has Terraform install it in a namespace of its own. This spec follows the agreed version, with the corrections found when it was checked against the repository, the Fluent Bit Helm chart and Fluent Bit's source.

## Solution

- In Production the main server prints each log entry as one JSON line with a `level` and a `message`.
- Fluent Bit runs on each node, in a `logging` namespace that Terraform makes. It reads the main server's container logs, keeps warn, error and fatal, and posts them to the private Slack channel `#team9-main-server-error`, at most 10 posts a minute.
- An Administrator checks the whole path from the admin site's Log test page. Its info, warn and error buttons each write one test line in the main server; the warn and error lines appear in the channel and the info line does not.
- The socket and worker servers already have channels of their own. This spec does not connect them, but every piece is shaped so that adding one takes a setting, a few blocks of Fluent Bit configuration, one Secret key and one environment variable ([Adding the worker or socket server](#adding-the-worker-or-socket-server)).

The work lands as two pull requests to `5.0/Main`, and each is harmless alone:

- **PR A**: the JSON log format, the logging rules, the test API and the Log test page. Without Fluent Bit, JSON lines change only how `kubectl logs` looks.
- **PR B**: Fluent Bit's pipeline, its test and the Terraform. While the logs are text, Fluent Bit finds no `level` and posts nothing.

| # | Ticket | PR | Status | Blocked by |
| --- | --- | --- | --- | --- |
| 01 | [In Production the main server prints one JSON line per log entry](issues/01-main-server-json-logs.md) | A | ready-for-agent | None |
| 02 | [An Administrator writes a test log line from the admin site's Log test page](issues/02-log-test-page.md) | A | ready-for-agent | None |
| 03 | [Fluent Bit's pipeline keeps only the main server's warnings and errors, and a test in CI shows it](issues/03-fluent-bit-pipeline.md) | B | ready-for-agent | None |
| 04 | [Terraform installs Fluent Bit in a `logging` namespace, and the infra README says where warnings go](issues/04-terraform-fluent-bit.md) | B | ready-for-agent | 03 |
| 05 | [The Slack app and the webhook for #team9-main-server-error](issues/05-slack-webhook.md) | | ready-for-human | None |
| 06 | [The pipeline runs once locally against the real webhook](issues/06-pipeline-against-slack.md) | | ready-for-human | 03, 05 |
| 07 | [The team hears about the Production changes before they are made](issues/07-tell-the-team.md) | | ready-for-human | 01, 02, 03, 04 |
| 08 | [PR A is merged, and the main server and admin site are Released](issues/08-merge-pr-a-and-release.md) | A | ready-for-human | 01, 02, 07 |
| 09 | [The account's owner plans and applies PR B's Terraform, in order](issues/09-plan-and-apply.md) | B | ready-for-human | 04, 05, 06, 07 |
| 10 | [Warnings and errors from Production reach #team9-main-server-error](issues/10-production-check.md) | | ready-for-human | 08, 09 |

## User Stories

1. As a team member, I want the main server's warnings and errors posted to a Slack channel as they happen, so that I learn about a failure without running kubectl.
2. As a team member, I want each post to name the server, the level, the class that logged it and what failed, so that the channel alone tells me whether to look now.
3. As a team member, I want an error's stack in the post when the logger was given one, so that I can find the line that failed.
4. As a team member, I want info lines kept out of Slack, so that the channel shows only what needs a person.
5. As a team member, I want a burst of errors to give at most 10 posts a minute, so that a failing loop neither buries the channel nor runs into Slack's rate limit.
6. As a team member, I want an unhandled 500 to reach the channel through NestJS's own exception log, so that failures no handler caught are not missed.
7. As a team member, I want the error of a start refused for bad settings to be a JSON line too, so that a broken Release reaches the channel before the server ever listens.
8. As a team member, I want the posts in a private channel, so that the servers' log text stays within the team.
9. As a team member, I want no log to hold tokens, keys, passwords, names, emails, student IDs, phone numbers, coordinates, timetables or the Assistant's prompts and answers, so that posting logs to Slack exposes nothing private.
10. As an Administrator, I want a Log test page with info, warn and error buttons, so that I can check that warnings and errors reach Slack without breaking anything.
11. As an Administrator, I want the page to say, after a press, that the line was sent and where each level goes, so that I know what to look for in the channel.
12. As an Administrator, I want the test line to say that it is a test from the admin site and which Administrator sent it, so that nobody takes it for a real failure.
13. As an Administrator, I want a refused press to show the main server's reason on the page, as the other admin pages do.
14. As the team, I want only Administrators able to write test lines, so that nobody outside can flood the channel.
15. As a developer, I want local runs and tests to keep NestJS's coloured text logs, so that nothing changes in day-to-day work.
16. As a developer, I want `LOG_FORMAT` checked like every other setting, so that a typo refuses the start instead of quietly printing text.
17. As a developer, I want written logging rules (which level when, what is never logged, one summary line instead of one per item, the sentence style), so that new logs reach the channel for the right reasons.
18. As a developer, I want the tests that read log lines to pass unchanged, so that the format change does not show in them.
19. As a developer changing Fluent Bit's pipeline, I want a test that runs the real Fluent Bit on sample container log lines, so that I know which lines would be posted before anything reaches Production.
20. As a developer, I want that test to run in CI whenever the pipeline or the Terraform changes, so that a broken filter is caught in review.
21. As a reviewer, I want `terraform plan`'s output in the pull request, showing one namespace and one Helm release added and nothing else changed, so that I can approve an infrastructure change I cannot apply myself.
22. As the account's owner, I want the first apply's order written down (namespace, Secret, the rest), so that the apply does not fail on a missing Secret.
23. As the account's owner, I want the webhook URL kept out of Terraform's state, the repository, chat, pull requests and issues, so that a leak of any of them does not leak the channel.
24. As the team, I want `snunow`'s Pod Security baseline, its NetworkPolicies and the Release workflow's rights unchanged, so that collecting logs opens no path from a pushed tag to the nodes.
25. As the team, I want Fluent Bit to take little memory and no Kubernetes API access, so that it fits on the two small nodes and holds no credentials.
26. As a team member, I want to replace a leaked webhook without a Release, so that the old URL stops working quickly.
27. As a developer connecting the worker or socket server later, I want the steps written down, so that it takes minutes and posts to that server's own channel.
28. As a developer connecting another server, I want each server throttled on its own, so that a noisy worker cannot use up the main server's posts.
29. As a team member, I want the READMEs to say where server warnings go and how to test the path, so that I need not read this spec.

## Implementation Decisions

### The main server's log format

- A new main-server setting, `LOG_FORMAT`: `text` (the default) or `json`, an enum in the settings schema written like `EXTRA_SNU_COLLECTION`. It goes into `.env.example`, the root README's main-server settings table, and the Production manifest, where `json` is written as a literal value like `PORT` (no ConfigMap, no Secret).
- `json` turns on `ConsoleLogger`'s json option. Each entry is then one line holding `level`, `pid`, `timestamp`, `message`, `context`, and `stack` when the logger was given one. NestJS writes errors to stderr and the rest to stdout; Fluent Bit reads both.
- The logger is chosen before the Nest application is created, from the same schema entry, so the first lines of a start are already JSON, including the error of a start refused for bad settings. An invalid `LOG_FORMAT` refuses the start.
- The levels are log, warn, error and fatal in both formats. Debug and verbose are off; no main-server code uses them today.
- Choosing the logger is one small function beside the settings, with no other main-server dependency, so the socket and worker servers can copy it when they are connected.
- The tests start the app without that function and keep text logs. The 15 test files that read log lines spy on `Logger.prototype` (and on stdout and stderr through the shared capture helper), so neither format breaks them.

### The logging rules

A new "Logging" section in the main server's README holds the rules, written so that the socket and worker servers follow them too:

| Level | Call | When | Posted to Slack |
| --- | --- | --- | --- |
| error | `logger.error()` | A person must look; it will not heal by itself: a whole step failed, recording a failure failed, data disagree | Yes |
| warn | `logger.warn()` | One item failed and the server carries on with a fallback: Kakao, the AI, the library or a push did not answer, a Signal to another server was not sent | Yes |
| info | `logger.log()` | A notable normal event: the server started, a scheduled job began or ended with its counts, a setting turned a feature on or off | No |

- No debug or verbose. Fatal counts as error.
- A User's mistake (400, 401, 403, 404, 429) is not logged.
- NestJS logs an unhandled 500 itself; it is not logged a second time.
- A failure is logged once, where it is finally handled.
- A loop logs no line per item, only one summary ("N of M").
- Each class has `new Logger(ClassName.name)`; server code has no `console.log`.
- A line says what failed, then a colon and the cause, as a full English sentence in GLOSSARY words, with IDs (User ID, Quest ID).
- Never logged, at any level: tokens, keys, passwords, Authorization headers, cookies, webhook URLs; names, emails, student IDs, phone numbers (a person is named by ID); coordinates, timetables, the Assistant's prompts and answers; whole request or response bodies (status codes and error types only).

Existing logs are not rewritten to the rules ([Out of Scope](#out-of-scope)).

### The test API

- `POST /admin/log-test`, for Administrators only through the global Administrator guard, like the other `admin/` controllers.
- The body is `{ "level": "info" | "warn" | "error" }`, checked with a zod body schema as the other admin bodies are. Anything else answers 400.
- It writes exactly one line at that level through its class's logger (info through `log`) and answers 204. The lines are `A test info line from the admin site, by Administrator <id>`, `A test warning from the admin site, by Administrator <id>` and `A test error from the admin site, by Administrator <id>`. The Administrator is named by ID, never by email.
- It changes nothing else and needs no Idempotency-Key: a repeat only writes one more test line.
- The load balancer refuses `/admin/*`, so in Production only the admin site reaches it.
- The main server's README documents it in the Administrators section.

### The Log test page

- A "Log test" section, the last entry of the admin site's menu, with one page.
- Three buttons: info, warn and error. Each calls a server action that sends its level to the main server as the signed-in Administrator, as the Settings page's actions do.
- After a press the page says "Sent. warn and error go to the Slack channel, info stays in the server logs." A refusal shows the main server's message, as the other pages do.

### Fluent Bit's pipeline

The pipeline has a part per server and a shared part:

| Per server (main server now) | Shared by every server |
| --- | --- |
| Input: tail of the server's container log files in `snunow` | Parse the `log` field as JSON, keeping the other fields |
| A `server` field set to the server's name | Keep only records whose `level` is warn, error or fatal |
| Throttle: at most 10 records a minute | Keep only `server`, `level`, `context`, `message` and `stack` |
| Output: Slack, with the server's own webhook | |

- The main server's input reads only its own pods' files (pods and container named `main-server`, namespace `snunow`), with the CRI multiline parser, a 5 MB memory buffer and long lines skipped. Each input's tag names its server, and the per-server parts match that tag.
- A line that is not JSON, such as a crash printed outside NestJS's logger, has no `level` and is dropped.
- The throttle is per server, with rate 10, window 1 and interval 1 minute: at most 10 records a minute pass and the rest are dropped. The agreed draft's rate 10, window 5 averages over five minutes and lets up to 50 through in one minute after a quiet spell.
- `time`, `stream` and `_p` (from the CRI parser) and `pid` and `timestamp` (from NestJS) are dropped, so a post holds only the kept fields.
- A post's text is the record as Fluent Bit prints it (`"server"=>"main-server", "level"=>"warn", …`). The Slack output has no option to format it, and this is accepted. It retries a failed post a few times, then drops it; Fluent Bit ignores Slack's `Retry-After`.
- The pipeline is in Fluent Bit's classic format, because the chart's `config` takes classic sections. Its files sit next to the Terraform. The Helm release and the pipeline test read the same files, so what is tested is what runs.
- Fluent Bit 5.1.5 for both the test and the chart's image tag; its image has an arm64 build, which the ARM64 nodes need.

### Terraform

- One new Terraform file, modelled on the load balancer controller's, makes a `logging` namespace and a `helm_release` of the official `fluent-bit` chart (repository `https://fluent.github.io/helm-charts`), pinned at 0.58.3 with the image tag 5.1.5.
- `logging` has no Pod Security label, so the cluster's default admits the read-only hostPath. The Release workflow's deploy role has no rights there. It has no NetworkPolicy, so Fluent Bit reaches Slack.
- The chart's values:
  - The chart's default `service` section stays. It loads the parsers file that the JSON parser comes from, and runs the HTTP server and health check behind the chart's liveness and readiness probes; without them the pods restart.
  - The default inputs, filters (the Kubernetes filter) and outputs (two Elasticsearch outputs) are replaced by the pipeline.
  - No RBAC and no service account token: without the Kubernetes filter, Fluent Bit never calls the Kubernetes API.
  - One hostPath volume, `/var/log`, read-only. The chart's default also mounts `/var/lib/docker/containers` and `/etc/machine-id`, which containerd does not need.
  - Memory request 32Mi and limit 64Mi, checked against what the pipeline test's run uses.
  - The environment variable `SLACK_WEBHOOK_MAIN_SERVER` comes from the `main-server` key of the Secret `slack-webhooks` in `logging`.
- Terraform does not create the Secret, so its value stays out of the state (infra README: Terraform). A person makes it with `kubectl create secret generic`, reading the value with `read -rs`, as for `database-setup`.
- The first apply goes in this order: `terraform apply -target` the namespace, create the Secret, then a full apply. `helm_release` waits for the pods to be ready, and a pod without its Secret never is. Nobody makes the namespace by hand, because Terraform would then fail to create it.
- Fluent Bit adds a pod to each node: 18 of the two nodes' 22 pod slots.
- `snunow`'s manifests, the NetworkPolicies, `allowed-connections.txt`, the Release script and the deploy role stay unchanged.

### Documentation

- infra README:
  - "Looking into a problem" names the channel and the Log test page.
  - "Logs last as long as their pod" says that warn and error lines are also posted to Slack.
  - A new section on server logs in Slack covers the pipeline, the Secret and its keys, replacing the webhook (replace the Secret, restart the DaemonSet, no Release) and connecting another server.
  - "First setup" gains the first apply's order.
  - "Changing Production" says the webhook is the one secret kept outside Parameter Store.
- The root README's settings table gains `LOG_FORMAT`. The main server's README gains the Logging section and the test API.

## Testing Decisions

A good test here goes through the highest seam that a person or another program uses: an HTTP request to the started main server, a press on the admin page against the fake main server, a log line written to a file the real Fluent Bit reads. It checks what comes out (the status, the log line, the request, the record to be posted), not which functions ran.

The seams:

1. **The main server's HTTP API, started** (integration). `POST /admin/log-test`:
   - as an Administrator, each level answers 204, and exactly one captured line has that level and the Administrator's ID;
   - without a token, with a User's token or with a removed Administrator's token, it is refused and nothing is logged; the route joins the list in the admin changing-refusals test;
   - a level outside the three, or no body, answers 400 and nothing is logged.

   Prior art: the collection-statuses test (`startApp`, `signInAsAdministrator`), the admin refusal tests, and the log capture helper.
2. **Choosing the logger** (unit). With `json`, a warn and an error each write one line that parses as JSON with `level` and `message`; with `text` or nothing set, the output is not JSON; an invalid value is refused. The main server's settings unit test gains `LOG_FORMAT`'s default and its refusal. Prior art: the main server's settings unit test.
3. **The Log test page** (integration, against the fake main server). The page shows the three buttons. A press on warn sends `{"level":"warn"}` to `/admin/log-test` with the Administrator's bearer token and shows the "Sent." line. A refusal shows the main server's message. Prior art: the admin site's collection and settings tests and their fake main server.
4. **Fluent Bit's pipeline** (a bats test that starts the real Fluent Bit image in Docker; an integration test by ADR 0007, though bats files carry no suffix, like the existing ones). It runs the pipeline's inputs and filters unchanged, with a stdout output in place of Slack, and appends CRI-format lines to a file named like a main-server pod's log. It checks that:
   - info is dropped and warn, error and fatal are kept;
   - a line that is not JSON is dropped;
   - a file of another server or namespace is not read;
   - a kept record has only `server`, `level`, `context`, `message` and `stack`;
   - a burst of 30 warnings lets 10 through.

   It runs in CI's Terraform job, since the pipeline lives with the Terraform. Prior art: the bats tests of the deploy scripts and the Release script.
5. **Terraform**: `terraform fmt -check` and `terraform validate` in CI, as today; a person puts `terraform plan`'s output in PR B.

Hand checks:

- Locally, each button of the Log test page prints its level's line in the main server's terminal; PR A's body shows a screenshot.
- Locally, a person runs the pipeline once against the real webhook ([People's steps](#peoples-steps)).

## People's steps

These need a person, and become `ready-for-human` tickets. **The webhook URL is a secret: it never goes into chat, a pull request, an issue, a commit, a document, a configuration file or a test.**

1. **The Slack webhook.** Create one Slack app with Incoming Webhooks and add a webhook for `#team9-main-server-error`. The person who installs it must be a member of that private channel. One app holds a webhook per channel, so the other servers need no new app (the free plan allows 10 apps). Check it with a test post from a terminal, reading the URL with `read -rs`.
2. **The pipeline against the real webhook.** Run the pipeline locally once with the Slack output and the webhook in an environment variable: warn and error are posted, info is not, and a burst is throttled.
3. **Telling the team.** Announce each Production change before making it: the Release, creating the Secret, `terraform apply`. Both pull requests are reviewed and approved like any other, infrastructure included.
4. **PR A.** Merge it and Release the main server; its logs in Production are JSON from then on.
5. **PR B.** The account's owner signs in to AWS (`aws login`) and puts `terraform plan`'s output in the pull request, with no secret in it. After the merge, the owner applies in order: `terraform apply -target` the namespace, create the Secret, then a full `terraform apply`.
6. **The Production check.** `kubectl -n logging get pods` shows two pods Running, and `kubectl -n snunow get pods` shows none Pending. On the Production admin site's Log test page, the warn and error buttons give posts in the channel and the info button does not.

## Out of Scope

- Connecting the socket and worker servers. Their channels exist; the steps are below.
- The app's errors (Crashlytics or similar).
- Keeping or searching logs; the Latency and Traffic signals.
- Rewriting existing logs to the rules, including the worker's repeating error and the "Connected to Redis" lines.
- Lines printed outside NestJS's logger, such as Node's own output when it crashes. The pipeline drops them; `kubectl logs --previous` still shows them.
- Formatting posts beyond what Fluent Bit's Slack output prints.
- Changing `snunow`'s Pod Security label, the NetworkPolicies, the Release workflow or the deploy role.
- The app's native files.

## Further Notes

### Adding the worker or socket server

1. **The log format.** Copy the logger function, `LOG_FORMAT` into the server's settings, `.env.example` and the root README's table, and `json` into its manifest. The worker and socket servers' settings unit tests compare the whole parsed `.env.example` with `toEqual`, so they need the new key.
2. **The pipeline.** Add an input, a `server` field, a throttle and an output for the server, and a case to the pipeline test.
3. **The webhook.** Add a webhook for the server's channel to the same Slack app, and its key to the `slack-webhooks` Secret before the apply: a missing key keeps every Fluent Bit pod from starting.
4. **Terraform.** Add the server's environment variable to the chart's values, then plan and apply.

Before connecting them:

- **The worker** logs `The Collection of shuttle_vehicles failed: …` about 4 times a minute (2026-11-23, 16:29 to 18:00). Posted as is, it would use 4 of the 10 posts every minute. Decide whether it is a warning and whether to fix it first.
- **The socket server** has no `Logger` of its own; its lines are NestJS's, such as Redis's connection line at info.

### Why not in `snunow`

`snunow` enforces the Pod Security baseline, which forbids hostPath volumes. On the same k3s version as the repository's local cluster, a hostPath DaemonSet in a baseline namespace is created with a warning, but every pod is refused. Loosening the label is a security question, not a setting: the deploy role comes with any pushed `snunow/*` tag, no ruleset protects those tags, and a privileged pod reaches its node and, from there, the load balancer controller's IAM role in `kube-system`. A namespace that only Terraform changes keeps that boundary.
