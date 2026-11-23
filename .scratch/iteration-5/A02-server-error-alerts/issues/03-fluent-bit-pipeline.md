# 03: Fluent Bit's pipeline keeps only the main server's warnings and errors, and a test in CI shows it

Parent: [A02 spec](../spec.md)
Status: done
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
| Throttle: at most 10 records a minute (written `Rate 2, Window 5, Interval 12s`, see Comments) | Keep only `server`, `level`, `context`, `message` and `stack` |
| Output: Slack, webhook from `SLACK_WEBHOOK_MAIN_SERVER`, a few retries, then the post is dropped | |

- A line that is not JSON has no `level` and is dropped.
- The parts are split so that connecting another server adds one input, one `server` field, one throttle and one output, and touches nothing shared.

**The test**, in bats, beside the pipeline. It starts the Fluent Bit 5.1.5 image in Docker with the pipeline's inputs and filters unchanged and a stdout output in place of Slack, then appends CRI-format lines to a file named like a main-server pod's log. Its sample lines follow `ConsoleLogger`'s JSON shape (`level`, `pid`, `timestamp`, `message`, `context`, and `stack` on some).

**CI**: the Terraform job also runs shellcheck and the bats test, as the deploy-scripts and release-script jobs do. The job already runs when the Terraform folder changes, and the pipeline lives there.

**Running it against Slack**: the test file, or a short note beside it, says how a person runs the pipeline once with the real Slack output (ticket 06). The webhook goes in as an environment variable read with `read -rs`, never on the command line.

## Acceptance criteria

- [x] Info is dropped; warn, error and fatal are kept. (Bats test.)
- [x] A line that is not JSON is dropped. (Bats test.)
- [x] A file of another server, or of another namespace, is not read. (Bats test.)
- [x] A kept record has only `server`, `level`, `context`, `message` and `stack`. (Bats test.)
- [x] A burst of 30 warnings within a minute lets 10 through. (Bats test.)
- [x] The whole pipeline, Slack output included, passes Fluent Bit's own configuration check (`--dry-run`) with a stand-in webhook. (Bats test.)
- [x] CI's Terraform job runs shellcheck and the test, and the test passes there.
- [x] The memory Fluent Bit used during the test (`docker stats`) is recorded under Comments, for ticket 04's 32Mi request and 64Mi limit.
- [x] Each new file carries the AI-generated box, drawn with `#`.

## Comments

- Done in PR #531 (merged into `5.0/Main` as e1f26483 on 2026-11-23). The pipeline's folder is `infra/production/terraform/fluent-bit-pipeline/`: named `fluent-bit/` at first, it made Helm load that folder as the chart, since Helm tries a local path with the chart's name before the repository (found by ticket 09's first plan, renamed in 14f362b4; the files' content did not change).
- **The throttle** is `Rate 2, Window 5, Interval 12s`, not the table's "rate 10, window 1, interval 1 minute": Fluent Bit 5.1.5 replaces a `Window` of 1 or less with 5, so that setting averages over five minutes and lets a burst of 30 through. The written one drops a record once the last five 12-second intervals hold 10. A burst of 30 gives 10, and another a minute later gives 10 more (bats). Across an interval's edge, up to about 20 can pass in a sliding minute.
- **A burst is one post.** The Slack output posts once per flush, with a line per record, so "10 posts" in the spec's words is 10 records, most likely in one post (ticket 06 showed one post of 10 lines).
- `--dry-run` catches unknown property names in every section, but not an unset variable or a bad URL; the test also requires no `[ warn]` or `[error]` line.
- A file already there when Fluent Bit starts is read from its end, and a new pod's file from its first line, so a restart posts nothing twice (`/var/log` is read-only, so there is no position database).
- fyoon46's 893f640d (from AhnJinYoung's review) runs the bats test's container as Production runs it: `--read-only --cap-drop ALL --security-opt no-new-privileges`.

Memory (`docker stats`, `fluent/fluent-bit:5.1.5` arm64), for ticket 04's 32Mi request and 64Mi limit:

| Run | Memory |
| --- | --- |
| The bats run's burst test | 22.38–22.64 MiB |
| Test pipeline (stdout output), idle | 22.15 MiB |
| Test pipeline, reading 10,000 info lines, 100 warnings and 20 errors with stacks (2.0 MB) at once | 21.82–21.87 MiB |
| Whole pipeline with the Slack output and a stand-in webhook, idle | 17.96 MiB |
| The same, under the same load, retrying and then dropping its chunks | 19.30–20.33 MiB |

The peak, 22.6 MiB, leaves the 64Mi limit about 40 MiB of room, more than the tail's 5 MB buffer.

### Agent usage (2026-11-23)

- Agent time: about 33 minutes, in session B (PR B) up to the orchestrator's go-ahead for ticket 04, its code review included. This is an estimate: the gaps under 5 minutes between transcript entries, summed, so waiting for a person is left out.
- Tokens: input 20,613,201 (cache reads 20,178,743, cache writes 434,232, uncached 226); output 150,091. Of these, two review subagents: input 1,900,041 (cache reads 1,704,208, cache writes 195,789, uncached 44); output 27,742.
