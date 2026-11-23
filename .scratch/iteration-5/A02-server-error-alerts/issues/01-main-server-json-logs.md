# 01: In Production the main server prints one JSON line per log entry

Parent: [A02 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

PR: A. Native files: none. Releases: the main server.

## What happens now

The main server logs through NestJS's default logger: coloured text, several levels, nothing a program can split into fields. Fluent Bit (tickets 03 and 04) keeps a line only when it parses as JSON with a `level`.

## What to build

- A main-server setting, `LOG_FORMAT`: `text` (the default) or `json`, an enum in the settings schema written like `EXTRA_SNU_COLLECTION`. It goes into `.env.example` and the root README's main-server settings table.
- The logger is chosen before the Nest application is created, from that same schema entry, so the first lines of a start are already JSON, including the error of a start refused for bad settings. An invalid value refuses the start.
- `json` turns on `ConsoleLogger`'s json option. The levels are log, warn, error and fatal in both formats; debug and verbose are off.
- Choosing the logger is one small function beside the settings, with no other main-server dependency, so the socket and worker servers can copy it later (spec: Adding the worker or socket server).
- The Production manifest gives the main server `LOG_FORMAT` as the literal value `json`, written like `PORT`.
- A "Logging" section in the main server's README holds the logging rules: the level table and the rules under it, as the spec's "The logging rules" gives them, written so that the socket and worker servers follow them too.

The tests start the app without the new function and keep text logs.

## Acceptance criteria

- [ ] With `json`, a warn and an error each write one line that parses as JSON and holds `level` and `message`. (Unit test.)
- [ ] With `text` or nothing set, the output is not JSON. (Unit test.)
- [ ] An invalid `LOG_FORMAT` is refused, and the setting defaults to `text`. (The main server's settings unit test.)
- [ ] Started locally with `LOG_FORMAT=json`, every line of a start is one JSON line, NestJS's own start-up lines included; a start refused for a missing setting prints its error as a JSON line too. (Hand check; the PR shows both outputs, with no secret in them.)
- [ ] The 15 test files that read log lines pass unchanged. (Run those files, not the whole suite.)
- [ ] The Production target's manifests render with `LOG_FORMAT: json` for the main server (CI's manifests job).
- [ ] `.env.example`, the root README's settings table and the main server's README (Logging) say the above.
- [ ] Lint, format and types of the main server pass.

## Comments
