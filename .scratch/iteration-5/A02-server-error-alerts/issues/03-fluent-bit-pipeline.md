# 03: Fluent Bit's pipeline keeps only the main server's warnings and errors, and a test in CI shows it

Parent: [A02 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

PR: B. Native files: none. Releases: none; nothing runs in Production until ticket 09 applies ticket 04.

**The webhook URL is a secret.** No file, test, commit, pull request or issue holds it; tests and local checks use a stand-in value.

## What happens now

Nothing reads the servers' container logs. The agreed plan's draft configuration would not start (no parsers file for the `json` parser) and its throttle averages over five minutes.

## What to build

**The pipeline**, in Fluent Bit's classic format, in files next to the Production Terraform. Ticket 04's Helm release reads these same files, so what the test runs is what runs in Production.

| Per server (the main server now) | Shared by every server |
| --- | --- |
| Input: tail of the main server's container log files in `snunow` (pods and container named `main-server`), CRI multiline parser, 5 MB memory buffer, long lines skipped, tagged by server | Parse the `log` field as JSON, keeping the other fields |
| A `server` field set to `main-server` | Keep only records whose `level` is warn, error or fatal |
| Throttle: rate 10, window 1, interval 1 minute | Keep only `server`, `level`, `context`, `message` and `stack` |
| Output: Slack, webhook from `SLACK_WEBHOOK_MAIN_SERVER`, a few retries, then the post is dropped | |

- A line that is not JSON has no `level` and is dropped.
- The parts are split so that connecting another server adds one input, one `server` field, one throttle and one output, and touches nothing shared.

**The test**, in bats, beside the pipeline. It starts the Fluent Bit 5.1.5 image in Docker with the pipeline's inputs and filters unchanged and a stdout output in place of Slack, then appends CRI-format lines to a file named like a main-server pod's log. Its sample lines follow `ConsoleLogger`'s JSON shape (`level`, `pid`, `timestamp`, `message`, `context`, and `stack` on some).

**CI**: the Terraform job also runs shellcheck and the bats test, as the deploy-scripts and release-script jobs do. The job already runs when the Terraform folder changes, and the pipeline lives there.

**Running it against Slack**: the test file, or a short note beside it, says how a person runs the pipeline once with the real Slack output (ticket 06). The webhook goes in as an environment variable read with `read -rs`, never on the command line.

## Acceptance criteria

- [ ] Info is dropped; warn, error and fatal are kept. (Bats test.)
- [ ] A line that is not JSON is dropped. (Bats test.)
- [ ] A file of another server, or of another namespace, is not read. (Bats test.)
- [ ] A kept record has only `server`, `level`, `context`, `message` and `stack`. (Bats test.)
- [ ] A burst of 30 warnings within a minute lets 10 through. (Bats test.)
- [ ] The whole pipeline, Slack output included, passes Fluent Bit's own configuration check (`--dry-run`) with a stand-in webhook. (Bats test.)
- [ ] CI's Terraform job runs shellcheck and the test, and the test passes there.
- [ ] The memory Fluent Bit used during the test (`docker stats`) is recorded under Comments, for ticket 04's 32Mi request and 64Mi limit.
- [ ] Each new file carries the AI-generated box, drawn with `#`.

## Comments
